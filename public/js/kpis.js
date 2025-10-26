async function fetchKPIs() {
    const datePicker = document.getElementById('date-picker');    
    const kpisContainer = document.getElementById('kpis-container');
    kpisContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
    `;
    const queryParams = new URLSearchParams({
        date: new Date(datePicker.value + 'T00:00:00')   
    }).toString();

    try {
        const response = await fetch(`/api/kpis/today?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const kpis = await response.json();
        renderKPIs(kpis);
    } catch (error) {
        console.error('Error fetching KPIs:', error);
        showToast('Error al cargar los KPIs.', 'error');
        kpisContainer.innerHTML = `<p class="text-red-500">Error al cargar los KPIs.</p>`;
    }
}

function renderKPIs(kpis) {
    const kpisContainer = document.getElementById('kpis-container');
    kpisContainer.innerHTML = `
        <div class="kpi-card animate-fadeIn">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <span data-lucide="users" class="w-4 h-4 text-white"></span>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-600 dark:text-gray-200">Total Transacciones</h3>
                </div>
            </div>
            <div class="flex items-end space-x-2">
                <p class="text-4xl font-extrabold text-blue-500 dark:text-blue-300">${kpis.totalTransactions}</p>
                <div class="flex items-center text-green-500 text-sm font-medium">
                    <span data-lucide="trending-up" class="w-4 h-4 mr-1"></span>
                    <span>Activo</span>
                </div>
            </div>
        </div>

        <div class="kpi-card animate-fadeIn">
            <div class="flex items-center space-x-2 mb-4">
                <div class="w-8 h-8 bg-gradient-success rounded-lg flex items-center justify-center">
                    <span data-lucide="pie-chart" class="w-4 h-4 text-white"></span>
                </div>
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Por Tipo</h3>
            </div>
            <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="check-circle" class="w-4 h-4 text-green-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Normal</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-green-600">${kpis.transactionTypes.normal.count}</div>
                        <div class="text-xs text-green-500">${kpis.transactionTypes.normal.percentage.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-red-500">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="alert-triangle" class="w-4 h-4 text-red-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Anomalous</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-red-600">${kpis.transactionTypes.anomalous.count}</div>
                        <div class="text-xs text-red-500">${kpis.transactionTypes.anomalous.percentage.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="help-circle" class="w-4 h-4 text-yellow-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Unknown</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-yellow-600">${kpis.transactionTypes.unknown.count}</div>
                        <div class="text-xs text-yellow-500">${kpis.transactionTypes.unknown.percentage.toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="kpi-card animate-fadeIn">
            <div class="flex items-center space-x-2 mb-4">
                <div class="w-8 h-8 bg-gradient-warning rounded-lg flex items-center justify-center">
                    <span data-lucide="credit-card" class="w-4 h-4 text-white"></span>
                </div>
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Métodos de Pago</h3>
            </div>
            <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="credit-card" class="w-4 h-4 text-blue-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Tarjeta</span>
                    </div>
                    <span class="font-bold text-blue-600 text-xl">${kpis.paymentMethods.pago_tarjeta}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="banknote" class="w-4 h-4 text-green-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Efectivo</span>
                    </div>
                    <span class="font-bold text-green-600 text-xl">${kpis.paymentMethods.pago_efectivo}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div class="flex items-center space-x-2">
                        <span data-lucide="wallet" class="w-4 h-4 text-purple-600"></span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">Otros</span>
                    </div>
                    <span class="font-bold text-purple-600 text-xl">${kpis.paymentMethods.otros_metodos}</span>
                </div>
            </div>
        </div>
    `;
    
    // Re-render Lucide icons for new elements
    lucide.createIcons();
}
