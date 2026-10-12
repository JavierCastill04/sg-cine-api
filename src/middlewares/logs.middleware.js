const logsMiddleware = (req, res, next) => {
    const inicio = Date.now();
    const ruta = req.path;

    console.log(`[API] → ${req.method} ${ruta}`);

    res.on('finish', () => {
        const registro = {
            metodo: req.method,
            ruta,
            estado: res.statusCode,
            duracionMs: Date.now() - inicio,
        };

        if (res.statusCode >= 500) {
            console.error('[API] ERROR SERVIDOR', registro);
        } else if (res.statusCode >= 400) {
            console.warn('[API] ERROR CLIENTE', registro);
        } else {
            console.log('[API] RESPUESTA', registro);
        }
    });

    next();
};

export default logsMiddleware;