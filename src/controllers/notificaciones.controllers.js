
import { pool } from '../config.js';
import { enviarPush } from '../services/push.service.js';

export const enviarAviso = async (req, res) => {
    try {
        const { titulo, mensaje, data } = req.body;

        if (
            typeof titulo !== 'string' ||
            !titulo.trim() ||
            typeof mensaje !== 'string' ||
            !mensaje.trim()
        ) {
            return res.status(400).json({
                mensaje: 'El título y el mensaje son obligatorios.',
            });
        }

        if (
            data !== undefined &&
            (
                data === null ||
                typeof data !== 'object' ||
                Array.isArray(data)
            )
        ) {
            return res.status(400).json({
                mensaje: 'El campo data debe ser un objeto JSON.',
            });
        }

        const [dispositivos] = await pool.query(`
      SELECT d.expo_push_token
      FROM dispositivos d
      INNER JOIN usuarios u ON u.id = d.usuario_id
      WHERE u.rol = 'cliente'
    `);

        const tokens = dispositivos.map(
            (dispositivo) => dispositivo.expo_push_token
        );

        if (tokens.length === 0) {
            return res.status(200).json({
                mensaje: 'No hay clientes con notificaciones registradas.',
                destinatarios: 0,
                aceptadasPorExpo: 0,
                fallidas: 0,
            });
        }

        const resultado = await enviarPush(
            tokens,
            titulo.trim(),
            mensaje.trim(),
            data ?? {}
        );

        return res.status(200).json({
            mensaje: 'Proceso de envío finalizado.',
            destinatarios: resultado.destinatarios,
            aceptadasPorExpo: resultado.aceptadasPorExpo,
            fallidas: resultado.fallidas,
        });
    } catch (error) {
        console.error('Error al enviar notificaciones:', error);

        return res.status(500).json({
            mensaje: 'Error al procesar las notificaciones.',
        });
    }
};