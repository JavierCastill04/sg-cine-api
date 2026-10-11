
import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Token de autenticación requerido',
            });
        }

        const token = authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Token de autenticación requerido',
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('Falta configurar JWT_SECRET');

            return res.status(500).json({
                message: 'Error interno del servidor',
            });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (
            !payload ||
            typeof payload !== 'object' ||
            !Number.isSafeInteger(payload.id) ||
            !['cliente', 'personal'].includes(payload.rol)
        ) {
            return res.status(401).json({
                message: 'Token inválido',
            });
        }

        req.usuario = {
            id: payload.id,
            rol: payload.rol,
        };

        next();
    } catch (error) {
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                message: 'Token inválido o expirado',
            });
        }

        console.error('Error al verificar token:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

export const soloRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                message: 'Autenticación requerida',
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                message: 'No tienes permisos para realizar esta operación',
            });
        }

        next();
    };
};

export const soloPersonal = soloRol('personal');

export const soloCliente = soloRol('cliente');