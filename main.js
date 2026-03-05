import { state } from './state.js';
import { populateSpecializations, applyGlobalContext, renderProducts, renderSuggestions, resetAllFilters, closeModal, openModal } from './ui.js';
import { parseUrlToState, updateUrlFromState } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
    
    fetch('https://185.185.71.149/api/products')
        .then(response => response.json())
        .then(data => {
            state.allProducts = data;
            
            // НОВОЕ: Сначала читаем ссылку, с которой пришел пользователь
            parseUrlToState();
            
            populateSpecializations();
            // Выставляем правильное значение в селекте специализации
            document.getElementById('global-specialization').value = state.currentSpecialization;
            document.getElementById('search-input').value = state.searchQuery;
            
            applyGlobalContext();

            // Если в ссылке был ID товара, сразу открываем модалку
            if (state.openedProductId) {
                openModal(state.openedProductId, false); // false = не пушить в историю снова
            }
        })
        .catch(err => console.error('Ошибка загрузки:', err));

    document.getElementById('global-specialization').addEventListener('change', (e) => {
        state.currentSpecialization = e.target.value;
        resetAllFilters(); 
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        state.currentPage = 1;
        renderProducts();
    });

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.currentPage = 1;
        renderProducts();
        renderSuggestions(state.searchQuery);
        updateUrlFromState(); // Обновляем URL при поиске
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-suggestions').style.display = 'none';
        }
    });

    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal();
    });
});

// НОВОЕ: Обработка кнопок "Назад" и "Вперед" в браузере
window.addEventListener('popstate', () => {
    parseUrlToState();
    document.getElementById('global-specialization').value = state.currentSpecialization;
    document.getElementById('search-input').value = state.searchQuery;
    
    applyGlobalContext();
    
    if (state.openedProductId) {
        openModal(state.openedProductId, false);
    } else {
        closeModal(false);
    }
});

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