import { pool } from '../config.js';

export const getPeliculas = async (req, res) => {
    try {
        const { q, genero, clasificacion, estado } = req.query;
        let sql = `SELECT id, codigo, nombre, genero, duracion, clasificacion, precio, estado
               FROM peliculas WHERE 1=1`;
        const valores = [];

        if (q) { sql += ' AND nombre LIKE ?'; valores.push(`%${q}%`); }
        if (genero) { sql += ' AND genero = ?'; valores.push(genero); }
        if (clasificacion) { sql += ' AND clasificacion = ?'; valores.push(clasificacion); }
        if (estado) {
            if (!['Disponible', 'No disponible'].includes(estado))
                return res.status(400).json({ message: 'Estado no válido' });
            sql += ' AND estado = ?';
            valores.push(estado);
        }

        sql += ' ORDER BY nombre ASC';
        const [peliculas] = await pool.query(sql, valores);
        return res.status(200).json(peliculas);
    } catch (error) {
        console.error('Error al obtener películas:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const getPelicula = async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[1-9]\d*$/.test(id))
            return res.status(400).json({ message: 'ID de película no válido' });

        const [peliculas] = await pool.query(
            `SELECT id, codigo, nombre, genero, duracion, clasificacion, precio, estado
       FROM peliculas WHERE id = ?`,
            [id]
        );

        if (!peliculas.length)
            return res.status(404).json({ message: 'Película no encontrada' });

        return res.status(200).json(peliculas[0]);
    } catch (error) {
        console.error('Error al obtener película:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const postPelicula = async (req, res) => {
    try {
        const { codigo, nombre, genero, duracion, clasificacion, precio, estado } = req.body;
        const errores = {};
        const precioNumero = Number(precio);
        const duracionNumero = Number(duracion);

        if (typeof codigo !== 'string' || !codigo.trim())
            errores.codigo = 'El código es obligatorio';
        else if (codigo.trim().length > 30)
            errores.codigo = 'Máximo 30 caracteres';

        if (typeof nombre !== 'string' || !nombre.trim())
            errores.nombre = 'El nombre es obligatorio';
        else if (nombre.trim().length > 180)
            errores.nombre = 'Máximo 180 caracteres';

        if (typeof genero !== 'string' || !genero.trim() || genero.trim().length > 80)
            errores.genero = 'El género es obligatorio y admite hasta 80 caracteres';

        if (duracion === undefined || duracion === '' ||
            !Number.isInteger(duracionNumero) || duracionNumero <= 0 || duracionNumero > 65535)
            errores.duracion = 'La duración debe ser un entero positivo';

        if (typeof clasificacion !== 'string' || !clasificacion.trim() || clasificacion.trim().length > 20)
            errores.clasificacion = 'La clasificación es obligatoria y admite hasta 20 caracteres';

        if (precio === undefined || precio === null || precio === '' ||
            !Number.isFinite(precioNumero) || precioNumero < 0 ||
            !/^\d{1,8}(\.\d{1,2})?$/.test(String(precio)))
            errores.precio = 'El precio debe ser no negativo y tener hasta dos decimales';

        if (estado !== undefined && !['Disponible', 'No disponible'].includes(estado))
            errores.estado = 'Estado no válido';

        if (Object.keys(errores).length)
            return res.status(400).json({ message: 'Hay errores en los campos', errores });

        const datos = [
            codigo.trim(), nombre.trim(), genero.trim(), duracionNumero,
            clasificacion.trim(), precioNumero, estado ?? 'Disponible'
        ];

        const [existentes] = await pool.query(
            'SELECT id FROM peliculas WHERE codigo = ?', [datos[0]]
        );
        if (existentes.length)
            return res.status(409).json({ message: 'Ya existe una película con ese código' });

        const [resultado] = await pool.query(
            `INSERT INTO peliculas (codigo, nombre, genero, duracion, clasificacion, precio, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            datos
        );

        return res.status(201).json({
            message: 'Película creada correctamente',
            pelicula: {
                id: resultado.insertId, codigo: datos[0], nombre: datos[1],
                genero: datos[2], duracion: datos[3], clasificacion: datos[4],
                precio: precioNumero.toFixed(2), estado: datos[6]
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ message: 'Ya existe una película con ese código' });
        console.error('Error al crear película:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const putPelicula = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, nombre, genero, duracion, clasificacion, precio, estado } = req.body;

        if (!/^[1-9]\d*$/.test(id))
            return res.status(400).json({ message: 'ID de película no válido' });

        const [actuales] = await pool.query('SELECT id FROM peliculas WHERE id = ?', [id]);
        if (!actuales.length)
            return res.status(404).json({ message: 'Película no encontrada' });

        const errores = {};
        const precioNumero = Number(precio);
        const duracionNumero = Number(duracion);

        if (typeof codigo !== 'string' || !codigo.trim() || codigo.trim().length > 30)
            errores.codigo = 'El código es obligatorio y admite hasta 30 caracteres';
        if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 180)
            errores.nombre = 'El nombre es obligatorio y admite hasta 180 caracteres';
        if (typeof genero !== 'string' || !genero.trim() || genero.trim().length > 80)
            errores.genero = 'El género es obligatorio y admite hasta 80 caracteres';
        if (duracion === undefined || duracion === '' ||
            !Number.isInteger(duracionNumero) || duracionNumero <= 0 || duracionNumero > 65535)
            errores.duracion = 'La duración debe ser un entero positivo';
        if (typeof clasificacion !== 'string' || !clasificacion.trim() || clasificacion.trim().length > 20)
            errores.clasificacion = 'La clasificación es obligatoria y admite hasta 20 caracteres';
        if (precio === undefined || precio === null || precio === '' ||
            !Number.isFinite(precioNumero) || precioNumero < 0 ||
            !/^\d{1,8}(\.\d{1,2})?$/.test(String(precio)))
            errores.precio = 'El precio debe ser no negativo y tener hasta dos decimales';
        if (estado !== undefined && !['Disponible', 'No disponible'].includes(estado))
            errores.estado = 'Estado no válido';

        if (Object.keys(errores).length)
            return res.status(400).json({ message: 'Hay errores en los campos', errores });

        const [duplicados] = await pool.query(
            'SELECT id FROM peliculas WHERE codigo = ? AND id <> ?',
            [codigo.trim(), id]
        );
        if (duplicados.length)
            return res.status(409).json({ message: 'Ya existe una película con ese código' });

        await pool.query(
            `UPDATE peliculas
       SET codigo = ?, nombre = ?, genero = ?, duracion = ?,
           clasificacion = ?, precio = ?, estado = ?
       WHERE id = ?`,
            [
                codigo.trim(), nombre.trim(), genero.trim(), duracionNumero,
                clasificacion.trim(), precioNumero, estado ?? 'Disponible', id
            ]
        );

        return res.status(200).json({ message: 'Película actualizada correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ message: 'Ya existe una película con ese código' });
        console.error('Error al actualizar película:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const deletePelicula = async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[1-9]\d*$/.test(id))
            return res.status(400).json({ message: 'ID de película no válido' });

        const [peliculas] = await pool.query(
            'SELECT id FROM peliculas WHERE id = ?', [id]
        );
        if (!peliculas.length)
            return res.status(404).json({ message: 'Película no encontrada' });

        const [reservas] = await pool.query(
            `SELECT r.id
       FROM reservas r
       JOIN funciones f ON f.id = r.funcion_id
       WHERE f.pelicula_id = ? AND r.estado = 'activa'
       LIMIT 1`,
            [id]
        );
        if (reservas.length)
            return res.status(409).json({
                message: 'No se puede eliminar una película con reservas activas'
            });

        try {
            await pool.query('DELETE FROM peliculas WHERE id = ?', [id]);
        } catch (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2')
                return res.status(409).json({
                    message: 'No se puede eliminar una película que tiene funciones asociadas'
                });
            throw error;
        }

        return res.status(200).json({ message: 'Película eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar película:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const patchEstadoPelicula = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!/^[1-9]\d*$/.test(id))
            return res.status(400).json({ message: 'ID de película no válido' });
        if (!['Disponible', 'No disponible'].includes(estado))
            return res.status(400).json({ message: 'Estado no válido' });

        const [resultado] = await pool.query(
            'UPDATE peliculas SET estado = ? WHERE id = ?',
            [estado, id]
        );

        if (!resultado.affectedRows)
            return res.status(404).json({ message: 'Película no encontrada' });

        return res.status(200).json({ message: 'Estado actualizado correctamente', estado });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};