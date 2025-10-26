# Sistema de Autenticación - Korex Dashboard

## 📁 Archivos Generados

1. **login.html / login-updated.html** - Página de inicio de sesión
2. **index-updated.html** - Dashboard actualizado con menú de usuario
3. **auth.js** - Sistema de autenticación centralizado

## 🚀 Instrucciones de Integración

### Paso 1: Estructura de archivos

Coloca los archivos en tu proyecto de la siguiente manera:

```
E:\User\Korex\dashboard\dashboard-renni\
├── index.html (reemplazar con index-updated.html)
├── login.html (nuevo archivo)
├── css/
│   ├── output.css
│   └── styles.css
└── js/
    ├── auth.js (nuevo archivo)
    ├── dashboard.js
    ├── kpis.js
    └── utils.js
```

### Paso 2: Agregar auth.js al index.html

En tu `index.html` actualizado, asegúrate de incluir auth.js **antes** de los otros scripts:

```html
<!-- Agregar antes de los otros scripts -->
<script src="/js/auth.js"></script>
<script src="/js/utils.js"></script>
<script src="/js/kpis.js"></script>
<script src="/js/dashboard.js"></script>
```

### Paso 3: Configurar el Backend (API)

El sistema espera los siguientes endpoints en tu API:

#### 1. Login Endpoint

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "usuario",
  "password": "contraseña",
  "remember": true
}
```

**Response exitosa:**
```json
{
  "token": "jwt_token_aqui",
  "user": {
    "username": "usuario",
    "email": "usuario@korex.com",
    "role": "admin"
  }
}
```

**Response error:**
```json
{
  "message": "Credenciales inválidas"
}
```

#### 2. Verify Token Endpoint (Opcional pero recomendado)

```
GET /api/auth/verify
Headers: Authorization: Bearer {token}
```

**Response exitosa:**
```json
{
  "valid": true,
  "user": {
    "username": "usuario",
    "email": "usuario@korex.com"
  }
}
```

### Paso 4: Proteger las peticiones existentes

Si ya tienes peticiones en `dashboard.js` o `kpis.js`, actualízalas para incluir el token:

**Antes:**
```javascript
const response = await fetch('/api/transactions/today');
```

**Después:**
```javascript
const response = await window.auth.authenticatedFetch('/api/transactions/today');
```

O manualmente:
```javascript
const token = window.auth.getAuthToken();
const response = await fetch('/api/transactions/today', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

## 🎨 Características del Sistema

### Página de Login
- ✅ Diseño concordante con el dashboard
- ✅ Modo oscuro/claro
- ✅ Mostrar/ocultar contraseña
- ✅ Recordar sesión
- ✅ Mensajes de error animados
- ✅ Estado de carga
- ✅ Validación de formulario

### Dashboard con Autenticación
- ✅ Menú de usuario en el header
- ✅ Dropdown con opciones (Perfil, Configuración, Logout)
- ✅ Avatar con inicial del usuario
- ✅ Protección automática de ruta
- ✅ Cierre de sesión con confirmación

### Sistema auth.js
- ✅ Manejo centralizado de tokens
- ✅ LocalStorage vs SessionStorage
- ✅ Funciones de utilidad
- ✅ Peticiones autenticadas
- ✅ Verificación de tokens

## 🔧 Funciones Disponibles en auth.js

```javascript
// Verificar autenticación
window.auth.isAuthenticated() // returns boolean

// Obtener token
window.auth.getAuthToken() // returns string|null

// Guardar token
window.auth.saveAuthToken(token, remember)

// Guardar datos de usuario
window.auth.saveUserData(userData)

// Obtener datos de usuario
window.auth.getUserData() // returns object|null

// Cerrar sesión
window.auth.logout()

// Requerir autenticación (redirige si no autenticado)
window.auth.requireAuth()

// Login
await window.auth.login(username, password, remember)

// Verificar token
await window.auth.verifyToken()

// Fetch autenticado
await window.auth.authenticatedFetch(url, options)
```

## 🎯 Flujo de Autenticación

1. Usuario visita `/index.html`
2. Sistema verifica si hay token (`checkAuth()`)
3. Si NO hay token → Redirige a `/login.html`
4. Si SÍ hay token → Carga el dashboard y datos del usuario
5. Usuario hace login → Token se guarda → Redirige a dashboard
6. Usuario hace logout → Token se elimina → Redirige a login

## 🔐 Seguridad

### Tokens
- Los tokens se guardan en `localStorage` (si "recordar sesión") o `sessionStorage`
- Nunca expongas los tokens en logs o console
- Usa HTTPS en producción

### Validación Backend
- **IMPORTANTE**: La validación real debe hacerse en el backend
- El frontend solo maneja la UI y flujo de navegación
- Siempre verifica el token en cada petición del backend

## 📝 Personalización

### Cambiar textos
Edita los textos en `login.html`:
```html
<h1>Bienvenido a Korex</h1>
<p>Dashboard de Ventas - Inicia sesión para continuar</p>
```

### Cambiar colores
Los colores están sincronizados con tu dashboard actual, pero puedes modificarlos en los estilos CSS.

### Agregar campos adicionales
Para agregar más campos al login (ej: empresa, código):

1. Agrega el input en el formulario HTML
2. Captura el valor en el submit del form
3. Envíalo en el body del POST a `/api/auth/login`

### Personalizar menú de usuario
En `index-updated.html`, busca la sección `<!-- User Menu -->` y agrega más items al dropdown:

```html
<a href="#" class="dropdown-item">
    <span data-lucide="tu-icono" class="w-4 h-4"></span>
    <span>Tu Opción</span>
</a>
```

## 🧪 Testing sin Backend

Si aún no tienes el backend listo, puedes simular el login modificando temporalmente el código:

En `login-updated.html`, reemplaza el bloque `try/catch` del submit con:

```javascript
try {
    // SIMULACIÓN - Remover en producción
    const mockData = {
        token: 'mock_token_12345',
        user: {
            username: username,
            email: `${username}@korex.com`
        }
    };
    
    window.auth.saveAuthToken(mockData.token, remember);
    window.auth.saveUserData(mockData.user);
    
    window.location.href = '/index.html';
} catch (error) {
    // ...
}
```

## 🐛 Solución de Problemas

### El login no redirige
- Verifica que la ruta de redirección sea correcta: `/index.html`
- Revisa la consola del navegador para errores
- Verifica que auth.js se esté cargando correctamente

### El token no se guarda
- Verifica que localStorage esté habilitado en el navegador
- Revisa que no haya errores en la consola
- Comprueba que auth.js esté incluido antes del script de login

### Error CORS en el login
- Configura CORS en tu backend para aceptar peticiones del frontend
- Asegúrate de que la URL del API sea correcta

### El menú de usuario no se muestra
- Verifica que Lucide icons esté cargando: `lucide.createIcons()`
- Revisa que los datos del usuario estén en localStorage
- Comprueba la consola del navegador

## 📞 Soporte

Si tienes problemas con la integración, revisa:
1. Consola del navegador (F12)
2. Network tab para ver las peticiones
3. Application tab → Storage para ver tokens guardados

## ✅ Checklist de Integración

- [ ] Archivos colocados en las rutas correctas
- [ ] auth.js incluido en index.html y login.html
- [ ] Backend configurado con endpoints de login
- [ ] Probado el flujo completo de login
- [ ] Probado el flujo de logout
- [ ] Verificado que las rutas estén protegidas
- [ ] Tokens guardándose correctamente
- [ ] Menú de usuario funcionando
- [ ] Modo oscuro funcionando en ambas páginas

¡Listo! Tu sistema de autenticación está completo y listo para usar. 🎉
