// auth.js - Sistema de autenticación Korex Security

const API_CONFIG = {
    baseURL: '',
    endpoints: {
        validateUser: '/api/login',
        getLog: '/api/logs',
        summary: '/api/summary'
    }
};

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function saveUserData(userData, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    const dataToSave = {
        ...userData,
        isLoggedIn: true,
        loginTime: Date.now()
    };

    storage.setItem('korexUserData', JSON.stringify(dataToSave));

    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('korexUserData');

    console.log('💾 Usuario guardado:', userData.email);
}

function getUserData() {
    const data = localStorage.getItem('korexUserData') || sessionStorage.getItem('korexUserData');
    if (!data) return null;

    try {
        const userData = JSON.parse(data);

        const isLocalStorage = localStorage.getItem('korexUserData') !== null;
        const maxAge = isLocalStorage ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

        if (Date.now() - userData.loginTime > maxAge) {
            console.warn('⚠️ Sesión expirada');
            clearSession();
            return null;
        }

        return userData;
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        clearSession();
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('korexUserData');
    sessionStorage.removeItem('korexUserData');
    console.log('🧹 Sesión limpiada');
}

function isAuthenticated() {
    const userData = getUserData();
    const isAuth = !!(userData && userData.email && userData.isLoggedIn);
    console.log('🔐 isAuthenticated:', isAuth);
    return isAuth;
}

function logout() {
    clearSession();
    window.location.href = '/login.html';
}

// ============================================
// LOGIN
// ============================================

async function login(username, password, remember = false) {
    try {
        console.log('🔐 Intentando login:', username);

        const url = API_CONFIG.endpoints.validateUser;

        const formData = new FormData();
        formData.append('usuario', username);
        formData.append('clave', password);

        console.log('📤 POST a:', url);

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        console.log('📡 Respuesta:', response.status);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Datos recibidos:', data);

        if (data.success === true) {
            const apiData = data.data || {};

            const userData = {
                email: apiData.correoUsuaWeb || username,
                username: username,
                fullName: apiData.nombreUsuaWeb || 'Usuario',
                estado: apiData.estadoUsuaWeb || 'A',
                ultimoAcceso: apiData.ultimoAccesoUsuaWeb || null,
                loginTime: Date.now(),
                isLoggedIn: true
            };

            saveUserData(userData, remember);

            console.log('✅ Login exitoso:', userData.email);

            return {
                success: true,
                user: userData,
                message: 'Login exitoso'
            };

        } else {
            throw new Error(data.message || 'Credenciales incorrectas');
        }

    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

// ============================================
// OBTENER LOGS (⚠️ CORREGIDO)
// ============================================

/**
 * Formatea una fecha ISO (YYYY-MM-DD) al formato que espera la API
 * @param {string} dateISO - Fecha en formato YYYY-MM-DD
 * @returns {string} - Fecha en formato YYYY-MM-DD HH:mm:ss
 */
function formatDateForApi(dateISO) {
    // La API espera: "2025-11-14 00:00:00"
    return `${dateISO} 00:00:00`;
}

async function fetchTransactionLogs(fecha = null, usuarioWeb = null, idDispositivo = null) {
    try {
        const userData = getUserData();
        if (!userData) {
            throw new Error('Usuario no autenticado');
        }

        const finalUsuarioWeb = usuarioWeb || userData.email;
        const finalFecha = fecha || new Date().toISOString().split('T')[0];

        // ⚠️ CAMBIO CRÍTICO: Formatear fecha con hora
        const fechaFormateada = formatDateForApi(finalFecha);

        const url = new URL(API_CONFIG.endpoints.getLog, window.location.origin);
        url.searchParams.append('Fecha', fechaFormateada);
        url.searchParams.append('UsuarioWeb', finalUsuarioWeb);

        if (idDispositivo) {
            url.searchParams.append('IdDispositivo', idDispositivo);
        }

        console.log('🌐 Fetching logs:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('📡 Respuesta de API:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Logs recibidos:', data.Data?.length || 0, 'transacciones');

        return data;

    } catch (error) {
        console.error('❌ Error fetching logs:', error);
        throw error;
    }
}

// ============================================
// OBTENER SUMMARY/KPIs
// ============================================

async function fetchTransactionSummary(fecha = null, usuarioWeb = null, idDispositivo = null) {
    try {
        const userData = getUserData();
        if (!userData) {
            throw new Error('Usuario no autenticado');
        }

        const finalUsuarioWeb = usuarioWeb || userData.email;
        const finalFecha = fecha || new Date().toISOString().split('T')[0];

        // Formatear fecha con hora para la API summary
        const fechaFormateada = formatDateForApi(finalFecha);

        const url = new URL(API_CONFIG.endpoints.summary, window.location.origin);
        url.searchParams.append('Fecha', fechaFormateada);
        url.searchParams.append('UsuarioWeb', finalUsuarioWeb);

        if (idDispositivo) {
            url.searchParams.append('IdDispositivo', idDispositivo);
        }

        console.log('📈 Fetching summary:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('📡 Respuesta Summary API:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Summary recibido:', data.Data);

        return data;

    } catch (error) {
        console.error('❌ Error fetching summary:', error);
        throw error;
    }
}

// ============================================
// PROCESAR DATOS
// ============================================

function processTransactionData(apiData) {
    if (!apiData || !apiData.Data || !Array.isArray(apiData.Data)) {
        return [];
    }

    return apiData.Data.map(t => ({
        id: t.Id,
        idDispositivo: t.IdDispositivo,
        nombreDvr: (t.NombreDvr || '').trim(),
        numeroCamara: t.NumeroCamara,
        clientId: t.ClientId,
        cashierId: t.CashierId,
        reason: t.Reason,
        events: t.Events,
        duration: t.Duration,
        startTime: t.StartTime,
        endTime: t.EndTime,
        paymentMethod: t.PaymentMethod,
        type: t.Type,
        logDate: t.LogDate,
        createdAt: t.CreatedAt
    }));
}

// ============================================
// CALCULAR KPIS
// ============================================

function calculateKPIs(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
            total: 0,
            normal: 0,
            anomalias: 0,
            patronNoReconocido: 0,
            sinMetodoPago: 0,
            cajaAbierta: 0,
            avgDuration: 0,
            pagoTarjeta: 0,
            pagoEfectivo: 0,
            otros: 0
        };
    }

    const total = transactions.length;
    const normal = transactions.filter(t => t.type === 'Normal').length;
    const patronNoReconocido = transactions.filter(t => t.type === 'Patrón No Reconocido').length;
    const sinMetodoPago = transactions.filter(t => t.type === 'Transacción Sin Método de Pago').length;
    const cajaAbierta = transactions.filter(t => t.type === 'Caja Abierta Sin Pago').length;
    const anomalias = patronNoReconocido + sinMetodoPago + cajaAbierta;

    const pagoTarjeta = transactions.filter(t => t.paymentMethod === 'pago_tarjeta').length;
    const pagoEfectivo = transactions.filter(t => 
        ['pago_efectivo', 'caja_abierta'].includes(t.paymentMethod)
    ).length;
    const otros = total - pagoTarjeta - pagoEfectivo;

    const totalDuration = transactions.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    return {
        total,
        normal,
        anomalias,
        patronNoReconocido,
        sinMetodoPago,
        cajaAbierta,
        avgDuration,
        pagoTarjeta,
        pagoEfectivo,
        otros
    };
}

// ============================================
// EXPORTAR
// ============================================

if (typeof window !== 'undefined') {
    window.auth = {
        config: API_CONFIG,
        isAuthenticated,
        getUserData,
        saveUserData,
        clearSession,
        logout,
        login,
        fetchTransactionLogs,
        fetchTransactionSummary,
        processTransactionData,
        calculateKPIs,
        formatDateForApi
    };

    console.log('✅ Auth system loaded');
}
