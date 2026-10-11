import express from 'express'
import usuariosRoutes from './routes/usuarios.routes.js';
import cinesRoutes from './routes/cines.routes.js';

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/usuarios', usuariosRoutes);
app.use('/cines', cinesRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: 'Endpoint No encontrado',
    });
});

export default app;