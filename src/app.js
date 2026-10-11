import express from 'express'
import usuariosRoutes from './routes/usuarios.routes.js';
import cinesRoutes from './routes/cines.routes.js';
import peliculasRoutes from './routes/peliculas.routes.js';
import funcionesRoutes from './routes/funciones.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import dispositivosRoutes from './routes/dispositivos.routes.js';

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/usuarios', usuariosRoutes);
app.use('/cines', cinesRoutes);
app.use('/peliculas', peliculasRoutes);
app.use('/funciones', funcionesRoutes);
app.use('/reservas', reservasRoutes);
app.use('/dispositivos', dispositivosRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: 'Endpoint No encontrado',
    });
});

export default app;