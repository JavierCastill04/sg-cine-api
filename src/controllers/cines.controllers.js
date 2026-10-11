import { pool } from '../config.js';

export const getCines = async (req, res) => {
    try {
        const [cines] = await pool.query(
            `SELECT id, nombre, direccion, latitud, longitud
       FROM cines
       ORDER BY nombre ASC`
        );

        return res.status(200).json(cines);
    } catch (error) {
        console.error('Error al obtener los cines:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};