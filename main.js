import { state } from './state.js';
import { 
    populateSpecializations, 
    applyGlobalContext, 
    renderProducts, 
    renderSuggestions, 
    resetAllFilters, 
    closeModal 
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Загрузка данных
    fetch('products.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            state.allProducts = data;
            populateSpecializations();
            applyGlobalContext();
        })
        .catch(err => console.error('Ошибка загрузки:', err));

    // Слушатель смены специализации (Глобальный контекст)
    document.getElementById('global-specialization').addEventListener('change', (e) => {
        state.currentSpecialization = e.target.value;
        resetAllFilters(); 
    });

// Слушатель сортировки
    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.currentSort = e.target.value; // <-- Должно быть state.currentSort
        state.currentPage = 1;
        renderProducts();
    });

    // Слушатель поиска (Живой поиск)
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.currentPage = 1;
        renderProducts();
        renderSuggestions(state.searchQuery);
    });
    
    // Скрытие подсказок поиска при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-suggestions').style.display = 'none';
        }
    });

    // Закрытие модального окна при клике на фон
    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal();
    });
});

// Исправление бага с оверлеем при ресайзе экрана
window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.style.display = 'none';
        }
    }
});