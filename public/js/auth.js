// auth.js - Sistema de autenticación para Korex Dashboard
// Configurado para consumir API MVC de beta.korex.cl

// Configuración de la API
const API_CONFIG = {
    baseURL: 'https://beta.korex.cl/api',
    endpoints: {
        login: '/auth/login',
        verify: '/auth/verify',
        logout: '/auth/logout',
        refresh: '/auth/refresh'
    }
};

/**
 * Verificar si el usuario está autenticado
 * @returns {boolean} - True si está autenticado, false si no
 */
function isAuthenticated() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
}

/**
 * Obtener el token de autenticación
 * @returns {string|null} - Token de autenticación o null
 */
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Guardar token de autenticación
 * @param {string} token - Token a guardar
 * @param {boolean} remember - Si debe recordar la sesión
 */
function saveAuthToken(token, remember = false) {
    if (remember) {
        localStorage.setItem('authToken', token);
        sessionStorage.removeItem('authToken');
    } else {
        sessionStorage.setItem('authToken', token);
        localStorage.removeItem('authToken');
    }
}

/**
 * Guardar datos del usuario
 * @param {object} userData - Datos del usuario
 */
function saveUserData(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
}

/**
 * Obtener datos del usuario
 * @returns {object} - Datos del usuario
 */
function getUserData() {
    const data = localStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
}

/**
 * Limpiar sesión
 */
function clearSession() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
}

/**
 * Cerrar sesión
 */
async function logout() {
    const token = getAuthToken();
    
    // Intentar cerrar sesión en el servidor
    if (token) {
        try {
            await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.logout}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        }
    }
    
    // Limpiar sesión local
    clearSession();
    window.location.href = '/login.html';
}

/**
 * Redirigir a login si no está autenticado
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Realizar login consumiendo API MVC de beta.korex.cl
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @param {boolean} remember - Recordar sesión
 * @returns {Promise<object>} - Respuesta del servidor
 */
async function login(username, password, remember = false) {
    try {
        /* deshabilitado auttenticacion hasta implementar KOREX Cloud 
        */
        saveUserData({
                username: "admin",
                email: `email@korex.cl`,
                role: 'admin'
            });
        saveAuthToken("token", remember = false) ;
        return getUserData();
        /*----------*/
        
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.login}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                remember: remember
            })
        });
        
        // Manejar diferentes códigos de respuesta
        if (response.status === 401) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        if (response.status === 403) {
            throw new Error('Acceso denegado. Contacta al administrador.');
        }

        if (response.status === 500) {
            throw new Error('Error del servidor. Intenta más tarde.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validar que la respuesta tenga el formato esperado
        if (!data.token) {
            throw new Error('Respuesta inválida del servidor: falta el token');
        }

        // Guardar token
        saveAuthToken(data.token, remember);
        
        // Guardar datos del usuario
        if (data.user || data.usuario) {
            const userData = data.user || data.usuario;
            saveUserData({
                username: userData.username || userData.nombreUsuario || username,
                email: userData.email || userData.correo || '',
                role: userData.role || userData.rol || 'user',
                fullName: userData.fullName || userData.nombreCompleto || username,
                id: userData.id || userData.usuarioId || null
            });
        } else {
            // Si no viene información del usuario, guardar lo básico
            saveUserData({
                username: username,
                email: `${username}@korex.cl`,
                role: 'user'
            });
        }

        return data;

    } catch (error) {
        // Si es un error de red
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        
        // Re-lanzar el error para que lo maneje el formulario
        throw error;
    }
}

/**
 * Verificar token con el servidor
 * @returns {Promise<boolean>} - True si el token es válido
 */
async function verifyToken() {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.verify}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Token inválido, limpiar sesión
            clearSession();
            return false;
        }

        const data = await response.json();
        
        // Actualizar datos del usuario si vienen en la respuesta
        if (data.user || data.usuario) {
            const userData = data.user || data.usuario;
            saveUserData({
                username: userData.username || userData.nombreUsuario,
                email: userData.email || userData.correo,
                role: userData.role || userData.rol,
                fullName: userData.fullName || userData.nombreCompleto,
                id: userData.id || userData.usuarioId
            });
        }

        return true;

    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

/**
 * Refrescar token (útil para tokens que expiran)
 * @returns {Promise<boolean>} - True si se refrescó correctamente
 */
async function refreshToken() {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.refresh}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        
        if (data.token) {
            const remember = !!localStorage.getItem('authToken');
            saveAuthToken(data.token, remember);
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error refrescando token:', error);
        return false;
    }
}

/**
 * Añadir token a las peticiones fetch
 * @param {string} url - URL de la petición
 * @param {object} options - Opciones de fetch
 * @returns {Promise<Response>} - Respuesta de fetch
 */
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
        throw new Error('No hay token de autenticación');
    }

    // Preparar headers
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si recibimos 401, el token expiró
        if (response.status === 401) {
            // Intentar refrescar el token
            const refreshed = await refreshToken();
            
            if (refreshed) {
                // Reintentar la petición con el nuevo token
                headers.Authorization = `Bearer ${getAuthToken()}`;
                return await fetch(url, {
                    ...options,
                    headers
                });
            } else {
                // No se pudo refrescar, cerrar sesión
                clearSession();
                window.location.href = '/login.html';
                throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
            }
        }

        return response;

    } catch (error) {
        throw error;
    }
}

/**
 * Hacer peticiones GET autenticadas
 * @param {string} url - URL del endpoint
 * @returns {Promise<any>} - Datos de la respuesta
 */
async function apiGet(url) {
    const response = await authenticatedFetch(url, {
        method: 'GET'
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
}

/**
 * Hacer peticiones POST autenticadas
 * @param {string} url - URL del endpoint
 * @param {object} data - Datos a enviar
 * @returns {Promise<any>} - Datos de la respuesta
 */
async function apiPost(url, data) {
    const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
}

/**
 * Hacer peticiones PUT autenticadas
 * @param {string} url - URL del endpoint
 * @param {object} data - Datos a enviar
 * @returns {Promise<any>} - Datos de la respuesta
 */
async function apiPut(url, data) {
    const response = await authenticatedFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
}

/**
 * Hacer peticiones DELETE autenticadas
 * @param {string} url - URL del endpoint
 * @returns {Promise<any>} - Datos de la respuesta
 */
async function apiDelete(url) {
    const response = await authenticatedFetch(url, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.auth = {
        // Configuración
        config: API_CONFIG,
        
        // Funciones básicas
        isAuthenticated,
        getAuthToken,
        saveAuthToken,
        saveUserData,
        getUserData,
        clearSession,
        logout,
        requireAuth,
        
        // Autenticación
        login,
        verifyToken,
        refreshToken,
        
        // Peticiones autenticadas
        authenticatedFetch,
        apiGet,
        apiPost,
        apiPut,
        apiDelete
    };
}
