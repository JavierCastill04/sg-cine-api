import 'dotenv/config'
import app from './app.js'
import { iniciarConsultaRecibos } from './services/receipts.scheduler.js';

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    iniciarConsultaRecibos();
});