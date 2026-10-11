import { pool } from '../config.js';

const obtenerId = (valor) =>
    Number.isInteger(Number(valor)) && Number(valor) > 0
        ? Number(valor)
        : null;

const normalizarFecha = (fecha) =>
    typeof fecha === 'string' ? fecha.replace('T', ' ').slice(0, 19) : '';

const validarFecha = (fecha) =>
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fecha) &&
    !Number.isNaN(new Date(fecha.replace(' ', 'T') + 'Z').getTime());

const obtenerFuncion = async (id) => {
    const [funciones] = await pool.query(
        `SELECT f.id, f.pelicula_id AS peliculaId,
            f.sala_id AS salaId, f.fecha_hora AS fechaHora,
            f.estado, p.nombre AS pelicula,
            p.duracion, p.clasificacion,
            s.nombre AS sala, c.id AS cineId,
            c.nombre AS cine, c.direccion
     FROM funciones f
     JOIN peliculas p ON p.id = f.pelicula_id
     JOIN salas s ON s.id = f.sala_id
     JOIN cines c ON c.id = s.cine_id
     WHERE f.id = ?`,
        [id]
    );

    return funciones[0];
};

const validarReferencias = async (peliculaId, salaId) => {
    const [peliculas] = await pool.query(
        `SELECT id FROM peliculas
     WHERE id = ? AND estado = 'Disponible'`,
        [peliculaId]
    );

    if (!peliculas.length) {
        return 'La película no existe o no está disponible';
    }

    const [salas] = await pool.query(
        'SELECT id FROM salas WHERE id = ?',
        [salaId]
    );

    if (!salas.length) {
        return 'La sala no existe';
    }

    return null;
};

// GET /funciones?peliculaId=1&cineId=2
export const getFunciones = async (req, res) => {
    try {
        const condiciones = [];
        const valores = [];

        if (req.query.peliculaId !== undefined) {
            const peliculaId = obtenerId(req.query.peliculaId);

            if (!peliculaId) {
                return res.status(400).json({
                    message: 'peliculaId no es válido',
                });
            }

            condiciones.push('f.pelicula_id = ?');
            valores.push(peliculaId);
        }

        if (req.query.cineId !== undefined) {
            const cineId = obtenerId(req.query.cineId);

            if (!cineId) {
                return res.status(400).json({
                    message: 'cineId no es válido',
                });
            }

            condiciones.push('c.id = ?');
            valores.push(cineId);
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [funciones] = await pool.query(
            `SELECT f.id, f.pelicula_id AS peliculaId,
              f.sala_id AS salaId, f.fecha_hora AS fechaHora,
              f.estado, p.nombre AS pelicula,
              p.duracion, p.clasificacion,
              s.nombre AS sala, c.id AS cineId,
              c.nombre AS cine, c.direccion
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas s ON s.id = f.sala_id
       JOIN cines c ON c.id = s.cine_id
       ${where}
       ORDER BY f.fecha_hora ASC`,
            valores
        );

        return res.status(200).json(funciones);
    } catch (error) {
        console.error('Error al consultar funciones:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// GET /funciones/:id
export const getFuncion = async (req, res) => {
    try {
        const id = obtenerId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        const funcion = await obtenerFuncion(id);

        if (!funcion) {
            return res.status(404).json({
                message: 'Función no encontrada',
            });
        }

        return res.status(200).json(funcion);
    } catch (error) {
        console.error('Error al consultar función:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// POST /funciones
export const postFuncion = async (req, res) => {
    try {
        const peliculaId = obtenerId(req.body.peliculaId);
        const salaId = obtenerId(req.body.salaId);
        const fechaHora = normalizarFecha(req.body.fechaHora);

        if (!peliculaId || !salaId || !validarFecha(fechaHora)) {
            return res.status(400).json({
                message: 'peliculaId, salaId o fechaHora no son válidos',
            });
        }

        const errorReferencia = await validarReferencias(
            peliculaId,
            salaId
        );

        if (errorReferencia) {
            return res.status(400).json({ message: errorReferencia });
        }

        const [resultado] = await pool.query(
            `INSERT INTO funciones (pelicula_id, sala_id, fecha_hora)
       VALUES (?, ?, ?)`,
            [peliculaId, salaId, fechaHora]
        );

        const funcion = await obtenerFuncion(resultado.insertId);

        return res.status(201).json({
            message: 'Función creada correctamente',
            funcion,
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Ya existe una función en esa sala a esa hora',
            });
        }

        console.error('Error al crear función:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// PUT /funciones/:id
export const putFuncion = async (req, res) => {
    try {
        const id = obtenerId(req.params.id);
        const peliculaId = obtenerId(req.body.peliculaId);
        const salaId = obtenerId(req.body.salaId);
        const fechaHora = normalizarFecha(req.body.fechaHora);

        if (!id || !peliculaId || !salaId || !validarFecha(fechaHora)) {
            return res.status(400).json({
                message: 'ID, peliculaId, salaId o fechaHora no son válidos',
            });
        }

        const actual = await obtenerFuncion(id);

        if (!actual) {
            return res.status(404).json({
                message: 'Función no encontrada',
            });
        }

        if (actual.estado !== 'activa') {
            return res.status(409).json({
                message: 'No se puede modificar una función cancelada',
            });
        }

        const errorReferencia = await validarReferencias(
            peliculaId,
            salaId
        );

        if (errorReferencia) {
            return res.status(400).json({ message: errorReferencia });
        }

        await pool.query(
            `UPDATE funciones
       SET pelicula_id = ?, sala_id = ?, fecha_hora = ?
       WHERE id = ?`,
            [peliculaId, salaId, fechaHora, id]
        );

        const funcion = await obtenerFuncion(id);

        return res.status(200).json({
            message: 'Función actualizada correctamente',
            funcion,
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Ya existe una función en esa sala a esa hora',
            });
        }

        console.error('Error al actualizar función:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// PATCH /funciones/:id/cancelar
export const cancelarFuncion = async (req, res) => {
    try {
        const id = obtenerId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        const funcion = await obtenerFuncion(id);

        if (!funcion) {
            return res.status(404).json({
                message: 'Función no encontrada',
            });
        }

        if (funcion.estado === 'cancelada') {
            return res.status(409).json({
                message: 'La función ya está cancelada',
            });
        }

        await pool.query(
            `UPDATE funciones SET estado = 'cancelada' WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            message: 'Función cancelada correctamente',
            id,
            estado: 'cancelada',
        });
    } catch (error) {
        console.error('Error al cancelar función:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// GET /funciones/:id/asientos
export const getAsientosFuncion = async (req, res) => {
    try {
        const id = obtenerId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: 'ID no válido' });
        }

        const funcion = await obtenerFuncion(id);

        if (!funcion) {
            return res.status(404).json({
                message: 'Función no encontrada',
            });
        }

        const [salas] = await pool.query(
            'SELECT filas, columnas FROM salas WHERE id = ?',
            [funcion.salaId]
        );

        const { filas, columnas } = salas[0];
        const [ocupados] = await pool.query(
            `SELECT ra.asiento
       FROM reserva_asientos ra
       JOIN reservas r ON r.id = ra.reserva_id
       WHERE ra.funcion_id = ? AND r.estado = 'activa'`,
            [id]
        );

        const asientosOcupados = new Set(
            ocupados.map((fila) => fila.asiento)
        );

        const asientos = [];

        for (let i = 0; i < filas; i++) {
            let numero = i + 1;
            let letra = '';

            while (numero > 0) {
                numero--;
                letra = String.fromCharCode(65 + (numero % 26)) + letra;
                numero = Math.floor(numero / 26);
            }

            for (let columna = 1; columna <= columnas; columna++) {
                const asiento = `${letra}${columna}`;

                asientos.push({
                    asiento,
                    estado: asientosOcupados.has(asiento)
                        ? 'ocupado'
                        : 'libre',
                });
            }
        }

        return res.status(200).json({
            funcionId: id,
            estado: funcion.estado,
            sala: funcion.sala,
            filas,
            columnas,
            asientos,
        });
    } catch (error) {
        console.error('Error al consultar asientos:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};