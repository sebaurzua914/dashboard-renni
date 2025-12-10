// dashboard_modern.js - Dashboard moderno con KPIs reales de Summary API

class ModernDashboard {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.kpiData = null;
        this.dvrList = [];
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
        this.setupProfileHeader(userData);
        this.setupEventListeners();
        this.setupProfileDropdown();
        
        // Cargar datos iniciales
        await this.loadAllData();
    }

    setupUI(userData) {
        // Configurar fecha inicial
        const datePickers = document.querySelectorAll('#date-picker, #date-picker-mobile');
        datePickers.forEach(picker => {
            if (picker) {
                picker.value = this.selectedDate;
            }
        });

        // Ocultar overlay de carga
        this.hideGlobalLoading();
    }

    setupProfileHeader(userData) {
        const fullName = userData.fullName || userData.email.split('@')[0];
        const email = userData.email;

        // Calcular iniciales
        const initials = fullName
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        console.log('👤 Configurando perfil:', { fullName, email, initials });

        // Actualizar nombre en el botón del perfil
        const displayNameEl = document.getElementById('user-display-name');
        if (displayNameEl) {
            displayNameEl.textContent = fullName;
        }

        // Actualizar email en el botón del perfil
        const displayEmailEl = document.getElementById('user-display-email');
        if (displayEmailEl) {
            displayEmailEl.textContent = email;
        }

        // Actualizar nombre en el dropdown
        const dropdownNameEl = document.getElementById('dropdown-user-name');
        if (dropdownNameEl) {
            dropdownNameEl.textContent = fullName;
        }

        // Actualizar email en el dropdown
        const dropdownEmailEl = document.getElementById('dropdown-user-email');
        if (dropdownEmailEl) {
            dropdownEmailEl.textContent = email;
        }

        // Actualizar avatar con iniciales
        const avatarEl = document.getElementById('profile-avatar-initials');
        if (avatarEl) {
            avatarEl.textContent = initials;
        }

        console.log('✅ Perfil configurado correctamente');
    }

    setupProfileDropdown() {
        const profileButton = document.getElementById('profile-button');
        const profileDropdown = document.getElementById('profile-dropdown');

        console.log('🔧 Configurando dropdown del perfil...');
        console.log('profileButton:', !!profileButton, 'profileDropdown:', !!profileDropdown);

        if (profileButton && profileDropdown) {
            // Toggle dropdown al hacer click en el botón
            profileButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Click en profile-button (dashboard)');
                profileDropdown.classList.toggle('show');
                console.log('🔄 Clase show:', profileDropdown.classList.contains('show'));
            });

            // Cerrar dropdown al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!profileButton.contains(e.target) && !profileDropdown.contains(e.target)) {
                    if (profileDropdown.classList.contains('show')) {
                        console.log('⬅️ Click fuera, cerrando dropdown');
                        profileDropdown.classList.remove('show');
                    }
                }
            });

            // Cerrar con ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && profileDropdown.classList.contains('show')) {
                    console.log('⬅️ ESC presionado, cerrando dropdown');
                    profileDropdown.classList.remove('show');
                }
            });

            console.log('✅ Dropdown configurado correctamente');
        } else {
            console.warn('⚠️ No se encontró profileButton o profileDropdown');
        }
    }

    setupEventListeners() {
        // Selector de fecha (puede haber múltiples)
        const datePickers = document.querySelectorAll('#date-picker, #date-picker-mobile');
        datePickers.forEach(picker => {
            if (picker) {
                picker.addEventListener('change', (e) => {
                    this.selectedDate = e.target.value;
                    // Sincronizar todos los date pickers
                    datePickers.forEach(p => p.value = this.selectedDate);
                    this.loadAllData();
                });
            }
        });

        // Filtros de búsqueda
        const searchInputs = document.querySelectorAll('#search-input');
        searchInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', this.debounce(() => {
                    this.applyFilters();
                }, 300));
            }
        });

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

        // Botones de actualización (desktop y mobile)
        const refreshBtns = document.querySelectorAll('#refresh-button, #refresh-button-mobile');
        refreshBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.loadAllData());
            }
        });

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

            // Cargar KPIs, transacciones y DVRs en paralelo
            const [kpiResponse, logsResponse, dvrResponse] = await Promise.all([
                this.loadKPIs(),
                this.loadTransactions(),
                this.loadDvrPayments()
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

    async loadDvrPayments() {
        try {
            console.log('💳 Cargando lista de DVR y pagos...');

            const response = await window.auth.fetchDvrPayments();
            
            const success = response.Success || response.success;
            if (!success) {
                throw new Error(response.Message || response.message || 'Error obteniendo DVRs');
            }

            const data = response.Data || response.data || [];
            this.dvrList = Array.isArray(data) ? data : [];

            console.log('💳 DVRs cargados:', this.dvrList.length);

            this.renderDvrList();
            return response;

        } catch (error) {
            console.error('❌ Error cargando DVR payments:', error);
            this.renderDvrListError(error.message);
        }
    }

    renderDvrList() {
        const container = document.getElementById('dvr-list-container');
        if (!container) {
            console.warn('⚠️ Contenedor DVR no encontrado');
            return;
        }

        if (!this.dvrList || this.dvrList.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-6 text-gray-500 dark:text-gray-400">
                    <i class="fas fa-video-slash text-3xl mb-2"></i>
                    <p>No se encontraron DVRs asociados a este usuario.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.dvrList.map(dvr => this.createDvrCard(dvr)).join('');
    }

    createDvrCard(dvr) {
        const nombre = (dvr['Nombre DVR'] || dvr['NombreDVR'] || dvr.key || '').trim();
        const marca = dvr.Marca || 'N/A';
        const ip = dvr.Ip || 'N/A';
        const montoPago = dvr['Monto Pago'] ?? dvr.MontoPago ?? 0;
        const linkPago = dvr['Link Pago'] || dvr.LinkPago || null;
        const idDispositivo = dvr['ID Dispositivo'] || dvr.IdDispositivo || dvr.ID || '';

        const tieneDeuda = Number(montoPago) > 0;

        const colorCircle = tieneDeuda ? 'bg-red-500' : 'bg-green-500';
        const textStatus = tieneDeuda ? 'Con deuda' : 'Sin deuda';
        const statusDetail = tieneDeuda ? `Deuda: $${this.formatNumber(montoPago)}` : 'Pago al día';

        const buttonClass = tieneDeuda
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white cursor-default opacity-75';

        const buttonText = tieneDeuda ? 'Pagar Suscripción' : 'Sin deuda';
        const buttonIcon = tieneDeuda ? 'fa-credit-card' : 'fa-check-circle';

        const hasLink = !!linkPago && tieneDeuda;

        return `
            <div class="glass-effect rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 rounded-full ${colorCircle} shadow-lg animate-pulse"></div>
                        <div>
                            <h3 class="font-bold text-gray-800 dark:text-gray-100">
                                ${nombre || 'DVR sin nombre'}
                            </h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                ${marca} • ${ip}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="text-sm text-gray-600 dark:text-gray-300 mb-3 space-y-1">
                    <p class="font-semibold flex items-center">
                        <i class="fas ${tieneDeuda ? 'fa-exclamation-circle text-red-500' : 'fa-check-circle text-green-500'} mr-2"></i>
                        ${textStatus}
                    </p>
                    <p class="text-xs text-gray-500">${statusDetail}</p>
                    ${idDispositivo ? `<p class="text-xs mt-1 text-gray-400 truncate" title="${idDispositivo}">ID: ${idDispositivo}</p>` : ''}
                </div>

                <div class="mt-auto pt-2">
                    <button
                        class="w-full ${buttonClass} px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${hasLink ? 'hover:scale-105' : ''}"
                        ${hasLink ? `onclick="window.open('${linkPago}', '_blank')"` : 'disabled'}
                    >
                        <i class="fas ${buttonIcon}"></i>
                        <span>${buttonText}</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderDvrListError(message) {
        const container = document.getElementById('dvr-list-container');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full text-center py-6">
                <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-2"></i>
                <p class="text-red-500 mb-1">Error al cargar DVRs</p>
                <p class="text-xs text-gray-500">${message}</p>
                <button 
                    onclick="window.modernDashboard.loadDvrPayments()" 
                    class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;
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

        const totalTransactions = this.kpiData.TotalTransactions || 0;
        const totalAnomalies = this.kpiData.TotalAnomalies || 0;
        const normalTransactions = Math.max(0, totalTransactions - totalAnomalies);

        const totalPagos = this.kpiData.TotalPagos || 0;
        const totalTarjeta = this.kpiData.TotalTarjeta || 0;
        const totalEfectivo = Math.max(0, totalPagos - totalTarjeta);

        const kpis = [
            {
                title: 'Total Transacciones',
                value: this.formatNumber(totalTransactions),
                icon: 'fas fa-exchange-alt',
                color: 'blue',
                bgGradient: 'from-blue-500 to-blue-600',
                change: null,
                description: 'Total de transacciones registradas',
                filter: 'all'
            },
            {
                title: 'Transacciones Normales',
                value: this.formatNumber(normalTransactions),
                icon: 'fas fa-check-circle',
                color: 'green',
                bgGradient: 'from-green-500 to-green-600',
                change: this.calculatePercentage(normalTransactions, totalTransactions),
                description: 'Transacciones sin anomalías',
                filter: 'normal'
            },
            {
                title: 'Anomalías Detectadas',
                value: this.formatNumber(totalAnomalies),
                icon: 'fas fa-exclamation-triangle',
                color: 'red',
                bgGradient: 'from-red-500 to-red-600',
                change: this.calculatePercentage(totalAnomalies, totalTransactions),
                description: 'Transacciones con patrones anómalos',
                filter: 'anomalous'
            },
            {
                title: 'Duración Promedio',
                value: `${(this.kpiData.AvgDuration || 0).toFixed(1)}s`,
                icon: 'fas fa-clock',
                color: 'purple',
                bgGradient: 'from-purple-500 to-purple-600',
                change: null,
                description: 'Tiempo promedio por transacción',
                filter: null
            },
            {
                title: 'Pagos con Tarjeta',
                value: this.formatNumber(totalTarjeta),
                icon: 'fas fa-credit-card',
                color: 'indigo',
                bgGradient: 'from-indigo-500 to-indigo-600',
                change: this.calculatePercentage(totalTarjeta, totalPagos),
                description: 'Pagos realizados con tarjeta',
                filter: 'tarjeta'
            },
            {
                title: 'Pagos en Efectivo',
                value: this.formatNumber(totalEfectivo),
                icon: 'fas fa-money-bill-wave',
                color: 'yellow',
                bgGradient: 'from-yellow-500 to-yellow-600',
                change: this.calculatePercentage(totalEfectivo, totalPagos),
                description: 'Pagos realizados en efectivo',
                filter: 'efectivo'
            }
        ];

        kpisContainer.innerHTML = kpis.map(kpi => this.createKPICard(kpi)).join('');
        
        this.setupKPIClickFilters(kpis);
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

        const clickableClass = kpi.filter ? 'cursor-pointer hover:scale-105' : '';
        const clickHint = kpi.filter ? `
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-filter text-white text-opacity-50 text-xs"></i>
            </div>
        ` : '';

        return `
            <div class="kpi-card group ${clickableClass} bg-gradient-to-br ${kpi.bgGradient} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 relative" 
                 data-filter="${kpi.filter || ''}" 
                 data-kpi-title="${kpi.title}"
                 ${kpi.filter ? 'title="Click para filtrar transacciones"' : ''}>
                
                ${clickHint}
                
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

    setupKPIClickFilters(kpis) {
        const kpiCards = document.querySelectorAll('.kpi-card[data-filter]');
        
        kpiCards.forEach((card, index) => {
            const filter = card.getAttribute('data-filter');
            if (filter && filter !== '') {
                card.addEventListener('click', () => {
                    this.applyKPIFilter(filter, kpis[index].title);
                });
            }
        });
    }

    applyKPIFilter(filterType, kpiTitle) {
        console.log('🎯 Aplicando filtro desde KPI:', filterType, kpiTitle);
        
        this.clearAllFilters();
        
        switch (filterType) {
            case 'all':
                this.filteredTransactions = [...this.transactions];
                break;
                
            case 'normal':
                this.filteredTransactions = this.transactions.filter(t => 
                    this.getTransactionCategory(t.type) === 'normal'
                );
                break;
                
            case 'anomalous':
                this.filteredTransactions = this.transactions.filter(t => 
                    this.getTransactionCategory(t.type) === 'anomalous'
                );
                break;
                
            case 'tarjeta':
                this.filteredTransactions = this.transactions.filter(t => 
                    t.paymentMethod === 'pago_tarjeta'
                );
                break;
                
            case 'efectivo':
                this.filteredTransactions = this.transactions.filter(t => 
                    t.paymentMethod !== 'pago_tarjeta' && t.paymentMethod
                );
                break;
                
            default:
                this.filteredTransactions = [...this.transactions];
        }
        
        this.currentPage = 1;
        this.renderTransactions();
        this.updateFilterUI(filterType);
        this.showToast(`Filtrado por: ${kpiTitle} (${this.filteredTransactions.length} resultados)`, 'info');
        this.scrollToTransactions();
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

    showTransactionDetail(transaction) {
        const modal = document.getElementById('transaction-modal');
        const content = document.getElementById('modal-content');

        if (!modal || !content) return;

        const category = this.getTransactionCategory(transaction.type);
        const icon = this.getTransactionIcon(transaction.type);
        const isAnomalous = category === 'anomalous';

        content.innerHTML = `
            <!-- Header con alerta visual para anomalías -->
            ${isAnomalous ? `
                <div class="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-red-400 rounded-lg animate-pulse">
                                <i class="fas fa-exclamation-triangle text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg">⚠️ ALERTA DETECTADA</h3>
                                <p class="text-red-100 text-sm">Esta transacción requiere atención inmediata</p>
                            </div>
                        </div>
                        <div class="text-2xl font-bold">#${transaction.id}</div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Información Principal - Optimizada para móviles -->
            <div class="space-y-4">
                <!-- ID y Estado - Destacados -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-600">
                        <div class="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-1 uppercase tracking-wide">ID Transacción</div>
                        <div class="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-100">${transaction.id}</div>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-600">
                        <div class="text-xs text-purple-600 dark:text-purple-300 font-semibold mb-1 uppercase tracking-wide">Estado</div>
                        <div class="text-lg sm:text-xl font-bold text-purple-800 dark:text-purple-100 flex items-center flex-wrap">
                            <i class="${icon} mr-2"></i>
                            <span class="break-words">${transaction.type}</span>
                        </div>
                    </div>
                </div>

                <!-- Participantes -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-xl border-2 border-green-200 dark:border-green-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="fas fa-user text-green-600 text-xs"></i>
                            <div class="text-xs text-green-600 dark:text-green-300 font-semibold uppercase tracking-wide">Cliente</div>
                        </div>
                        <div class="text-lg sm:text-xl font-bold text-green-800 dark:text-green-100">#${transaction.clientId}</div>
                    </div>
                    <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="fas fa-user-tie text-orange-600 text-xs"></i>
                            <div class="text-xs text-orange-600 dark:text-orange-300 font-semibold uppercase tracking-wide">Cajero</div>
                        </div>
                        <div class="text-lg sm:text-xl font-bold text-orange-800 dark:text-orange-100">#${transaction.cashierId}</div>
                    </div>
                </div>

                <!-- Pago y Duración -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800 p-4 rounded-xl border-2 border-cyan-200 dark:border-cyan-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="${this.getPaymentIcon(transaction.paymentMethod)} text-cyan-600 text-xs"></i>
                            <div class="text-xs text-cyan-600 dark:text-cyan-300 font-semibold uppercase tracking-wide">Método de Pago</div>
                        </div>
                        <div class="text-sm sm:text-lg font-bold text-cyan-800 dark:text-cyan-100 break-words">${transaction.paymentMethod}</div>
                    </div>
                    <div class="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 p-4 rounded-xl border-2 border-pink-200 dark:border-pink-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="fas fa-stopwatch text-pink-600 text-xs"></i>
                            <div class="text-xs text-pink-600 dark:text-pink-300 font-semibold uppercase tracking-wide">Duración</div>
                        </div>
                        <div class="text-lg sm:text-xl font-bold text-pink-800 dark:text-pink-100">${transaction.duration.toFixed(2)}s</div>
                    </div>
                </div>

                <!-- Horarios - Una sola columna en móviles -->
                <div class="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="fas fa-play text-indigo-600 text-xs"></i>
                            <div class="text-xs text-indigo-600 dark:text-indigo-300 font-semibold uppercase tracking-wide">Hora Inicio</div>
                        </div>
                        <div class="text-sm sm:text-lg font-bold text-indigo-800 dark:text-indigo-100">
                            ${new Date(transaction.startTime).toLocaleString('es-CL', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 p-4 rounded-xl border-2 border-red-200 dark:border-red-600">
                        <div class="flex items-center space-x-2 mb-1">
                            <i class="fas fa-stop text-red-600 text-xs"></i>
                            <div class="text-xs text-red-600 dark:text-red-300 font-semibold uppercase tracking-wide">Hora Fin</div>
                        </div>
                        <div class="text-sm sm:text-lg font-bold text-red-800 dark:text-red-100">
                            ${new Date(transaction.endTime).toLocaleString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric', 
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </div>
                    </div>
                </div>

                <!-- Dispositivo -->
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                    <div class="flex items-center space-x-2 mb-3">
                        <i class="fas fa-video text-gray-600 text-sm"></i>
                        <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold uppercase tracking-wide">Información del Dispositivo</div>
                    </div>
                    <div class="space-y-2 text-gray-800 dark:text-gray-100">
                        <div class="flex flex-col sm:flex-row sm:items-center text-sm">
                            <span class="font-semibold text-gray-600 dark:text-gray-400 w-20 shrink-0">DVR:</span>
                            <span class="font-medium break-words">${transaction.nombreDvr}</span>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center text-sm">
                            <span class="font-semibold text-gray-600 dark:text-gray-400 w-20 shrink-0">ID:</span>
                            <span class="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded break-all">${transaction.idDispositivo}</span>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center text-sm">
                            <span class="font-semibold text-gray-600 dark:text-gray-400 w-20 shrink-0">Cámara:</span>
                            <span class="font-medium">${transaction.numeroCamara}</span>
                        </div>
                    </div>
                </div>

                <!-- Eventos -->
                <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-4 rounded-xl border-2 border-yellow-200 dark:border-yellow-600">
                    <div class="flex items-center space-x-2 mb-3">
                        <i class="fas fa-list-ul text-yellow-600 text-sm"></i>
                        <div class="text-xs text-yellow-600 dark:text-yellow-300 font-semibold uppercase tracking-wide">Eventos Registrados</div>
                    </div>
                    <div class="text-yellow-800 dark:text-yellow-100 text-sm leading-relaxed break-words">${transaction.events}</div>
                </div>

                <!-- Razón - Destacada para anomalías -->
                <div class="bg-gradient-to-br ${isAnomalous ? 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 border-red-300 dark:border-red-600' : 'from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-600'} p-4 rounded-xl border-2">
                    <div class="flex items-center space-x-2 mb-3">
                        <i class="fas ${isAnomalous ? 'fa-exclamation-triangle text-red-600' : 'fa-info-circle text-blue-600'} text-sm"></i>
                        <div class="text-xs ${isAnomalous ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'} font-semibold uppercase tracking-wide">
                            ${isAnomalous ? 'Motivo de la Alerta' : 'Información Adicional'}
                        </div>
                    </div>
                    <div class="${isAnomalous ? 'text-red-800 dark:text-red-100 font-medium' : 'text-blue-800 dark:text-blue-100'} text-sm leading-relaxed break-words">
                        ${transaction.reason}
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
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

    closeModal() {
        const modal = document.getElementById('transaction-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

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

    showToast(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        const toast = this.createToastElement(message, type);
        
        toastContainer.appendChild(toast);
        
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
        this.showKPIsSkeleton();
        this.showTransactionsSkeleton();
        this.showDvrSkeleton();
    }

    hideLoadingStates() {
        // Se hace automáticamente al renderizar contenido real
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

    showDvrSkeleton() {
        const container = document.getElementById('dvr-list-container');
        if (!container) return;

        container.innerHTML = Array(3).fill().map(() => `
            <div class="bg-gray-200 dark:bg-gray-700 rounded-xl p-4 animate-pulse">
                <div class="flex items-center space-x-3 mb-3">
                    <div class="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                </div>
                <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg w-full"></div>
            </div>
        `).join('');
    }

    hideGlobalLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    applyFilters() {
        const searchInputs = document.querySelectorAll('#search-input');
        let searchTerm = '';
        searchInputs.forEach(input => {
            if (input && input.value) searchTerm = input.value.toLowerCase();
        });

        const typeFilter = document.getElementById('type-filter')?.value || '';
        const paymentFilter = document.getElementById('payment-filter')?.value || '';

        console.log('🔍 Aplicando filtros:', { searchTerm, typeFilter, paymentFilter });

        this.filteredTransactions = this.transactions.filter(t => {
            const matchesSearch = !searchTerm || 
                t.id.toString().includes(searchTerm) ||
                t.clientId?.toLowerCase().includes(searchTerm) ||
                t.cashierId?.toLowerCase().includes(searchTerm) ||
                t.nombreDvr?.toLowerCase().includes(searchTerm) ||
                t.reason?.toLowerCase().includes(searchTerm);

            let matchesType = true;
            if (typeFilter) {
                const category = this.getTransactionCategory(t.type);
                matchesType = category === typeFilter;
            }

            let matchesPayment = true;
            if (paymentFilter) {
                if (paymentFilter === 'pago_efectivo') {
                    matchesPayment = t.paymentMethod !== 'pago_tarjeta' && t.paymentMethod;
                } else {
                    matchesPayment = t.paymentMethod === paymentFilter;
                }
            }

            return matchesSearch && matchesType && matchesPayment;
        });

        this.currentPage = 1;
        this.renderTransactions();
        
        if (searchTerm || typeFilter || paymentFilter) {
            this.showToast(`${this.filteredTransactions.length} transacciones encontradas`, 'info');
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (pageInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredTransactions.length);
            
            pageInfo.textContent = totalPages > 0 ? 
                `Mostrando ${start}-${end} de ${this.filteredTransactions.length} transacciones` : 
                'No hay transacciones';
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.classList.toggle('opacity-50', this.currentPage <= 1);
            prevBtn.classList.toggle('cursor-not-allowed', this.currentPage <= 1);
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.classList.toggle('opacity-50', this.currentPage >= totalPages);
            nextBtn.classList.toggle('cursor-not-allowed', this.currentPage >= totalPages);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTransactions();
            this.scrollToTransactions();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTransactions();
            this.scrollToTransactions();
        }
    }

    clearAllFilters() {
        const searchInputs = document.querySelectorAll('#search-input');
        searchInputs.forEach(input => {
            if (input) input.value = '';
        });

        const typeFilter = document.getElementById('type-filter');
        const paymentFilter = document.getElementById('payment-filter');
        
        if (typeFilter) typeFilter.value = '';
        if (paymentFilter) paymentFilter.value = '';
    }

    updateFilterUI(filterType) {
        const typeFilter = document.getElementById('type-filter');
        const paymentFilter = document.getElementById('payment-filter');
        
        if (typeFilter) {
            switch (filterType) {
                case 'normal':
                    typeFilter.value = 'normal';
                    break;
                case 'anomalous':
                    typeFilter.value = 'anomalous';
                    break;
                default:
                    typeFilter.value = '';
            }
        }
        
        if (paymentFilter) {
            switch (filterType) {
                case 'tarjeta':
                    paymentFilter.value = 'pago_tarjeta';
                    break;
                case 'efectivo':
                    paymentFilter.value = 'pago_efectivo';
                    break;
                default:
                    paymentFilter.value = '';
            }
        }
    }

    scrollToTransactions() {
        const transactionsSection = document.getElementById('transactions-list');
        if (transactionsSection) {
            const offset = 100;
            const elementPosition = transactionsSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
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
    console.log('📄 DOM cargado, verificando autenticación...');
    if (window.auth?.isAuthenticated()) {
        window.modernDashboard = new ModernDashboard();
    } else {
        console.error('❌ No autenticado');
        window.location.replace('/login.html');
    }
});
