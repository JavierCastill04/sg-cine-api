
import { pool } from '../config.js';

export const getDashboard = async (req, res) => {
    try {
        const [[peliculas], [funciones], [boletos], [ingresos], [capacidad], [ocupados], [ingresosPorCine], [peliculaMasReservada],] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS total FROM peliculas`
            ),

            pool.query(
                `SELECT COUNT(*) AS total,
                COALESCE(SUM(estado = 'activa'), 0) AS activas,
                COALESCE(SUM(estado = 'cancelada'), 0) AS canceladas
                FROM funciones`
            ),

            pool.query(
                `SELECT COUNT(*) AS total
                FROM reserva_asientos ra
                JOIN reservas r
                ON r.id = ra.reserva_id
                AND r.funcion_id = ra.funcion_id
                WHERE r.estado IN ('activa', 'utilizada')`
            ),

            pool.query(
                `SELECT COALESCE(SUM(total), 0) AS total
                FROM reservas
                WHERE estado IN ('activa', 'utilizada')`
            ),

            pool.query(
                `SELECT COALESCE(SUM(s.filas * s.columnas), 0) AS total
                FROM funciones f
                JOIN salas s ON s.id = f.sala_id
                WHERE f.estado = 'activa'`
            ),

            pool.query(
                `SELECT COUNT(*) AS total
                FROM reserva_asientos ra
                JOIN reservas r
                ON r.id = ra.reserva_id
                AND r.funcion_id = ra.funcion_id
                JOIN funciones f ON f.id = ra.funcion_id
                WHERE f.estado = 'activa'
                AND r.estado IN ('activa', 'utilizada')`
            ),

            pool.query(
                `SELECT c.id AS cineId,
                c.nombre AS cine,
                COALESCE(SUM(r.total), 0) AS ingresos
                FROM cines c
                LEFT JOIN salas s ON s.cine_id = c.id
                LEFT JOIN funciones f ON f.sala_id = s.id
                LEFT JOIN reservas r
                ON r.funcion_id = f.id
                AND r.estado IN ('activa', 'utilizada')
                GROUP BY c.id, c.nombre
                ORDER BY ingresos DESC`
            ),

            pool.query(
                `SELECT p.id AS peliculaId,
                p.nombre AS pelicula,
                COUNT(ra.id) AS boletosVendidos
                FROM peliculas p
                JOIN funciones f ON f.pelicula_id = p.id
                JOIN reservas r ON r.funcion_id = f.id
                JOIN reserva_asientos ra
                ON ra.reserva_id = r.id
                AND ra.funcion_id = r.funcion_id
                WHERE r.estado IN ('activa', 'utilizada')
                GROUP BY p.id, p.nombre
                ORDER BY boletosVendidos DESC, p.nombre ASC
                LIMIT 1`
            ),
        ]);

        const totalAsientos = Number(capacidad[0].total);
        const asientosOcupados = Number(ocupados[0].total);

        return res.status(200).json({
            peliculas: {
                total: Number(peliculas[0].total),
            },

            funciones: {
                total: Number(funciones[0].total),
                activas: Number(funciones[0].activas),
                canceladas: Number(funciones[0].canceladas),
            },

            boletosVendidos: Number(boletos[0].total),

            asientos: {
                capacidadTotal: totalAsientos,
                ocupados: asientosOcupados,
                disponibles: Math.max(0, totalAsientos - asientosOcupados),
            },

            ingresosTotales: Number(ingresos[0].total),

            ingresosPorCine: ingresosPorCine.map((cine) => ({
                cineId: Number(cine.cineId),
                cine: cine.cine,
                ingresos: Number(cine.ingresos),
            })),

            peliculaMasReservada: peliculaMasReservada.length
                ? {
                    peliculaId: Number(peliculaMasReservada[0].peliculaId),
                    pelicula: peliculaMasReservada[0].pelicula,
                    boletosVendidos: Number(
                        peliculaMasReservada[0].boletosVendidos
                    ),
                }
                : null,
        });
    } catch (error) {
        console.error('Error al consultar dashboard:', error);

        return res.status(500).json({
            message: 'Error interno del servidor',
        });
    }
};