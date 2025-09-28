function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-md shadow-md text-white flex items-center space-x-2 transition-all duration-300 ease-out transform translate-y-full opacity-0`;

    if (type === 'success') {
        toast.classList.add('bg-green-500');
    } else if (type === 'error') {
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.add('bg-blue-500');
    }

    toast.innerHTML = `
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10); // Small delay for transition to work

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-full', 'opacity-0');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function getTransactionTypeColor(type) {
    switch (type) {
        case 'normal':
            return 'bg-green-100 border-green-500 text-green-800';
        case 'anomalous':
            return 'bg-red-100 border-red-500 text-red-800';
        case 'unknown':
            return 'bg-yellow-100 border-yellow-500 text-yellow-800';
        default:
            return 'bg-gray-100 border-gray-500 text-gray-800';
    }
}

function getTransactionTypeIcon(type) {
    switch (type) {
        case 'normal':
            return 'check-circle';
        case 'anomalous':
            return 'alert-triangle';
        case 'unknown':
            return 'help-circle';
        default:
            return 'circle';
    }
}

function getPaymentMethodIcon(method) {
    switch (method) {
        case 'pago_tarjeta':
            return 'credit-card';
        case 'pago_efectivo':
            return 'banknote';
        default:
            return 'wallet';
    }
}

// Theme toggle logic
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.classList.add(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlElement.classList.add('dark');
    }

    themeToggle.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        // Re-render Lucide icons after theme change
        lucide.createIcons();
    });
});
