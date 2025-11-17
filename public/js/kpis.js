// kpis.js - Actualización de KPIs en el dashboard

function updateKPIsDisplay(kpis) {
    const container = document.getElementById('kpis-container');
    if (!container) return;

    container.innerHTML = `
        <!-- Total Transacciones -->
        <div class="kpi-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div class="flex items-center justify-between mb-2">
                <i class="fas fa-receipt text-3xl opacity-80"></i>
                <span class="text-sm font-semibold opacity-90">Total</span>
            </div>
            <div class="text-3xl font-bold mb-1">${kpis.total}</div>
            <div class="text-xs opacity-80">Transacciones</div>
        </div>

        <!-- Transacciones Normales -->
        <div class="kpi-card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div class="flex items-center justify-between mb-2">
                <i class="fas fa-check-circle text-3xl opacity-80"></i>
                <span class="text-sm font-semibold opacity-90">Normal</span>
            </div>
            <div class="text-3xl font-bold mb-1">${kpis.normal}</div>
            <div class="text-xs opacity-80">
                ${kpis.total > 0 ? ((kpis.normal / kpis.total) * 100).toFixed(1) : 0}% del total
            </div>
        </div>

        <!-- Anomalías -->
        <div class="kpi-card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div class="flex items-center justify-between mb-2">
                <i class="fas fa-exclamation-triangle text-3xl opacity-80"></i>
                <span class="text-sm font-semibold opacity-90">Anomalías</span>
            </div>
            <div class="text-3xl font-bold mb-1">${kpis.anomalias}</div>
            <div class="text-xs opacity-80">
                ${kpis.total > 0 ? ((kpis.anomalias / kpis.total) * 100).toFixed(1) : 0}% del total
            </div>
        </div>

        <!-- Duración Promedio -->
        <div class="kpi-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div class="flex items-center justify-between mb-2">
                <i class="fas fa-clock text-3xl opacity-80"></i>
                <span class="text-sm font-semibold opacity-90">Duración</span>
            </div>
            <div class="text-3xl font-bold mb-1">${kpis.avgDuration.toFixed(1)}s</div>
            <div class="text-xs opacity-80">Promedio</div>
        </div>

        <!-- Métodos de Pago -->
        <div class="kpi-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div class="flex items-center justify-between mb-2">
                <i class="fas fa-credit-card text-3xl opacity-80"></i>
                <span class="text-sm font-semibold opacity-90">Pagos</span>
            </div>
            <div class="text-sm mb-1">
                <div class="flex justify-between">
                    <span>💳 Tarjeta:</span>
                    <span class="font-bold">${kpis.pagoTarjeta}</span>
                </div>
                <div class="flex justify-between">
                    <span>💰 Efectivo:</span>
                    <span class="font-bold">${kpis.pagoEfectivo}</span>
                </div>
                <div class="flex justify-between">
                    <span>❓ Otros:</span>
                    <span class="font-bold">${kpis.otros}</span>
                </div>
            </div>
        </div>
    `;
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-semibold animate-fade-in`;
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    toast.classList.add(colors[type] || colors.info);
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Exportar funciones
if (typeof window !== 'undefined') {
    window.updateKPIsDisplay = updateKPIsDisplay;
    window.showToast = showToast;
}