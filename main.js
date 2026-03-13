import { state } from './state.js';
import { parseUrlToState, updateUrlFromState } from './router.js';
import { openModal, closeModal, switchVariationTab } from './ui-modal.js';
import { populateSpecializations, applyGlobalContext, renderProducts, renderSuggestions } from './ui-catalog.js';

// --- ГЛОБАЛЬНЫЕ ФУНКЦИИ (для вызова из HTML) ---
window.openModal = openModal;
window.closeModal = closeModal;
window.switchVariationTab = switchVariationTab;

window.addToCart = (btn) => {
    state.cartCount++;
    const counterEl = document.getElementById('cart-counter-val');
    counterEl.textContent = state.cartCount;
    counterEl.classList.remove('pop-anim');
    void counterEl.offsetWidth; 
    counterEl.classList.add('pop-anim');
    btn.textContent = 'В корзине!';
    btn.style.background = '#27ae60';
    setTimeout(() => { btn.textContent = 'В корзину'; btn.style.background = ''; }, 1500);
};

window.copySku = (sku, el) => {
    navigator.clipboard.writeText(sku).then(() => {
        const orig = el.innerText;
        el.innerText = 'Скопировано!';
        el.style.color = '#27ae60';
        setTimeout(() => { el.innerText = orig; el.style.color = '#7f8c8d'; }, 1500);
    });
};

window.toggleMobileMenu = () => {
    document.getElementById('sidebar').classList.toggle('active');
    const overlay = document.getElementById('mobile-overlay');
    overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
};

window.changePage = (page) => {
    state.currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.selectCategory = (cat1, cat2, cat3) => {
    state.currentCat1 = cat1; state.currentCat2 = cat2; state.currentCat3 = cat3;
    state.currentPage = 1;
    state.activeSpecificFilters = {}; 
    renderProducts();
    applyGlobalContext(); 
    updateUrlFromState();
};

window.toggleBrand = (brand) => {
    const idx = state.selectedBrands.indexOf(brand);
    if (idx > -1) state.selectedBrands.splice(idx, 1);
    else state.selectedBrands.push(brand);
    state.currentPage = 1;
    renderProducts();
    updateUrlFromState();
};

window.toggleSpecificFilter = (key, val) => {
    if (!state.activeSpecificFilters[key]) state.activeSpecificFilters[key] = [];
    const arr = state.activeSpecificFilters[key];
    const idx = arr.indexOf(val);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(val);
    state.currentPage = 1;
    renderProducts();
    updateUrlFromState();
};

window.clearSearch = () => {
    state.searchQuery = '';
    document.getElementById('search-input').value = '';
    state.currentPage = 1;
    renderProducts();
    updateUrlFromState();
};

window.resetAllFilters = () => {
    state.currentCat1 = null; state.currentCat2 = null; state.currentCat3 = null;
    state.selectedBrands = [];
    state.searchQuery = '';
    document.getElementById('search-input').value = '';
    state.activeSpecificFilters = {};
    state.currentPage = 1;
    applyGlobalContext();
    updateUrlFromState();
};


// ==========================================
// ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ СОБЫТИЙ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    fetch('https://185.185.71.149.nip.io/api/products')
        .then(response => response.json())
        .then(data => {
            state.allProducts = data;
            
            parseUrlToState();
            populateSpecializations();
            
            document.getElementById('global-specialization').value = state.currentSpecialization;
            document.getElementById('search-input').value = state.searchQuery;
            
            applyGlobalContext();

            if (state.openedProductId) {
                openModal(state.openedProductId, false); 
            }
        })
        .catch(err => console.error('Ошибка загрузки:', err));

    // Слушатели UI элементов
    document.getElementById('global-specialization').addEventListener('change', (e) => {
        state.currentSpecialization = e.target.value;
        window.resetAllFilters(); 
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        state.currentPage = 1;
        renderProducts();
    });

    const searchInput = document.getElementById('search-input');
    searchInput.placeholder = "Поиск по названию или артикулу...";
    searchInput.addEventListener('input', (e) => {
        if (window.location.hash !== '#catalog') {
            history.pushState(null, null, window.location.search + '#catalog');
            handleNavigation();
        }
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.currentPage = 1;
        renderProducts();
        renderSuggestions(state.searchQuery);
        updateUrlFromState();
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-suggestions').style.display = 'none';
        }
    });

    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal();
    });
    
    handleNavigation();
});

// РОУТИНГ ПРИ НАВИГАЦИИ
function handleNavigation() {
    let hash = window.location.hash || '#home';
    
    document.querySelectorAll('.page-section').forEach(section => section.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const pageId = 'page-' + hash.substring(1);
    const targetPage = document.getElementById(pageId);
    
    if (targetPage) {
        targetPage.style.display = 'block';
    } else {
        document.getElementById('page-home').style.display = 'block';
        hash = '#home';
    }

    const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    const contextBar = document.querySelector('.global-context-bar');
    if (contextBar) contextBar.style.display = (hash === '#catalog') ? 'block' : 'none';
}

window.addEventListener('hashchange', handleNavigation);

window.addEventListener('popstate', () => {
    parseUrlToState();
    document.getElementById('global-specialization').value = state.currentSpecialization;
    
    const searchEl = document.getElementById('search-input');
    if (searchEl.value !== state.searchQuery) searchEl.value = state.searchQuery;
    
    applyGlobalContext();
    
    if (state.openedProductId) openModal(state.openedProductId, false);
    else closeModal(false);
});