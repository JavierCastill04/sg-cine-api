import helmet from 'helmet';
import express from 'express';
import usuariosRoutes from './routes/usuarios.routes.js';
import cinesRoutes from './routes/cines.routes.js';
import peliculasRoutes from './routes/peliculas.routes.js';
import funcionesRoutes from './routes/funciones.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import dispositivosRoutes from './routes/dispositivos.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import salasRoutes from './routes/salas.routes.js';
import logsMiddleware from './middlewares/logs.middleware.js';

const app = express();

app.use(helmet());

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(logsMiddleware);
app.use('/usuarios', usuariosRoutes);
app.use('/cines', cinesRoutes);
app.use('/salas', salasRoutes);
app.use('/peliculas', peliculasRoutes);
app.use('/funciones', funcionesRoutes);
app.use('/reservas', reservasRoutes);
app.use('/dispositivos', dispositivosRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notificaciones', notificacionesRoutes);


app.use((req, res) => {
    res.status(404).json({
        message: 'Endpoint no encontrado',
    });
});

export default app;
