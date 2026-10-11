import { consultarRecibos } from './receipts.service.js';

const INTERVALO = 1 * 60 * 1000;

let ejecutando = false;

export function iniciarConsultaRecibos() {
    const ejecutar = async () => {
        if (ejecutando) {
            return;
        }

        ejecutando = true;

        try {
            const resultado = await consultarRecibos();

            console.log('Resultado de consulta de recibos:', resultado);
        } catch (error) {
            console.error('Error al consultar recibos de Expo:', error);
        } finally {
            ejecutando = false;
        }
    };

    setInterval(ejecutar, INTERVALO);

    console.log(
        'Consulta periódica de recibos de Expo iniciada.'
    );
}