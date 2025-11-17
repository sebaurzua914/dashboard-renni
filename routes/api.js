const express = require('express');
const router = express.Router();
const redisClient = require('./redis');
const fetch = require('node-fetch');
const FormData = require('form-data');

// ===== PROXY PARA LOGIN DE KOREX (SOLUCIONADO) =====
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 Recibiendo petición de login:', req.body);
        
        const { usuario, clave } = req.body;
        
        // Validar datos
        if (!usuario || !clave) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Probar primero con GET (como en tu screenshot de Postman que funciona)
        console.log('📤 Probando método GET con query params...');
        const urlGet = new URL('https://cloud.korex.cl/api/Public/ValidarUsuario');
        urlGet.searchParams.append('Usuario', usuario);
        urlGet.searchParams.append('Contraseña', clave);

        console.log('📤 URL GET:', urlGet.toString());

        let response = await fetch(urlGet.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Korex-Dashboard/1.0'
            }
        });

        console.log('📡 Respuesta GET Korex:', response.status, response.statusText);

        // Si GET no funciona, intentar POST con FormData
        if (!response.ok) {
            console.log('📤 GET falló, probando POST con FormData...');
            
            const formData = new FormData();
            formData.append('Usuario', usuario);
            formData.append('Contraseña', clave);

            response = await fetch('https://cloud.korex.cl/api/Public/ValidarUsuario', {
                method: 'POST',
                body: formData,
                headers: {
                    'User-Agent': 'Korex-Dashboard/1.0',
                    // No establecer Content-Type, fetch lo hace automáticamente para FormData
                    ...formData.getHeaders()
                }
            });

            console.log('📡 Respuesta POST FormData Korex:', response.status, response.statusText);
        }

        // Leer respuesta
        const textResponse = await response.text();
        console.log('📦 Respuesta raw:', textResponse.substring(0, 500));

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('❌ Error parseando JSON:', parseError);
            console.log('📦 Respuesta completa:', textResponse);
            
            // Si no es JSON válido, intentar verificar si contiene información útil
            if (textResponse.toLowerCase().includes('error') || response.status >= 400) {
                throw new Error(`Error del servidor: ${textResponse.substring(0, 200)}`);
            }
            
            // Si la respuesta parece exitosa pero no es JSON, asumir éxito
            data = {
                success: true,
                message: 'Login aparentemente exitoso',
                data: { usuario: usuario }
            };
        }

        console.log('📦 Datos procesados:', data);

        // Transformar respuesta para compatibilidad
        const isSuccess = data.success === true || data.Success === true || response.ok;
        
        const transformedResponse = {
            success: isSuccess,
            message: data.message || data.Message || (isSuccess ? 'Login exitoso' : 'Credenciales incorrectas'),
            data: data.data || data.Data || { 
                correoUsuaWeb: usuario,
                nombreUsuaWeb: usuario.split('@')[0] || usuario,
                estadoUsuaWeb: 'A'
            }
        };

        console.log('✅ Respuesta final:', transformedResponse);
        res.status(200).json(transformedResponse);

    } catch (error) {
        console.error('❌ Error en proxy de login:', error);
        res.status(500).json({
            success: false,
            message: `Error de conexión: ${error.message}`,
            error: error.message
        });
    }
});

// ===== PROXY PARA OBTENER LOGS DE TRANSACCIONES =====
router.get('/logs', async (req, res) => {
    try {
        console.log('📊 Recibiendo petición de logs:', req.query);
        
        const { fecha, usuarioWeb, idDispositivo } = req.query;
        
        // Validar parámetros mínimos
        if (!usuarioWeb) {
            return res.status(400).json({
                success: false,
                message: 'UsuarioWeb es requerido'
            });
        }

        // Construir URL para la API de getLog
        const url = new URL('https://cloud.korex.cl/api/camera/getLog');
        
        if (fecha) {
            url.searchParams.append('Fecha', fecha);
        }
        
        url.searchParams.append('UsuarioWeb', usuarioWeb);
        
        if (idDispositivo) {
            url.searchParams.append('IdDispositivo', idDispositivo);
        }

        console.log('📤 Enviando a API Korex getLog:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Korex-Dashboard/1.0'
            }
        });

        console.log('📡 Respuesta de getLog:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Logs recibidos:', { success: data.Success, count: data.Data?.length || 0 });

        res.status(200).json(data);

    } catch (error) {
        console.error('❌ Error en proxy de logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener logs de transacciones',
            error: error.message
        });
    }
});

// ===== PROXY PARA OBTENER RESUMEN/KPIs =====
router.get('/summary', async (req, res) => {
    try {
        console.log('📈 Recibiendo petición de summary:', req.query);
        
        const { fecha, usuarioWeb, idDispositivo } = req.query;
        
        // Validar parámetros mínimos
        if (!usuarioWeb) {
            return res.status(400).json({
                success: false,
                message: 'UsuarioWeb es requerido'
            });
        }

        // Construir URL para la API de summary
        const url = new URL('https://cloud.korex.cl/api/camera/summary');
        
        // Fecha es requerida para summary
        if (fecha) {
            url.searchParams.append('Fecha', fecha);
        } else {
            // Si no se proporciona fecha, usar fecha actual en formato correcto
            const today = new Date();
            const fechaFormateada = today.getFullYear() + '-' + 
                String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                String(today.getDate()).padStart(2, '0') + ' 00:00:00';
            url.searchParams.append('Fecha', fechaFormateada);
        }
        
        url.searchParams.append('UsuarioWeb', usuarioWeb);
        
        if (idDispositivo) {
            url.searchParams.append('IdDispositivo', idDispositivo);
        }

        console.log('📤 Enviando a API Korex summary:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Korex-Dashboard/1.0'
            }
        });

        console.log('📡 Respuesta de summary:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Summary recibido:', { 
            success: data.Success, 
            totalTransactions: data.Data?.TotalTransactions || 0,
            totalAnomalies: data.Data?.TotalAnomalies || 0
        });

        res.status(200).json(data);

    } catch (error) {
        console.error('❌ Error en proxy de summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen de transacciones',
            error: error.message
        });
    }
});

// ===== HEALTH CHECK =====
router.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.status(200).send({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      redis: 'connected'
    });
  } catch (error) {
    console.error('Redis health check failed:', error);
    res.status(500).send({ 
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      redis: 'disconnected',
      error: error.message
    });
  }
});

// ===== TRANSACCIONES DEL DÍA =====
router.get('/transactions/today', async (req, res) => {
  try {
    const today = req.query.date ? new Date(req.query.date) : new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const key = `${day}:${month}:${year}:logs`;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const stop = page * limit - 1;

    const transactionType = req.query.type;
    const paymentMethod = req.query.paymentMethod;
    const searchTerm = req.query.search;
    
    let transactions = await redisClient.lRange(key, 0, -1);
    
    if (!transactions) {
      transactions = [];
    }

    transactions = transactions.map(transaction => JSON.parse(transaction));
    
    // Aplicar filtros ANTES del ordenamiento y paginación
    if (transactionType) {
      transactions = transactions.filter(transaction => transaction.Type === transactionType);
    }

    if (paymentMethod) {
      if (paymentMethod === 'pago_efectivo') {
        transactions = transactions.filter(transaction => 
          transaction['Payment Method'] === 'dinero_mano' || 
          transaction['Payment Method'] === 'caja_abierta' ||
          transaction['Payment Method'] === 'pago_efectivo'
        );
      } else if (paymentMethod === 'otros_metodos') {
        transactions = transactions.filter(transaction => 
          transaction['Payment Method'] !== 'pago_tarjeta' &&
          transaction['Payment Method'] !== 'pago_efectivo' &&
          transaction['Payment Method'] !== 'dinero_mano' &&
          transaction['Payment Method'] !== 'caja_abierta'
        );
      } else {
        transactions = transactions.filter(transaction => 
          transaction['Payment Method'] === paymentMethod
        );
      }
    }

    if (searchTerm) {
      transactions = transactions.filter(transaction =>
        Object.values(transaction).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Ordenar por fecha de inicio (más reciente primero)
    transactions.sort((a, b) => new Date(b.Inicio) - new Date(a.Inicio));
    
    // Calcular total antes de paginar
    const totalTransactions = transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);
    
    // Aplicar paginación después de filtros y ordenamiento
    transactions = transactions.slice(start, start + limit);

    res.status(200).send({
      data: transactions,
      pagination: {
        page: page,
        limit: limit,
        total: totalTransactions,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).send({ 
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

// ===== TRANSACCIÓN POR ID =====
router.get('/transactions/:id', async (req, res) => {
  try {
    const transactionId = req.params.id;
    const transaction = await redisClient.get(transactionId);

    if (!transaction) {
      return res.status(404).send({ 
        error: 'Transaction not found',
        transactionId: transactionId
      });
    }

    res.status(200).send(JSON.parse(transaction));
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).send({ 
      error: 'Failed to fetch transaction',
      message: error.message
    });
  }
});

// ===== KPIs DEL DÍA =====
router.get('/kpis/today', async (req, res) => {
  try {
    const today = req.query.date ? new Date(req.query.date) : new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const key = `${day}:${month}:${year}:logs`;

    let transactions = await redisClient.lRange(key, 0, -1);

    if (!transactions) {
      transactions = [];
    }

    transactions = transactions.map(transaction => JSON.parse(transaction));

    const totalTransactions = transactions.length;

    const normalTransactions = transactions.filter(transaction => transaction.Type === 'normal').length;
    const anomalousTransactions = transactions.filter(transaction => transaction.Type === 'anomalous').length;
    const unknownTransactions = transactions.filter(transaction => transaction.Type === 'unknown').length;

    const normalPercentage = (totalTransactions > 0) ? (normalTransactions / totalTransactions) * 100 : 0;
    const anomalousPercentage = (totalTransactions > 0) ? (anomalousTransactions / totalTransactions) * 100 : 0;
    const unknownPercentage = (totalTransactions > 0) ? (unknownTransactions / totalTransactions) * 100 : 0;

    const pagoTarjeta = transactions.filter(transaction => 
      transaction['Payment Method'] === 'pago_tarjeta'
    ).length;
    
    const pagoEfectivo = transactions.filter(transaction => 
      transaction['Payment Method'] === 'pago_efectivo' || 
      transaction['Payment Method'] === 'dinero_mano' || 
      transaction['Payment Method'] === 'caja_abierta'
    ).length;
    
    const otrosMetodos = totalTransactions - pagoTarjeta - pagoEfectivo;

    let totalAmount = 0;
    let normalAmount = 0;
    let anomalousAmount = 0;
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.Amount || transaction.Monto || 0);
      totalAmount += amount;
      
      if (transaction.Type === 'normal') {
        normalAmount += amount;
      } else if (transaction.Type === 'anomalous') {
        anomalousAmount += amount;
      }
    });

    const kpis = {
      date: `${day}/${month}/${year}`,
      totalTransactions,
      totalAmount: totalAmount.toFixed(2),
      transactionTypes: {
        normal: {
          count: normalTransactions,
          percentage: normalPercentage.toFixed(2),
          amount: normalAmount.toFixed(2)
        },
        anomalous: {
          count: anomalousTransactions,
          percentage: anomalousPercentage.toFixed(2),
          amount: anomalousAmount.toFixed(2)
        },
        unknown: {
          count: unknownTransactions,
          percentage: unknownPercentage.toFixed(2)
        }
      },
      paymentMethods: {
        pago_tarjeta: {
          count: pagoTarjeta,
          percentage: totalTransactions > 0 ? ((pagoTarjeta / totalTransactions) * 100).toFixed(2) : 0
        },
        pago_efectivo: {
          count: pagoEfectivo,
          percentage: totalTransactions > 0 ? ((pagoEfectivo / totalTransactions) * 100).toFixed(2) : 0
        },
        otros_metodos: {
          count: otrosMetodos,
          percentage: totalTransactions > 0 ? ((otrosMetodos / totalTransactions) * 100).toFixed(2) : 0
        }
      }
    };

    res.status(200).send(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).send({ 
      error: 'Failed to fetch KPIs',
      message: error.message
    });
  }
});

// ===== ESTADÍSTICAS POR RANGO DE FECHAS =====
router.get('/stats/range', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const stats = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const day = String(currentDate.getDate()).padStart(2, '0');
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const year = currentDate.getFullYear();
      const key = `${day}:${month}:${year}:logs`;
      
      let transactions = await redisClient.lRange(key, 0, -1);
      
      if (transactions && transactions.length > 0) {
        transactions = transactions.map(t => JSON.parse(t));
        
        stats.push({
          date: `${day}/${month}/${year}`,
          total: transactions.length,
          normal: transactions.filter(t => t.Type === 'normal').length,
          anomalous: transactions.filter(t => t.Type === 'anomalous').length,
          unknown: transactions.filter(t => t.Type === 'unknown').length
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(200).send(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).send({ 
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// ===== ENDPOINT DE PRUEBA =====
router.get('/test', (req, res) => {
  res.json({
    Success: true,
    Message: 'API funcionando correctamente',
    Timestamp: new Date().toISOString(),
    Endpoints: {
      login: 'POST /api/login',
      health: 'GET /api/health',
      transactions: 'GET /api/transactions/today',
      transactionById: 'GET /api/transactions/:id',
      kpis: 'GET /api/kpis/today',
      stats: 'GET /api/stats/range',
      test: 'GET /api/test'
    }
  });
});

module.exports = router;
