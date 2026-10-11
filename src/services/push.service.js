
import { pool } from '../config.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TAMANO_LOTE = 100;

export async function enviarPush(tokens, title, body, data = {}) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return {
            destinatarios: 0,
            aceptadasPorExpo: 0,
            fallidas: 0,
            tokensInvalidos: 0,
            tokensEliminados: 0,
            tickets: [],
        };
    }

    const mensajes = tokens.map((to) => ({
        to,
        title,
        body,
        data,
        sound: 'default',
    }));

    const tickets = [];
    const tokensInvalidos = new Set();
    const ticketsPendientes = [];

    for (let i = 0; i < mensajes.length; i += TAMANO_LOTE) {
        const lote = mensajes.slice(i, i + TAMANO_LOTE);

        const respuesta = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(lote),
        });

        if (!respuesta.ok) {
            throw new Error(
                `Expo Push Service respondió con HTTP ${respuesta.status}.`
            );
        }

        const resultado = await respuesta.json();

        if (!Array.isArray(resultado.data)) {
            throw new Error(
                'Expo Push Service devolvió una respuesta inesperada.'
            );
        }

        resultado.data.forEach((ticket, indice) => {
            const token = lote[indice]?.to;

            if (!token) {
                return;
            }

            if (
                ticket?.status === 'error' &&
                ticket?.details?.error === 'DeviceNotRegistered'
            ) {
                tokensInvalidos.add(token);
            }

            if (ticket?.status === 'ok' && ticket.id) {
                ticketsPendientes.push([
                    ticket.id,
                    token,
                ]);
            }
        });

        tickets.push(...resultado.data);
    }

    const aceptadasPorExpo = tickets.filter(
        (ticket) => ticket?.status === 'ok'
    ).length;

    if (ticketsPendientes.length > 0) {
        try {
            await pool.query(
                `INSERT IGNORE INTO notificacion_tickets
                    (ticket_id, expo_push_token)
                 VALUES ?`,
                [ticketsPendientes]
            );
        } catch (error) {
            console.error(
                'No se pudieron guardar los tickets de Expo:',
                error
            );
        }
    }

    let tokensEliminados = 0;

    if (tokensInvalidos.size > 0) {
        try {
            const [resultado] = await pool.query(
                `DELETE FROM dispositivos
                 WHERE expo_push_token IN (?)`,
                [[...tokensInvalidos]]
            );

            tokensEliminados = resultado.affectedRows;
        } catch (error) {
            console.error(
                'No se pudieron eliminar los tokens inválidos:',
                error
            );
        }
    }

    return {
        destinatarios: tokens.length,
        aceptadasPorExpo,
        fallidas: tickets.length - aceptadasPorExpo,
        tokensInvalidos: tokensInvalidos.size,
        tokensEliminados,
        tickets,
    };
}