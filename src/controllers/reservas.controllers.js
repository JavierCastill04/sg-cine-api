
import { randomUUID } from 'node:crypto';
import { pool } from '../config.js';

const obtenerId = (valor) =>
    Number.isInteger(Number(valor)) && Number(valor) > 0
        ? Number(valor)
        : null;

const obtenerFila = (asiento) => {
    const letras = asiento.match(/^[A-Z]+/)[0];
    let fila = 0;

    for (const letra of letras) {
        fila = fila * 26 + letra.charCodeAt(0) - 64;
    }

    return fila;
};

const asientoValido = (asiento, filas, columnas) => {
    if (typeof asiento !== 'string') return false;

    const coincidencia = asiento.match(/^([A-Z]+)([1-9]\d*)$/);

    if (!coincidencia) return false;

    const fila = obtenerFila(asiento);
    const columna = Number(coincidencia[2]);

    return fila >= 1 && fila <= filas &&
        columna >= 1 && columna <= columnas;
};

// POST /reservas
export const postReserva = async (req, res) => {
    const usuarioId = obtenerId(req.usuario?.id);
    const funcionId = obtenerId(req.body.funcionId);
    const asientos = req.body.asientos;

    if (
        !usuarioId ||
        !funcionId ||
        !Array.isArray(asientos) ||
        asientos.length === 0 ||
        asientos.some((a) => typeof a !== 'string') ||
        new Set(asientos).size !== asientos.length
    ) {
        return res.status(400).json({
            message: 'funcionId y una lista válida de asientos son obligatorios',
        });
    }

    const conexion = await pool.getConnection();
    let transaccionIniciada = false;

    try {
        await conexion.beginTransaction();
        transaccionIniciada = true;

        const [funciones] = await conexion.query(
            `SELECT f.id, f.sala_id, f.estado,
              p.precio, s.filas, s.columnas
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas s ON s.id = f.sala_id
       WHERE f.id = ?
       FOR UPDATE`,
            [funcionId]
        );

        if (!funciones.length) {
            await conexion.rollback();
            transaccionIniciada = false;
            return res.status(404).json({
                message: 'Función no encontrada',
            });
        }

        const funcion = funciones[0];

        if (funcion.estado !== 'activa') {
            await conexion.rollback();
            transaccionIniciada = false;
            return res.status(409).json({
                message: 'La función no está activa',
            });
        }

        if (
            asientos.some(
                (asiento) =>
                    !asientoValido(asiento, funcion.filas, funcion.columnas)
            )
        ) {
            await conexion.rollback();
            transaccionIniciada = false;
            return res.status(400).json({
                message: 'Uno o más asientos no pertenecen a la sala',
            });
        }

        const total = Number(
            (Number(funcion.precio) * asientos.length).toFixed(2)
        );

        const codigo = `${randomUUID().toUpperCase()}`;

        const [resultado] = await conexion.query(
            `INSERT INTO reservas
         (codigo, usuario_id, funcion_id, total)
       VALUES (?, ?, ?, ?)`,
            [codigo, usuarioId, funcionId, total]
        );

        const reservaId = resultado.insertId;

        for (const asiento of asientos) {
            await conexion.query(
                `INSERT INTO reserva_asientos
           (reserva_id, funcion_id, asiento)
         VALUES (?, ?, ?)`,
                [reservaId, funcionId, asiento]
            );
        }

        await conexion.commit();
        transaccionIniciada = false;

        return res.status(201).json({
            message: 'Reserva creada correctamente',
            reserva: {
                id: reservaId,
                codigo,
                usuarioId,
                funcionId,
                asientos,
                cantidad: asientos.length,
                precioUnitario: Number(funcion.precio),
                total,
                estado: 'activa',
            },
        });
    } catch (error) {
        if (transaccionIniciada) {
            await conexion.rollback();
            transaccionIniciada = false;
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Uno o más asientos ya están ocupados para esta función',
            });
        }

        console.error('Error al crear reserva:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    } finally {
        conexion.release();
    }
};

// GET /reservas/mias
export const getMisReservas = async (req, res) => {
    try {
        const usuarioId = obtenerId(req.usuario?.id);

        if (!usuarioId) {
            return res.status(401).json({
                message: 'Usuario no autenticado',
            });
        }

        const [filas] = await pool.query(
            `SELECT r.id, r.codigo, r.funcion_id AS funcionId,
              r.total, r.estado, r.creada_en AS creadaEn,
              f.fecha_hora AS fechaHora,
              p.nombre AS pelicula, p.duracion,
              s.nombre AS sala, c.nombre AS cine,
              ra.asiento
       FROM reservas r
       JOIN funciones f ON f.id = r.funcion_id
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas s ON s.id = f.sala_id
       JOIN cines c ON c.id = s.cine_id
       LEFT JOIN reserva_asientos ra
         ON ra.reserva_id = r.id
        AND ra.funcion_id = r.funcion_id
       WHERE r.usuario_id = ?
       ORDER BY r.creada_en DESC, r.id DESC`,
            [usuarioId]
        );

        const reservas = new Map();

        for (const fila of filas) {
            if (!reservas.has(fila.id)) {
                reservas.set(fila.id, {
                    id: fila.id,
                    codigo: fila.codigo,
                    funcionId: fila.funcionId,
                    pelicula: fila.pelicula,
                    duracion: fila.duracion,
                    cine: fila.cine,
                    sala: fila.sala,
                    fechaHora: fila.fechaHora,
                    creadaEn: fila.creadaEn,
                    total: fila.total,
                    estado: fila.estado,
                    asientos: [],
                });
            }

            if (fila.asiento) {
                reservas.get(fila.id).asientos.push(fila.asiento);
            }
        }

        return res.status(200).json([...reservas.values()]);
    } catch (error) {
        console.error('Error al consultar reservas:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// PATCH /reservas/:codigo/validar
export const validarReserva = async (req, res) => {
    const conexion = await pool.getConnection();
    let transaccionIniciada = false;

    try {
        const codigo = req.params.codigo;

        if (!codigo || codigo.length > 40) {
            return res.status(400).json({
                message: 'Código de reserva no válido',
            });
        }

        await conexion.beginTransaction();
        transaccionIniciada = true;

        const [reservas] = await conexion.query(
            `SELECT r.id, r.codigo, r.estado,
              r.funcion_id AS funcionId,
              f.estado AS estadoFuncion
       FROM reservas r
       JOIN funciones f ON f.id = r.funcion_id
       WHERE r.codigo = ?
       FOR UPDATE`,
            [codigo]
        );

        if (!reservas.length) {
            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(404).json({
                message: 'Reserva no encontrada',
            });
        }

        const reserva = reservas[0];

        if (reserva.estado !== 'activa') {
            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(409).json({
                message: 'La reserva ya fue utilizada o está cancelada',
            });
        }

        if (reserva.estadoFuncion !== 'activa') {
            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(409).json({
                message: 'La función está cancelada',
            });
        }

        await conexion.query(
            `UPDATE reservas SET estado = 'utilizada' WHERE id = ?`,
            [reserva.id]
        );

        await conexion.commit();
        transaccionIniciada = false;

        return res.status(200).json({
            message: 'Boleto validado correctamente',
            codigo: reserva.codigo,
            estado: 'utilizada',
        });
    } catch (error) {
        if (transaccionIniciada) {
            await conexion.rollback();
            transaccionIniciada = false;
        }

        console.error('Error al validar reserva:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    } finally {
        conexion.release();
    }
};