// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Proxy para ValidarUsuario
app.post('/api/login', async (req, res) => {
    try {
        const { usuario, clave } = req.body;
        
        const formData = new URLSearchParams();
        formData.append('usuario', usuario);
        formData.append('clave', clave);

        const response = await fetch('https://cloud.korex.cl/api/Public/ValidarUsuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData.toString()
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Proxy para getLog
app.get('/api/logs', async (req, res) => {
    try {
        const { Fecha, UsuarioWeb, IdDispositivo } = req.query;
        
        let url = `https://cloud.korex.cl/api/camera/getLog?Fecha=${Fecha}&UsuarioWeb=${UsuarioWeb}`;
        if (IdDispositivo) {
            url += `&IdDispositivo=${IdDispositivo}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});