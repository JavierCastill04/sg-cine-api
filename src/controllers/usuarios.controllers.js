
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config.js';

const validarRegistro = ({ nombre, correo, clave }) => {
    const errores = {};

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.nombre = 'El nombre es obligatorio';
    } else if (nombre.trim().length > 120) {
        errores.nombre = 'El nombre no puede superar 120 caracteres';
    }

    if (typeof correo !== 'string' || !correo.trim()) {
        errores.correo = 'El correo es obligatorio';
    } else if (
        correo.length > 190 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
    ) {
        errores.correo = 'El formato del correo no es válido';
    }

    if (typeof clave !== 'string' || !clave) {
        errores.clave = 'La contraseña es obligatoria';
    } else if (clave.length < 8) {
        errores.clave = 'La contraseña debe tener al menos 8 caracteres';
    }

    return errores;
};

export const postRegistro = async (req, res) => {
    try {
        const { nombre, correo, clave } = req.body;

        const errores = validarRegistro({ nombre, correo, clave });

        if (Object.keys(errores).length > 0) {
            return res.status(400).json({
                message: 'Hay errores en los campos',
                errores,
            });
        }

        const nombreLimpio = nombre.trim();
        const correoLimpio = correo.trim().toLowerCase();

        const [existe] = await pool.query(
            'SELECT id FROM usuarios WHERE correo = ?',
            [correoLimpio]
        );

        if (existe.length > 0) {
            return res.status(409).json({
                message: 'El correo ya está registrado',
            });
        }

        const claveHasheada = await bcrypt.hash(clave, 10);

        const [resultado] = await pool.query(
            `INSERT INTO usuarios (nombre, correo, clave, rol)
       VALUES (?, ?, ?, 'cliente')`,
            [nombreLimpio, correoLimpio, claveHasheada]
        );

        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            usuario: {
                id: resultado.insertId,
                nombre: nombreLimpio,
                correo: correoLimpio,
                rol: 'cliente',
            },
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'El correo ya está registrado',
            });
        }

        console.error('Error al registrar usuario:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};

export const postLogin = async (req, res) => {
    try {
        const { correo, clave } = req.body;

        if (
            typeof correo !== 'string' ||
            !correo.trim() ||
            typeof clave !== 'string' ||
            !clave
        ) {
            return res.status(400).json({
                message: 'El correo y la contraseña son obligatorios',
            });
        }

        const correoLimpio = correo.trim().toLowerCase();

        const [usuarios] = await pool.query(
            `SELECT id, nombre, correo, clave, rol
       FROM usuarios
       WHERE correo = ?`,
            [correoLimpio]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                message: 'Credenciales inválidas',
            });
        }

        const usuario = usuarios[0];

        const coincide = await bcrypt.compare(clave, usuario.clave);

        if (!coincide) {
            return res.status(401).json({
                message: 'Credenciales inválidas',
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('Falta configurar JWT_SECRET');

            return res.status(500).json({
                message: 'Error interno del servidor',
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d',
            }
        );

        return res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
            },
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};