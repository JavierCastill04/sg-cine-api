import { pool } from '../config.js';

const EXPO_RECEIPTS_URL =  'https://exp.host/--/api/v2/push/getReceipts';

export async function consultarRecibos() {
    await pool.query(
        `UPDATE notificacion_tickets
         SET estado = 'expirado',
             procesado_en = NOW()
         WHERE estado = 'pendiente'
           AND creado_en < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    const [pendientes] = await pool.query(
        `SELECT ticket_id AS ticketId,
                expo_push_token AS token
         FROM notificacion_tickets
         WHERE estado = 'pendiente'
           AND creado_en <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
         ORDER BY creado_en ASC
         LIMIT 1000`
    );

    if (pendientes.length === 0) {
        return {
            consultados: 0,
            entregados: 0,
            fallidos: 0,
            tokensEliminados: 0,
        };
    }

    const ids = pendientes.map((ticket) => ticket.ticketId);

    const respuesta = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
    });

    if (!respuesta.ok) {
        throw new Error(
            `Expo Receipts respondió con HTTP ${respuesta.status}.`
        );
    }

    const resultado = await respuesta.json();

    if (
        !resultado.data ||
        typeof resultado.data !== 'object' ||
        Array.isArray(resultado.data)
    ) {
        throw new Error(
            'Expo devolvió una respuesta de recibos inesperada.'
        );
    }

    const ticketsPorId = new Map(
        pendientes.map((ticket) => [
            ticket.ticketId,
            ticket.token,
        ])
    );

    let entregados = 0;
    let fallidos = 0;
    const tokensInvalidos = new Set();

    for (const [ticketId, recibo] of Object.entries(resultado.data)) {
        if (!ticketsPorId.has(ticketId)) {
            continue;
        }

        const token = ticketsPorId.get(ticketId);

        if (recibo?.status === 'ok') {
            await pool.query(
                `UPDATE notificacion_tickets
                 SET estado = 'entregado',
                     procesado_en = NOW(),
                     error = NULL
                 WHERE ticket_id = ?
                   AND estado = 'pendiente'`,
                [ticketId]
            );

            entregados++;
        } else if (recibo?.status === 'error') {
            const codigoError =
                recibo.details?.error || recibo.message || 'Error desconocido';

            await pool.query(
                `UPDATE notificacion_tickets
                 SET estado = 'fallido',
                     procesado_en = NOW(),
                     error = ?
                 WHERE ticket_id = ?
                   AND estado = 'pendiente'`,
                [String(codigoError).slice(0, 100), ticketId]
            );

            fallidos++;

            if (codigoError === 'DeviceNotRegistered') {
                tokensInvalidos.add(token);
            }

            console.error(
                `Falló la notificación con ticket ${ticketId}:`,
                codigoError
            );
        }
    }

    let tokensEliminados = 0;

    if (tokensInvalidos.size > 0) {
        const [eliminacion] = await pool.query(
            `DELETE FROM dispositivos
             WHERE expo_push_token IN (?)`,
            [[...tokensInvalidos]]
        );

        tokensEliminados = eliminacion.affectedRows;
    }

    return {
        consultados: Object.keys(resultado.data).length,
        entregados,
        fallidos,
        tokensEliminados,
    };
}