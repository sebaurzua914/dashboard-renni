// server.js - Proxy para APIs de Korex Security
const express = require('express');
const cors = require('cors');
const https = require('https');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const app = express();

const upload = multer();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// PROXY PARA VALIDAR USUARIO
// ============================================
app.post('/api/login', upload.none(), async (req, res) => {
    try {
        console.log('\n📥 ===== LOGIN REQUEST =====');
        console.log('Body:', req.body);

        const { usuario, clave } = req.body;

        if (!usuario || !clave) {
            console.error('❌ Faltan credenciales');
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario y contraseña son requeridos' 
            });
        }

        const formData = new FormData();
        formData.append('usuario', usuario);
        formData.append('clave', clave);

        const apiUrl = 'https://cloud.korex.cl/api/Public/ValidarUsuario';
        console.log('🔄 Reenviando a:', apiUrl);

        // Usar fetch dinámico
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        console.log('📡 Respuesta de API:', response.status, response.statusText);

        const responseText = await response.text();
        console.log('📦 Respuesta raw:', responseText.substring(0, 500));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Error parseando JSON');
            return res.status(500).json({
                success: false,
                message: 'Error en la respuesta del servidor'
            });
        }

        console.log('✅ Login exitoso');
        res.json(data);

    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ============================================
// PROXY PARA OBTENER SUMMARY (KPIs)
// GET https://cloud.korex.cl/api/camera/summary/
// Body: x-www-form-urlencoded (Fecha, UsuarioWeb, IdDispositivo)
// ============================================
app.get('/api/summary', async (req, res) => {
    try {
        console.log('\n📥 ===== SUMMARY REQUEST =====');
        const { Fecha, UsuarioWeb, IdDispositivo } = req.query;
        console.log('Query params recibidos en backend:', { Fecha, UsuarioWeb, IdDispositivo });

        if (!Fecha || !UsuarioWeb) {
            return res.status(400).json({
                Success: false,
                Message: 'Fecha y UsuarioWeb son obligatorios'
            });
        }

        // Body x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('Fecha', Fecha);
        params.append('UsuarioWeb', UsuarioWeb);
        if (IdDispositivo) {
            params.append('IdDispositivo', IdDispositivo);
        }

        const bodyString = params.toString();
        console.log('🔄 Fetching: https://cloud.korex.cl/api/camera/summary/');
        console.log('📦 BODY:', bodyString);

        const options = {
            hostname: 'cloud.korex.cl',
            path: '/api/camera/summary/',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyString),
                'User-Agent': 'Korex-Dashboard/1.0',
                'Cache-Control': 'no-cache'
            }
        };

        const apiResponse = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        body: data
                    });
                });
            });

            request.on('error', reject);
            request.write(bodyString);
            request.end();
        });

        console.log('📡 Respuesta de API:', apiResponse.statusCode, apiResponse.statusMessage);
        console.log('📦 Raw body (primero 500 chars):', apiResponse.body.substring(0, 500));

        let data;
        try {
            data = JSON.parse(apiResponse.body);
        } catch (e) {
            console.error('❌ No se pudo parsear JSON desde summary');
            return res.status(500).json({
                Success: false,
                Message: 'Respuesta no válida desde API summary'
            });
        }

        console.log('📊 Objeto summary parseado:', data);
        console.log('👤 KPIs para usuario:', UsuarioWeb);

        if (apiResponse.statusCode !== 200 || data.Success === false) {
            return res.status(400).json({
                Success: false,
                Message: data.Message || 'Error al obtener summary'
            });
        }

        return res.json(data);

    } catch (error) {
        console.error('❌ Error en /api/summary:', error);
        res.status(500).json({
            Success: false,
            Message: 'Error al obtener summary',
            error: error.message
        });
    }
});
// ============================================
// PROXY PARA OBTENER LOGS (GET + BODY usando https nativo)
// ============================================
app.get('/api/logs', async (req, res) => {
    try {
        console.log('\n📥 ===== LOGS REQUEST =====');
        const { Fecha, UsuarioWeb, IdDispositivo } = req.query;

        console.log('Query params recibidos en backend:', { Fecha, UsuarioWeb, IdDispositivo });

        if (!Fecha || !UsuarioWeb) {
            console.error('❌ Falta Fecha o UsuarioWeb');
            return res.status(400).json({ 
                Success: false, 
                Message: 'Fecha y UsuarioWeb son obligatorios' 
            });
        }

        // Construir body x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('Fecha', Fecha);
        params.append('UsuarioWeb', UsuarioWeb);
        if (IdDispositivo) {
            params.append('IdDispositivo', IdDispositivo);
        }

        const bodyString = params.toString();
        console.log('🔄 Fetching: https://cloud.korex.cl/api/camera/getLog');
        console.log('📦 BODY:', bodyString);

        // Usar https nativo para permitir body en GET
        const options = {
            hostname: 'cloud.korex.cl',
            path: '/api/camera/getLog',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyString),
                'User-Agent': 'Korex-Dashboard/1.0',
                'Cache-Control': 'no-cache'
            }
        };

        const apiResponse = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        body: data
                    });
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            // Escribir el body
            request.write(bodyString);
            request.end();
        });

        console.log('📡 Respuesta de API:', apiResponse.statusCode, apiResponse.statusMessage);
        console.log('📦 Raw body (primero 500 chars):', apiResponse.body.substring(0, 500));

        let data;
        try {
            data = JSON.parse(apiResponse.body);
        } catch (e) {
            console.error('❌ No se pudo parsear JSON desde API externa');
            return res.status(500).json({
                Success: false,
                Message: 'Respuesta no válida desde API externa'
            });
        }

        //console.log('📊 Objeto parseado:', data );

        if (apiResponse.statusCode !== 200 || data.Success === false) {
            console.error('❌ API externa devolvió error:', data.Message);
            return res.status(400).json({
                Success: false,
                Message: data.Message || 'Error al obtener logs de la API externa'
            });
        }

        console.log('✅ Logs recibidos:', data.Data?.length || 0, 'transacciones');
        return res.json(data);

    } catch (error) {
        console.error('❌ Error en /api/logs:', error);
        res.status(500).json({ 
            Success: false, 
            Message: 'Error al obtener logs',
            error: error.message 
        });
    }
});

// ============================================
// PROXY PARA DVR PAYMENTS (NUEVO)
// POST https://cloud.korex.cl/Api/Job/SolicitarDvrListaPago?CorreoUsuaWeb=xxx
// ============================================
app.get('/api/dvr-payments', async (req, res) => {
    try {
        console.log('\n📥 ===== DVR PAYMENTS REQUEST =====');
        const usuarioWeb = req.query.usuarioWeb || req.query.CorreoUsuaWeb;

        console.log('Query params recibidos:', { usuarioWeb });

        if (!usuarioWeb) {
            console.error('❌ Falta usuarioWeb');
            return res.status(400).json({
                success: false,
                message: 'Parámetro usuarioWeb es obligatorio'
            });
        }

        const apiUrl = `https://cloud.korex.cl/Api/Job/SolicitarDvrListaPago?CorreoUsuaWeb=${encodeURIComponent(usuarioWeb)}`;
        console.log('🔄 Fetching:', apiUrl);

        const options = {
            hostname: 'cloud.korex.cl',
            path: `/Api/Job/SolicitarDvrListaPago?CorreoUsuaWeb=${encodeURIComponent(usuarioWeb)}`,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Korex-Dashboard/1.0',
                'Cache-Control': 'no-cache'
            }
        };

        const apiResponse = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        body: data
                    });
                });
            });

            request.on('error', reject);
            request.end();
        });

        console.log('📡 Respuesta de API:', apiResponse.statusCode, apiResponse.statusMessage);
        console.log('📦 Raw body (primero 500 chars):', apiResponse.body.substring(0, 500));

        let data;
        try {
            data = JSON.parse(apiResponse.body);
        } catch (e) {
            console.error('❌ No se pudo parsear JSON desde DVR Payments API');
            return res.status(500).json({
                success: false,
                message: 'Respuesta no válida desde API DVR Payments'
            });
        }

        console.log('📊 DVR Payments parseado:', data);

        if (apiResponse.statusCode !== 200) {
            return res.status(apiResponse.statusCode).json({
                success: false,
                message: data.message || data.Message || 'Error al obtener DVR payments'
            });
        }

        console.log('✅ DVR Payments recibidos:', data.data?.length || data.Data?.length || 0, 'DVRs');
        return res.json(data);

    } catch (error) {
        console.error('❌ Error en /api/dvr-payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener DVR payments',
            error: error.message
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// RUTA RAÍZ - Redirigir a login
// ============================================
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// ============================================
// ERROR HANDLERS
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ SERVIDOR KOREX INICIADO');
    console.log('='.repeat(60));
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/index.html`);
    console.log(`👤 Perfil: http://localhost:${PORT}/perfil.html`);
    console.log('='.repeat(60) + '\n');
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});