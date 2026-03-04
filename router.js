import { state, specificFiltersConfig } from './state.js';

// 1. Читаем URL и записываем в state (при загрузке страницы)
export function parseUrlToState() {
    const params = new URLSearchParams(window.location.search);

    state.currentSpecialization = params.get('spec') || 'all';
    state.currentCat1 = params.get('cat1') || null;
    state.currentCat2 = params.get('cat2') || null;
    state.currentCat3 = params.get('cat3') || null;
    state.searchQuery = params.get('q') || '';
    state.openedProductId = params.get('product') || null;

    const brandsParam = params.get('brands');
    state.selectedBrands = brandsParam ? brandsParam.split(',') : [];

    specificFiltersConfig.forEach(config => {
        const val = params.get(config.key);
        state.activeSpecificFilters[config.key] = val ? val.split(',') : [];
    });
}

// 2. Берем текущий state и обновляем адресную строку браузера
export function updateUrlFromState() {
    const params = new URLSearchParams();

    if (state.currentSpecialization !== 'all') params.set('spec', state.currentSpecialization);
    if (state.currentCat1) params.set('cat1', state.currentCat1);
    if (state.currentCat2) params.set('cat2', state.currentCat2);
    if (state.currentCat3) params.set('cat3', state.currentCat3);
    if (state.searchQuery) params.set('q', state.searchQuery);
    if (state.selectedBrands.length > 0) params.set('brands', state.selectedBrands.join(','));

    specificFiltersConfig.forEach(config => {
        const activeVals = state.activeSpecificFilters[config.key];
        if (activeVals && activeVals.length > 0) {
            params.set(config.key, activeVals.join(','));
        }
    });

    if (state.openedProductId) params.set('product', state.openedProductId);

    // Обновляем URL без перезагрузки страницы (History API)
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({ path: newUrl }, '', newUrl);
}