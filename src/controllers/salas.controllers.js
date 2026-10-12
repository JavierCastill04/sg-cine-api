import { pool } from '../config.js';

const validarSala = ({ cine_id, nombre, filas, columnas }) => {
    const errores = {};

    if (!Number.isSafeInteger(Number(cine_id)) || Number(cine_id) <= 0) {
        errores.cine_id = 'El cine es obligatorio y debe ser válido';
    }

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.nombre = 'El nombre de la sala es obligatorio';
    } else if (nombre.trim().length > 80) {
        errores.nombre = 'El nombre no puede superar 80 caracteres';
    }

    if (!Number.isInteger(Number(filas)) || Number(filas) <= 0 || Number(filas) > 65535) {
        errores.filas = 'Las filas deben ser un entero entre 1 y 65535';
    }

    if (!Number.isInteger(Number(columnas)) || Number(columnas) <= 0 || Number(columnas) > 65535) {
        errores.columnas = 'Las columnas deben ser un entero entre 1 y 65535';
    }

    return errores;
};

// GET /salas?cine_id=1
export const getSalas = async (req, res) => {
    try {
        const { cine_id } = req.query;

        let sql = `
        SELECT id, cine_id, nombre, filas, columnas
        FROM salas
    `;
        const params = [];

        if (cine_id !== undefined) {
            if (!/^[1-9]\d*$/.test(String(cine_id)) ||
                !Number.isSafeInteger(Number(cine_id))) {
                return res.status(400).json({
                    message: 'El cine_id debe ser un entero positivo'
                });
            }

            sql += ' WHERE cine_id = ?';
            params.push(Number(cine_id));
        }

        sql += ' ORDER BY id';

        const [salas] = await pool.query(sql, params);

        return res.status(200).json(salas);
    } catch (error) {
        console.error('Error al obtener salas:', error);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }

};

// GET /salas/:id
export const getSala = async (req, res) => {
    try {
        const { id } = req.params;


        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
            return res.status(400).json({
                message: 'El ID de la sala no es válido'
            });
        }

        const [salas] = await pool.execute(
            `SELECT id, cine_id, nombre, filas, columnas
         FROM salas
         WHERE id = ?`,
            [Number(id)]
        );

        if (salas.length === 0) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        return res.status(200).json(salas[0]);
    } catch (error) {
        console.error('Error al obtener sala:', error);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }


};

// POST /salas
export const postSala = async (req, res) => {
    try {
        const errores = validarSala(req.body);

        if (Object.keys(errores).length > 0) {
            return res.status(400).json({
                message: 'Datos de sala inválidos',
                errores
            });
        }

        const cineId = Number(req.body.cine_id);
        const nombre = req.body.nombre.trim();
        const filas = Number(req.body.filas);
        const columnas = Number(req.body.columnas);

        const [cines] = await pool.execute(
            'SELECT id FROM cines WHERE id = ?',
            [cineId]
        );

        if (cines.length === 0) {
            return res.status(404).json({
                message: 'El cine indicado no existe'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO salas (cine_id, nombre, filas, columnas)
         VALUES (?, ?, ?, ?)`,
            [cineId, nombre, filas, columnas]
        );

        return res.status(201).json({
            message: 'Sala creada correctamente',
            sala: {
                id: resultado.insertId,
                cine_id: cineId,
                nombre,
                filas,
                columnas
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Ya existe una sala con ese nombre en el cine indicado'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({
                message: 'El cine indicado no existe'
            });
        }

        console.error('Error al crear sala:', error);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }


};

// PUT /salas/:id
export const putSala = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
            return res.status(400).json({
                message: 'El ID de la sala no es válido'
            });
        }

        const errores = validarSala(req.body);

        if (Object.keys(errores).length > 0) {
            return res.status(400).json({
                message: 'Datos de sala inválidos',
                errores
            });
        }

        const salaId = Number(id);
        const cineId = Number(req.body.cine_id);
        const nombre = req.body.nombre.trim();
        const filas = Number(req.body.filas);
        const columnas = Number(req.body.columnas);

        const [salas] = await pool.execute(
            'SELECT id FROM salas WHERE id = ?',
            [salaId]
        );

        if (salas.length === 0) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        const [funciones] = await pool.execute(
            'SELECT id FROM funciones WHERE sala_id = ? LIMIT 1',
            [salaId]
        );

        if (funciones.length > 0) {
            return res.status(409).json({
                message: 'No se puede editar una sala que tiene funciones asociadas'
            });
        }

        const [cines] = await pool.execute(
            'SELECT id FROM cines WHERE id = ?',
            [cineId]
        );

        if (cines.length === 0) {
            return res.status(404).json({
                message: 'El cine indicado no existe'
            });
        }

        await pool.execute(
            `UPDATE salas
         SET cine_id = ?, nombre = ?, filas = ?, columnas = ?
         WHERE id = ?`,
            [cineId, nombre, filas, columnas, salaId]
        );

        return res.status(200).json({
            message: 'Sala actualizada correctamente',
            sala: {
                id: salaId,
                cine_id: cineId,
                nombre,
                filas,
                columnas
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Ya existe una sala con ese nombre en el cine indicado'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({
                message: 'El cine indicado no existe'
            });
        }

        console.error('Error al actualizar sala:', error);

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }

};

// DELETE /salas/:id
export const deleteSala = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
            return res.status(400).json({
                message: 'El ID de la sala no es válido'
            });
        }

        const [resultado] = await pool.execute(
            'DELETE FROM salas WHERE id = ?',
            [Number(id)]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        return res.status(200).json({
            message: 'Sala eliminada correctamente'
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                message: 'No se puede eliminar la sala porque tiene funciones asociadas'
            });
        }

        console.error('Error al eliminar sala:', error);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};
