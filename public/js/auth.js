// auth.js - Sistema de autenticación Korex Security

const API_CONFIG = {
    baseURL: '',
    endpoints: {
        validateUser: '/api/login',
        getLog: '/api/logs',
        summary: '/api/summary',
        dvrPayments: '/api/dvr-payments'
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
// UTILIDADES DE USUARIO
// ============================================

/**
 * Genera iniciales a partir de un nombre completo
 * @param {string} fullName - Nombre completo del usuario
 * @returns {string} - Iniciales (máximo 2 caracteres)
 */
function getUserInitials(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return 'U';
    }

    const cleaned = fullName.trim();
    if (!cleaned) return 'U';

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return 'U';
    if (words.length === 1) {
        // Si solo hay una palabra, tomar las primeras 2 letras
        return words[0].substring(0, 2).toUpperCase();
    }

    // Si hay 2 o más palabras, tomar la primera letra de las primeras 2
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Normaliza el nombre completo del usuario
 * @param {string} nombreApi - Nombre desde la API
 * @param {string} email - Email del usuario (fallback)
 * @returns {string} - Nombre normalizado
 */
function normalizeFullName(nombreApi, email) {
    if (nombreApi && typeof nombreApi === 'string') {
        const cleaned = nombreApi.trim();
        if (cleaned.length > 0) {
            // Capitalizar cada palabra
            return cleaned
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
    }

    // Fallback: usar la parte antes del @ del email
    if (email && typeof email === 'string') {
        const username = email.split('@')[0];
        return username.charAt(0).toUpperCase() + username.slice(1);
    }

    return 'Usuario';
}

/**
 * Formatea la fecha del último acceso
 * @param {string} ultimoAcceso - Fecha en formato ISO o timestamp
 * @returns {string} - Fecha formateada o '-'
 */
function formatLastAccess(ultimoAcceso) {
    if (!ultimoAcceso) return '-';

    try {
        const date = new Date(ultimoAcceso);
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.warn('⚠️ Error formateando fecha:', error);
        return '-';
    }
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

            // Extraer y normalizar datos del usuario
            const email = apiData.correoUsuaWeb || username;
            const rawFullName = apiData.nombreUsuaWeb || apiData.nombre || apiData.NombreUsuaWeb || '';
            const fullName = normalizeFullName(rawFullName, email);
            const initials = getUserInitials(fullName);

            const userData = {
                email: email,
                username: username,
                fullName: fullName,
                initials: initials,
                estado: apiData.estadoUsuaWeb || apiData.estado || 'A',
                ultimoAcceso: apiData.ultimoAccesoUsuaWeb || apiData.ultimoAcceso || null,
                ultimoAccesoFormatted: formatLastAccess(apiData.ultimoAccesoUsuaWeb || apiData.ultimoAcceso),
                loginTime: Date.now(),
                isLoggedIn: true,
                // Campos adicionales opcionales
                telefono: apiData.telefonoUsuaWeb || apiData.telefono || null,
                direccion: apiData.direccionUsuaWeb || apiData.direccion || null,
                rol: apiData.rolUsuaWeb || apiData.rol || 'usuario'
            };

            saveUserData(userData, remember);

            console.log('✅ Login exitoso:', {
                email: userData.email,
                fullName: userData.fullName,
                initials: userData.initials
            });

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
// OBTENER LISTA DE DVRS Y PAGOS
// ============================================

async function fetchDvrPayments(usuarioWeb = null) {
    try {
        const userData = getUserData();
        if (!userData) {
            throw new Error('Usuario no autenticado');
        }

        const finalUsuarioWeb = usuarioWeb || userData.email;

        const url = new URL(API_CONFIG.endpoints.dvrPayments, window.location.origin);
        url.searchParams.append('usuarioWeb', finalUsuarioWeb);

        console.log('💳 Fetching DVR payments:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('📡 Respuesta DVR Payments API:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 DVR Payments recibido:', data.Data?.length || 0, 'DVRs');

        return data;

    } catch (error) {
        console.error('❌ Error fetching DVR payments:', error);
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

    const processedTransactions = apiData.Data.map(t => ({
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

    // Ordenar por startTime de más reciente a más antigua (descendente)
    processedTransactions.sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateB - dateA; // Más reciente primero
    });

    console.log('📋 Transacciones ordenadas por startTime (más reciente primero):', processedTransactions.length);
    if (processedTransactions.length > 0) {
        console.log('🕐 Primera (más reciente):', processedTransactions[0].startTime);
        console.log('🕐 Última (más antigua):', processedTransactions[processedTransactions.length - 1].startTime);
    }

    return processedTransactions;
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
        fetchDvrPayments,
        processTransactionData,
        calculateKPIs,
        formatDateForApi,
        // Nuevas utilidades
        getUserInitials,
        normalizeFullName,
        formatLastAccess
    };

    console.log('✅ Auth system loaded');
}
