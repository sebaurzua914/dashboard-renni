let currentPage = 1;
const transactionsPerPage = 10;
let currentFilters = {
    type: '',
    paymentMethod: '',
    search: ''
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("date-picker").value = new Date().toISOString().split('T')[0];
    fetchTransactions();
    fetchKPIs(); // Initial KPI fetch    
    
    // Event Listeners
    document.getElementById('date-picker').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTransactions();
        }
    });

    document.getElementById('search-input').addEventListener('input', debounce(event => {
        currentFilters.search = event.target.value;
        currentPage = 1;
        fetchTransactions();
    }, 300));

    document.getElementById('type-filter').addEventListener('change', event => {
        currentFilters.type = event.target.value;
        currentPage = 1;
        fetchTransactions();
    });

    document.getElementById('payment-filter').addEventListener('change', event => {
        currentFilters.paymentMethod = event.target.value;
        currentPage = 1;
        fetchTransactions();
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTransactions();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++; // Assume there's a next page for now, actual check will be done on fetch
        fetchTransactions();
    });

    document.getElementById('refresh-button').addEventListener('click', () => {
        fetchTransactions();
        fetchKPIs();
        showToast('Datos actualizados.', 'info');
    });

    document.getElementById('clock-button').addEventListener('click', () => {
        fetchTransactions();
        fetchKPIs();
        showToast('Datos actualizados.', 'info');
    });    
    
    document.getElementById('close-modal').addEventListener('click', closeModal);

    // Auto-refresh every 30 seconds
    // setInterval(() => {
    //     fetchTransactions();
    //     fetchKPIs();
    //     showToast('Datos actualizados automáticamente.', 'info');
    // }, 30000);

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'R' || event.key === 'r') {
            document.getElementById('refresh-button').click();
        }
        if (event.key === 'Escape') {
            closeModal();
        }
    });
});

async function fetchTransactions() {
    const datePicker = document.getElementById('date-picker');    
    const selectedDate = datePicker.value; // Formato: YYYY-MM-DD    
    const today = new Date();
    const transactionsList = document.getElementById('transactions-list');
    transactionsList.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
    `; // Loading skeleton    
    const queryParams = new URLSearchParams({
        date: new Date(datePicker.value + 'T00:00:00')  ,
        page: currentPage,
        limit: transactionsPerPage,
        ...currentFilters
    }).toString();

    try {
        const response = await fetch(`/api/transactions/today?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactions = await response.json();
        renderTransactions(transactions);
        updatePagination(transactions.length);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        showToast('Error al cargar las transacciones.', 'error');
        transactionsList.innerHTML = `<p class="text-red-500">Error al cargar las transacciones.</p>`;
    }
}

function renderTransactions(transactions) {
    const transactionsList = document.getElementById('transactions-list');
    transactionsList.innerHTML = ''; // Clear previous transactions
    console.log('Transactions.length:', transactions.length);
    if (transactions.length === 0) {
        
        transactionsList.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span data-lucide="inbox" class="w-8 h-8 text-gray-400"></span>
                </div>
                <p class="text-gray-500 dark:text-gray-400 text-lg">No hay transacciones para mostrar</p>
                <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    //debugger;
    transactions.forEach((transaction, index) => {
        //debugger;
        const transactionCard = document.createElement('div');
        const typeColor = getTransactionTypeColor(transaction.Type);
        const typeIcon = getTransactionTypeIcon(transaction.Type);
        const paymentIcon = getPaymentMethodIcon(transaction['Payment Method']);
        
        // Get border color based on transaction type
        let borderColor = 'border-gray-300';
        if (transaction.Type === 'normal') borderColor = 'border-green-500';
        else if (transaction.Type === 'anomalous') borderColor = 'border-red-500';
        else if (transaction.Type === 'unknown') borderColor = 'border-yellow-500';

        transactionCard.className = `transaction-card ${borderColor} animate-fadeIn`;
        transactionCard.style.animationDelay = `${index * 0.1}s`;
        console.log(  transaction );
        transactionCard.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 ${typeColor.replace('bg-', 'bg-').replace('border-', '').replace('text-', '')} rounded-xl flex items-center justify-center shadow-sm">
                        <i class="${typeIcon} text-white text-lg"></i>
                    </div>
                    <div class="ml-3">
                        <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100 capitalize">
                            ${transaction.Type}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            ${new Date(transaction.Inicio).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
                        <span data-lucide="clock" class="w-3 h-3"></span>
                        <span>${transaction.Duracion.toFixed(1)}s</span>
                    </div>
                </div>
            </div>
            

<div class="flex gap-4 mb-3">
    <div class="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg flex-1">
        <div class="flex items-center space-x-2">
            <span data-lucide="user" class="w-4 h-4 text-blue-600"></span>
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Cliente</span>
            <span class="font-bold text-blue-600 ml-auto">#${transaction['Cliente ID']}</span>
        </div>
    </div>
    <div class="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg flex-1">
        <div class="flex items-center space-x-2">
            <span data-lucide="user-check" class="w-4 h-4 text-purple-600"></span>
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Cajero</span>
            <span class="font-bold text-purple-600 ml-auto">#${transaction['Cajero ID']}</span>
        </div>
    </div>
</div>
            
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span data-lucide="${paymentIcon}" class="w-4 h-4 text-gray-600"></span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${transaction['Payment Method']}</span>
                </div>
                <div class="flex items-center space-x-1 text-xs text-gray-500">
                    <span data-lucide="eye" class="w-3 h-3"></span>
                    <span>Ver detalles</span>
                </div>
            </div>
        `;
        
        transactionCard.addEventListener('click', () => openModal(transaction));
        transactionsList.appendChild(transactionCard);
    });
    lucide.createIcons(); // Re-render Lucide icons for new elements
}

function updatePagination(currentTransactionsCount) {
    document.getElementById('page-info').textContent = `Página ${currentPage}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    // This is a simple check, ideally we'd get total count from API
    document.getElementById('next-page').disabled = currentTransactionsCount < transactionsPerPage;
}

function openModal(transaction) {
    const modal = document.getElementById('transaction-modal');
    const modalContent = document.getElementById('modal-content');

    // Get transaction type styling
    const typeIcon = getTransactionTypeIcon(transaction.Type);
    const paymentIcon = getPaymentMethodIcon(transaction['Payment Method']);
    
    let typeColorClass = 'bg-gray-500';
    if (transaction.Type === 'normal') typeColorClass = 'bg-green-500';
    else if (transaction.Type === 'anomalous') typeColorClass = 'bg-red-500';
    else if (transaction.Type === 'unknown') typeColorClass = 'bg-yellow-500';

    modalContent.innerHTML = `
        <!-- Transaction Status Header -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-6">
            <div class="flex items-center space-x-4">
                <div class="w-12 h-12 ${typeColorClass} rounded-xl flex items-center justify-center shadow-lg">
                    <i class="${typeIcon} text-white text-xl"></i>
                </div>
                <div class="ml-3">
                    <h4 class="text-xl font-bold text-gray-800 dark:text-gray-100 capitalize">${transaction.Type}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${transaction.Razon}</p>
                </div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${transaction.Duracion.toFixed(1)}s</div>
                <div class="text-xs text-gray-500">Duración</div>
            </div>
        </div>

        <!-- Main Details Grid -->
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-500">
                <div class="flex items-center space-x-2 mb-1">
                    <span data-lucide="user" class="w-3 h-3 text-blue-600"></span>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Cliente</span>
                </div>
                <div class="text-xl font-bold text-blue-600">#${transaction['Cliente ID']}</div>
            </div>
            
            <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border-l-4 border-purple-500">
                <div class="flex items-center space-x-2 mb-1">
                    <span data-lucide="user-check" class="w-3 h-3 text-purple-600"></span>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Cajero</span>
                </div>
                <div class="text-xl font-bold text-purple-600">#${transaction['Cajero ID']}</div>
            </div>
            
            <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
                <div class="flex items-center space-x-2 mb-1">
                    <span data-lucide="${paymentIcon}" class="w-3 h-3 text-green-600"></span>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Método de Pago</span>
                </div>
                <div class="text-sm font-bold text-green-600">${transaction['Payment Method']}</div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div class="flex items-center space-x-2 mb-1">
                    <span data-lucide="calendar" class="w-3 h-3 text-gray-600"></span>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Horario</span>
                </div>
                <div class="text-xs text-gray-700 dark:text-gray-200">
                    <div><strong>Inicio:</strong> ${new Date(transaction.Inicio).toLocaleString('es-ES')}</div>
                    <div><strong>Fin:</strong> ${new Date(transaction.Fin).toLocaleString('es-ES')}</div>
                </div>
            </div>
        </div>

        <!-- Events Timeline -->
        <div class="mb-6">
            <div class="flex items-center space-x-2 mb-4">
                <span data-lucide="activity" class="w-5 h-5 text-indigo-600"></span>
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Timeline de Eventos</h4>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <div class="space-y-2">
                    ${transaction.Eventos.split(',').map((event, index) => `
                        <div class="flex items-center space-x-3">
                            <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span class="text-sm text-gray-700 dark:text-gray-200">${event.trim()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Duration Progress -->
        <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <span data-lucide="clock" class="w-4 h-4 text-blue-600"></span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Progreso de Duración</span>
                </div>
                <span class="text-sm text-gray-500">${transaction.Duracion.toFixed(2)}s / 10s</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm" 
                     style="width: ${Math.min(100, (transaction.Duracion / 10) * 100)}%"></div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
            <button id="copy-id-button" class="flex-1 flex items-center justify-center space-x-2 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                <span data-lucide="copy" class="w-4 h-4"></span>
                <span class="font-medium">Copiar ID de Transacción</span>
            </button>
            <button id="export-button" class="flex items-center justify-center space-x-2 p-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                <span data-lucide="download" class="w-4 h-4"></span>
                <span class="font-medium">Exportar</span>
            </button>
        </div>
    `;
    
    lucide.createIcons(); // Re-render Lucide icons for new elements in modal

    document.getElementById('copy-id-button').addEventListener('click', () => {
        const transactionId = `${new Date(transaction.Inicio).toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, ':')}:${new Date(transaction.Inicio).toLocaleTimeString('es-CL', {hour12: false, hour: '2-digit', minute: '2-digit'}).replace(/:/g, ':')}:transaccion:${transaction['Cliente ID']}:${transaction['Cajero ID']}`;
        navigator.clipboard.writeText(transactionId)
            .then(() => showToast('ID de transacción copiado!', 'success'))
            .catch(err => {
                console.error('Error al copiar el ID:', err);
                showToast('Error al copiar el ID.', 'error');
            });
    });

    document.getElementById('export-button').addEventListener('click', () => {
        const dataStr = JSON.stringify(transaction, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transaccion_${transaction['Cliente ID']}_${transaction['Cajero ID']}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Transacción exportada!', 'success');
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function getTransactionTypeIcon(type) {
    switch (type) {
        case 'normal':
            return 'fas fa-check-circle';
        case 'anomalous':
            return 'fas fa-exclamation-triangle';
        case 'unknown':
            return 'fas fa-question-circle';
        default:
            return 'fas fa-circle';
    }
}

function getPaymentMethodIcon(method) {
    switch (method) {
        case 'pago_tarjeta':
            return 'fas fa-credit-card';
        case 'pago_efectivo':
        case 'dinero_mano':
        case 'caja_abierta':
            return 'fas fa-money-bill';
        default:
            return 'fas fa-wallet';
    }
}

function getTransactionTypeColor(type) {
    switch (type) {
        case 'normal':
            return 'bg-green-500';
        case 'anomalous':
            return 'bg-red-500';
        case 'unknown':
            return 'bg-yellow-500';
        default:
            return 'bg-gray-500';
    }
}
