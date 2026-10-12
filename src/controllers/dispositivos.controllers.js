
import { pool } from '../config.js';

// POST /dispositivos
export const registrarDispositivo = async (req, res) => {
    try {
        const usuarioId = Number(req.usuario?.id);
        const expoPushToken =
            req.body.exponentPushToken ?? req.body.expoPushToken;

        console.log('Body recibido:', req.body);
        console.log('Usuario autenticado:', req.usuario?.id);
        console.log('Tipo del token:', typeof expoPushToken);
        console.log('Longitud del token:', expoPushToken?.length);
        
        if (
            !Number.isInteger(usuarioId) ||
            usuarioId <= 0 ||
            typeof expoPushToken !== 'string' ||
            !expoPushToken.trim() ||
            expoPushToken.trim().length > 255
        ) {
            return res.status(400).json({
                message: 'El token de Expo Push no es válido',
            });
        }

        await pool.query(
            `INSERT INTO dispositivos (usuario_id, expo_push_token)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE usuario_id = ?`,
            [usuarioId, expoPushToken.trim(), usuarioId]
        );

        return res.status(200).json({
            message: 'Dispositivo registrado correctamente',
        });
    } catch (error) {
        console.error('Error al registrar dispositivo:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

// DELETE /dispositivos/:token
export const eliminarDispositivo = async (req, res) => {
    try {
        const usuarioId = Number(req.usuario?.id);
        const expoPushToken = req.params.exponentPushToken ?? req.params.token;

        if (
            !Number.isInteger(usuarioId) ||
            usuarioId <= 0 ||
            typeof expoPushToken !== 'string' ||
            !expoPushToken.trim() ||
            expoPushToken.trim().length > 255
        ) {
            return res.status(400).json({
                message: 'El token no es válido',
            });
        }

        const [resultado] = await pool.query(
            `DELETE FROM dispositivos
            WHERE usuario_id = ? AND expo_push_token = ?`,
            [usuarioId, expoPushToken.trim()]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                message: 'No se encontró el dispositivo asociado a tu usuario',
            });
        }

        return res.status(200).json({
            message: 'Dispositivo eliminado correctamente',
        });
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};