// perfil.js - Lógica de la página de perfil

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔵 perfil.js cargado');

    // Verificar login
    if (!window.auth?.isAuthenticated()) {
        console.error('❌ No autenticado, redirigiendo a login');
        window.location.replace('/login.html');
        return;
    }

    const user = window.auth.getUserData();
    if (!user) {
        console.error('❌ No se pudo obtener userData');
        window.location.replace('/login.html');
        return;
    }

    console.log('✅ Usuario autenticado:', user.email);

    // Rellenar info de usuario
    const fullName = user.fullName || user.email.split('@')[0];
    const email = user.email;
    const estado = user.estado || 'A';
    const ultimoAcceso = user.ultimoAccesoFormatted || user.ultimoAcceso || '-';

    // Iniciales (usar las del auth.js si existen, sino calcular)
    const initials = user.initials || window.auth.getUserInitials(fullName);

    // Header
    setText('user-display-name', fullName);
    setText('user-display-email', email);
    setText('dropdown-user-name', fullName);
    setText('dropdown-user-email', email);

    // Avatar en header
    const avatarInitials = document.getElementById('profile-avatar-initials');
    if (avatarInitials) {
        avatarInitials.textContent = initials;
    }

    // Perfil principal
    setText('profile-fullname', fullName);
    setText('profile-email', email);
    setText('profile-status', estado === 'A' ? 'Activo' : estado);
    setText('profile-last-access', ultimoAcceso);
    setText('profile-initials', initials);

    console.log('📝 Datos de perfil rellenados:', { fullName, email, initials, ultimoAcceso });

    // Cargar DVRs y suscripciones
    await loadDvrPayments();
});

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    } else {
        console.warn(`⚠️ Elemento #${id} no encontrado`);
    }
}

async function loadDvrPayments() {
    const container = document.getElementById('dvr-list-container');
    if (!container) {
        console.warn('⚠️ #dvr-list-container no encontrado');
        return;
    }

    // Skeleton mientras carga
    container.innerHTML = Array(3).fill().map(() => `
        <div class="bg-gray-200 rounded-xl p-4 animate-pulse">
            <div class="flex items-center space-x-3 mb-3">
                <div class="w-4 h-4 bg-gray-300 rounded-full"></div>
                <div class="flex-1">
                    <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
            </div>
            <div class="h-10 bg-gray-300 rounded-lg w-full"></div>
        </div>
    `).join('');

    try {
        console.log('📡 Fetching DVR payments...');
        const response = await window.auth.fetchDvrPayments();
        const success = response.Success || response.success;

        if (!success) {
            throw new Error(response.Message || response.message || 'Error obteniendo DVRs');
        }

        const data = response.Data || response.data || [];
        const dvrList = Array.isArray(data) ? data : [];

        console.log('✅ DVRs recibidos:', dvrList.length);

        if (dvrList.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-6 text-gray-500">
                    <i class="fas fa-video-slash text-3xl mb-2"></i>
                    <p>No se encontraron DVRs asociados a este usuario.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = dvrList.map(createDvrCard).join('');
    } catch (error) {
        console.error('❌ Error cargando DVR payments en perfil:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-6">
                <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-2"></i>
                <p class="text-red-500 mb-1">Error al cargar DVRs y suscripciones</p>
                <p class="text-xs text-gray-500">${error.message}</p>
                <button 
                    onclick="loadDvrPayments()" 
                    class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                >
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;
    }
}

function createDvrCard(dvr) {
    const nombre = (dvr['Nombre DVR'] || dvr['NombreDVR'] || dvr.key || '').trim();
    const marca = dvr.Marca || 'N/A';
    const ip = dvr.Ip || 'N/A';
    const montoPago = dvr['Monto Pago'] ?? dvr.MontoPago ?? 0;
    const linkPago = dvr['Link Pago'] || dvr.LinkPago || null;
    const idDispositivo = dvr['ID Dispositivo'] || dvr.IdDispositivo || dvr.ID || '';

    const tieneDeuda = Number(montoPago) > 0;

    const colorCircle = tieneDeuda ? 'bg-red-500' : 'bg-green-500';
    const textStatus = tieneDeuda ? 'Con deuda' : 'Sin deuda';
    const statusDetail = tieneDeuda ? `Deuda: $${formatNumber(montoPago)}` : 'Pago al día';

    const buttonClass = tieneDeuda
        ? 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
        : 'bg-green-500 text-white opacity-75 cursor-default';

    const buttonText = tieneDeuda ? 'Pagar Suscripción' : 'Sin deuda';
    const buttonIcon = tieneDeuda ? 'fa-credit-card' : 'fa-check-circle';

    const hasLink = !!linkPago && tieneDeuda;

    return `
        <div class="glass-effect rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-4 h-4 rounded-full ${colorCircle} shadow-lg"></div>
                    <div>
                        <h3 class="font-bold text-gray-800">
                            ${nombre || 'DVR sin nombre'}
                        </h3>
                        <p class="text-xs text-gray-500">
                            ${marca} • ${ip}
                        </p>
                    </div>
                </div>
            </div>

            <div class="text-sm text-gray-600 mb-3 space-y-1">
                <p class="font-semibold flex items-center">
                    <i class="fas ${tieneDeuda ? 'fa-exclamation-circle text-red-500' : 'fa-check-circle text-green-500'} mr-2"></i>
                    ${textStatus}
                </p>
                <p class="text-xs text-gray-500">${statusDetail}</p>
                ${idDispositivo ? `<p class="text-xs mt-1 text-gray-400 truncate" title="${idDispositivo}">ID: ${idDispositivo}</p>` : ''}
            </div>

            <div class="mt-auto pt-2">
                <button
                    class="w-full ${buttonClass} px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200"
                    ${hasLink ? `onclick="window.open('${linkPago}', '_blank')"` : 'disabled'}
                >
                    <i class="fas ${buttonIcon}"></i>
                    <span>${buttonText}</span>
                </button>
            </div>
        </div>
    `;
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-CL').format(num || 0);
}

// Hacer loadDvrPayments global para el botón de reintentar
window.loadDvrPayments = loadDvrPayments;