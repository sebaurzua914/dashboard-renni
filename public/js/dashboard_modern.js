// dashboard_modern.js - Dashboard moderno con KPIs reales de Summary API

class ModernDashboard {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.kpiData = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.isLoading = false;

        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Dashboard Moderno...');

        // Verificar autenticación
        if (!window.auth?.isAuthenticated()) {
            console.error('❌ No autenticado, redirigiendo...');
            window.location.replace('/login.html');
            return;
        }

        const userData = window.auth.getUserData();
        console.log('✅ Usuario autenticado:', userData.email);

        this.setupUI(userData);
        this.setupEventListeners();
        
        // Cargar datos iniciales
        await this.loadAllData();
    }

    setupUI(userData) {
        // Actualizar información del usuario en el header
        const userInfoElements = [
            document.getElementById('user-info'),
            document.querySelector('[data-user-name]'),
            document.querySelector('.user-display-name')
        ];

        userInfoElements.forEach(element => {
            if (element) {
                element.textContent = userData.fullName || userData.email.split('@')[0];
            }
        });

        // Configurar fecha inicial
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.value = this.selectedDate;
        }

        // Ocultar overlay de carga
        this.hideGlobalLoading();
    }

    setupEventListeners() {
        // Selector de fecha
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.loadAllData();
            });
        }

        // Filtros de búsqueda
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.applyFilters();
            }, 300));
        }

        // Filtros de tipo y pago
        ['type-filter', 'payment-filter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        // Botones de paginación
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

        // Modal de transacciones
        this.setupModalHandlers();

        // Botón de actualización
        const refreshBtn = document.getElementById('refresh-button');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAllData());
        }

        // Botón de logout
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Seguro que deseas cerrar sesión?')) {
                    window.auth.logout();
                }
            });
        }
    }

    setupModalHandlers() {
        const modal = document.getElementById('transaction-modal');
        const closeModal = document.getElementById('close-modal');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        // ESC key para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    async loadAllData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📊 Cargando datos para fecha:', this.selectedDate);

        try {
            // Mostrar indicadores de carga
            this.showLoadingStates();

            // Cargar KPIs y transacciones en paralelo
            const [kpiResponse, logsResponse] = await Promise.all([
                this.loadKPIs(),
                this.loadTransactions()
            ]);

            console.log('✅ Datos cargados exitosamente');
            
            // Mostrar notificación de éxito
            this.showToast(`Datos actualizados para ${this.formatDate(this.selectedDate)}`, 'success');

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showToast('Error al cargar los datos', 'error');
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
            this.hideLoadingStates();
        }
    }

    async loadKPIs() {
        try {
            console.log('📈 Cargando KPIs desde Summary API...');
            
            const response = await window.auth.fetchTransactionSummary(this.selectedDate);
            
            if (!response?.Success) {
                throw new Error(response?.Message || 'Error obteniendo KPIs');
            }

            this.kpiData = response.Data;
            console.log('📊 KPIs cargados:', this.kpiData);
            
            this.renderKPIs();
            return response;

        } catch (error) {
            console.error('❌ Error cargando KPIs:', error);
            this.renderKPIsError();
            throw error;
        }
    }

    async loadTransactions() {
        try {
            console.log('📋 Cargando transacciones...');
            
            const response = await window.auth.fetchTransactionLogs(this.selectedDate);
            
            if (!response?.Success) {
                throw new Error(response?.Message || 'Error obteniendo transacciones');
            }

            this.transactions = window.auth.processTransactionData(response);
            this.filteredTransactions = [...this.transactions];
            
            console.log('📋 Transacciones cargadas:', this.transactions.length);
            
            this.currentPage = 1;
            this.renderTransactions();
            return response;

        } catch (error) {
            console.error('❌ Error cargando transacciones:', error);
            this.renderTransactionsError(error.message);
            throw error;
        }
    }

    renderKPIs() {
        if (!this.kpiData) {
            this.renderKPIsEmpty();
            return;
        }

        const kpisContainer = document.getElementById('kpis-container') || 
                            document.querySelector('.kpis-grid') ||
                            document.querySelector('[data-kpis]');

        if (!kpisContainer) {
            console.warn('⚠️ Contenedor de KPIs no encontrado');
            return;
        }

        const kpis = [
            {
                title: 'Total Transacciones',
                value: this.formatNumber(this.kpiData.TotalTransactions || 0),
                icon: 'fas fa-exchange-alt',
                color: 'blue',
                bgGradient: 'from-blue-500 to-blue-600',
                change: null,
                description: 'Total de transacciones registradas'
            },
            {
                title: 'Transacciones Normales',
                value: this.formatNumber(this.kpiData.TotalNormal || 0),
                icon: 'fas fa-check-circle',
                color: 'green',
                bgGradient: 'from-green-500 to-green-600',
                change: this.calculatePercentage(this.kpiData.TotalNormal, this.kpiData.TotalTransactions),
                description: 'Transacciones sin anomalías'
            },
            {
                title: 'Anomalías Detectadas',
                value: this.formatNumber(this.kpiData.TotalAnomalies || 0),
                icon: 'fas fa-exclamation-triangle',
                color: 'red',
                bgGradient: 'from-red-500 to-red-600',
                change: this.calculatePercentage(this.kpiData.TotalAnomalies, this.kpiData.TotalTransactions),
                description: 'Transacciones con patrones anómalos'
            },
            {
                title: 'Duración Promedio',
                value: `${(this.kpiData.AvgDuration || 0).toFixed(1)}s`,
                icon: 'fas fa-clock',
                color: 'purple',
                bgGradient: 'from-purple-500 to-purple-600',
                change: null,
                description: 'Tiempo promedio por transacción'
            },
            {
                title: 'Pagos con Tarjeta',
                value: this.formatNumber(this.kpiData.TotalTarjeta || 0),
                icon: 'fas fa-credit-card',
                color: 'indigo',
                bgGradient: 'from-indigo-500 to-indigo-600',
                change: this.calculatePercentage(this.kpiData.TotalTarjeta, this.kpiData.TotalPagos),
                description: 'Pagos realizados con tarjeta'
            },
            {
                title: 'Pagos en Efectivo',
                value: this.formatNumber(this.kpiData.TotalEfectivo || 0),
                icon: 'fas fa-money-bill-wave',
                color: 'yellow',
                bgGradient: 'from-yellow-500 to-yellow-600',
                change: this.calculatePercentage(this.kpiData.TotalEfectivo, this.kpiData.TotalPagos),
                description: 'Pagos realizados en efectivo'
            }
        ];

        kpisContainer.innerHTML = kpis.map(kpi => this.createKPICard(kpi)).join('');
        
        // Animar las tarjetas
        this.animateKPICards();
    }

    createKPICard(kpi) {
        const changeHtml = kpi.change !== null ? `
            <div class="flex items-center mt-2">
                <span class="text-xs font-medium text-white bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    ${kpi.change}%
                </span>
            </div>
        ` : '';

        return `
            <div class="kpi-card bg-gradient-to-br ${kpi.bgGradient} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <div class="flex items-center justify-between mb-4">
                    <div class="p-3 bg-white bg-opacity-20 rounded-lg">
                        <i class="${kpi.icon} text-2xl"></i>
                    </div>
                </div>
                
                <div class="mb-2">
                    <h3 class="text-sm font-medium text-white text-opacity-90 mb-1">${kpi.title}</h3>
                    <p class="text-3xl font-bold mb-1">${kpi.value}</p>
                    <p class="text-xs text-white text-opacity-75">${kpi.description}</p>
                </div>
                
                ${changeHtml}
            </div>
        `;
    }

    renderTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        if (this.filteredTransactions.length === 0) {
            this.renderTransactionsEmpty();
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageTransactions = this.filteredTransactions.slice(start, end);

        container.innerHTML = pageTransactions.map(t => this.createTransactionCard(t)).join('');

        // Agregar event listeners
        pageTransactions.forEach(t => {
            const card = document.getElementById(`transaction-${t.id}`);
            if (card) {
                card.addEventListener('click', () => this.showTransactionDetail(t));
            }
        });

        this.updatePagination();
        this.animateTransactionCards();
    }

    createTransactionCard(transaction) {
        const category = this.getTransactionCategory(transaction.type);
        const icon = this.getTransactionIcon(transaction.type);
        const paymentIcon = this.getPaymentIcon(transaction.paymentMethod);
        const colorClass = this.getTransactionColorClass(category);

        return `
            <div id="transaction-${transaction.id}" 
                 class="transaction-card bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] ${colorClass}">
                
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="p-2 rounded-lg ${this.getIconBgClass(category)}">
                            <i class="${icon} text-white text-lg"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100">
                                ID: ${transaction.id}
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                ${transaction.nombreDvr} • Cámara ${transaction.numeroCamara}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getBadgeClass(category)}">
                            ${transaction.type}
                        </span>
                        <p class="text-xs text-gray-500 mt-1">
                            ${new Date(transaction.startTime).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-user text-blue-600 text-sm"></i>
                            <span class="text-xs text-gray-600 dark:text-gray-300">Cliente</span>
                        </div>
                        <p class="font-bold text-blue-600 dark:text-blue-400">#${transaction.clientId}</p>
                    </div>
                    <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-user-tie text-purple-600 text-sm"></i>
                            <span class="text-xs text-gray-600 dark:text-gray-300">Cajero</span>
                        </div>
                        <p class="font-bold text-purple-600 dark:text-purple-400">#${transaction.cashierId}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="${paymentIcon} text-gray-600"></i>
                        <span class="text-sm text-gray-700 dark:text-gray-300">${transaction.paymentMethod}</span>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-500">
                        <i class="fas fa-stopwatch"></i>
                        <span>${transaction.duration.toFixed(1)}s</span>
                    </div>
                </div>

                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 italic truncate">
                    ${transaction.reason}
                </div>
            </div>
        `;
    }

    // Métodos auxiliares para estilos y categorización
    getTransactionCategory(type) {
        if (type === 'Normal') return 'normal';
        if (['Patrón No Reconocido', 'Transacción Sin Método de Pago', 'Caja Abierta Sin Pago'].includes(type)) {
            return 'anomalous';
        }
        return 'unknown';
    }

    getTransactionIcon(type) {
        switch (type) {
            case 'Normal': return 'fas fa-check-circle';
            case 'Patrón No Reconocido': return 'fas fa-question-circle';
            case 'Transacción Sin Método de Pago': return 'fas fa-exclamation-circle';
            case 'Caja Abierta Sin Pago': return 'fas fa-unlock-alt';
            default: return 'fas fa-circle';
        }
    }

    getPaymentIcon(method) {
        switch (method) {
            case 'pago_tarjeta': return 'fas fa-credit-card';
            case 'pago_efectivo': return 'fas fa-money-bill-wave';
            case 'caja_abierta': return 'fas fa-cash-register';
            case 'dinero_mano': return 'fas fa-hand-holding-usd';
            default: return 'fas fa-question';
        }
    }

    getTransactionColorClass(category) {
        return {
            normal: 'border-l-4 border-green-500',
            anomalous: 'border-l-4 border-red-500',
            unknown: 'border-l-4 border-yellow-500'
        }[category] || 'border-l-4 border-gray-500';
    }

    getIconBgClass(category) {
        return {
            normal: 'bg-green-500',
            anomalous: 'bg-red-500',
            unknown: 'bg-yellow-500'
        }[category] || 'bg-gray-500';
    }

    getBadgeClass(category) {
        return {
            normal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            anomalous: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            unknown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }

    // Métodos de utilidad
    formatNumber(num) {
        return new Intl.NumberFormat('es-CL').format(num || 0);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    calculatePercentage(part, total) {
        if (!total || total === 0) return '0';
        return ((part / total) * 100).toFixed(1);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Métodos de UI y UX
    showToast(message, type = 'info') {
        // Implementar sistema de notificaciones toast
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Crear elemento toast si no existe un sistema
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        const toast = this.createToastElement(message, type);
        
        toastContainer.appendChild(toast);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        }[type] || 'bg-gray-500';

        toast.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;
        toast.textContent = message;

        // Animar entrada
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-100%)';
        });

        return toast;
    }

    animateKPICards() {
        const cards = document.querySelectorAll('.kpi-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    animateTransactionCards() {
        const cards = document.querySelectorAll('.transaction-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }

    showLoadingStates() {
        // Mostrar skeleton loaders
        this.showKPIsSkeleton();
        this.showTransactionsSkeleton();
    }

    hideLoadingStates() {
        // Remover skeleton loaders se hace automáticamente al renderizar contenido real
    }

    showKPIsSkeleton() {
        const container = document.getElementById('kpis-container');
        if (!container) return;

        container.innerHTML = Array(6).fill().map(() => `
            <div class="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 animate-pulse">
                <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
                <div class="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            </div>
        `).join('');
    }

    showTransactionsSkeleton() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        container.innerHTML = Array(5).fill().map(() => `
            <div class="bg-gray-200 dark:bg-gray-700 rounded-xl p-4 animate-pulse">
                <div class="flex items-center space-x-3 mb-3">
                    <div class="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                </div>
                <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            </div>
        `).join('');
    }

    hideGlobalLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Placeholder methods for missing functionality (implement as needed)
    applyFilters() {
        // Implementar lógica de filtros
        console.log('Aplicando filtros...');
        this.renderTransactions();
    }

    showTransactionDetail(transaction) {
        console.log('Mostrando detalle de transacción:', transaction.id);
        // Implementar modal de detalle
    }

    closeModal() {
        const modal = document.getElementById('transaction-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    updatePagination() {
        // Implementar lógica de paginación
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTransactions();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTransactions();
        }
    }

    renderKPIsEmpty() {
        const container = document.getElementById('kpis-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-chart-bar text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500">No hay datos de KPIs disponibles para esta fecha</p>
                </div>
            `;
        }
    }

    renderKPIsError() {
        const container = document.getElementById('kpis-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-red-500">Error al cargar los KPIs</p>
                </div>
            `;
        }
    }

    renderTransactionsEmpty() {
        const container = document.getElementById('transactions-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500">No hay transacciones para mostrar</p>
                </div>
            `;
        }
    }

    renderTransactionsError(message) {
        const container = document.getElementById('transactions-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-red-500 mb-4">Error al cargar transacciones</p>
                    <p class="text-gray-500 text-sm">${message}</p>
                    <button onclick="window.modernDashboard.loadAllData()" 
                            class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    showErrorState(message) {
        console.error('Error general:', message);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.auth?.isAuthenticated()) {
        window.modernDashboard = new ModernDashboard();
    } else {
        console.error('❌ No autenticado');
        window.location.replace('/login.html');
    }
});
