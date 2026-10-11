import express from 'express'

const app=express()

// Middleware para procesar JSON
app.use(express.json());

// Middleware para procesar datos de formularios (opcional, si usas x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.use((req,res,next)=>{
    res.status(404).json({
        message:'Endpoint No encontrado'
    })
})

export default app;