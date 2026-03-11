import { state, specificFiltersConfig } from './state.js';

// 1. Базовые функции получения товаров
export function getGlobalProducts() {
    if (state.currentSpecialization === 'all') return state.allProducts;
    return state.allProducts.filter(p => {
        if (!p.specializations || p.specializations.length === 0) return true;
        return p.specializations.includes(state.currentSpecialization);
    });
}

export function getNumericPrice(priceStr) {
    if (!priceStr) return Infinity;
    const num = parseFloat(String(priceStr).replace(/\s/g, '').replace(',', '.'));
    return isNaN(num) ? Infinity : num;
}

// 2. Дерево категорий
export function buildCategoryTree(currentProducts) {
    state.categoryTree = {};
    currentProducts.forEach(p => {
        if (!p.cat1 || !p.cat2) return;
        if (!state.categoryTree[p.cat1]) state.categoryTree[p.cat1] = {};
        if (!state.categoryTree[p.cat1][p.cat2]) state.categoryTree[p.cat1][p.cat2] = new Set();
        if (p.cat3 && p.cat3.trim() !== '') state.categoryTree[p.cat1][p.cat2].add(p.cat3);
    });
}

export function isFinalCategorySelected() {
    if (!state.currentCat1 || !state.currentCat2) return false;
    const subcats3 = state.categoryTree[state.currentCat1][state.currentCat2];
    if (subcats3 && subcats3.size > 0) return state.currentCat3 !== null && state.currentCat3 !== '';
    return true;
}

// 3. ГЛАВНАЯ ФУНКЦИЯ: Фильтрация и сортировка (Вынесено из UI)
export function getFilteredAndSortedProducts() {
    const contextProducts = getGlobalProducts();

    // Этап 1: Базовые фильтры (Категории, Бренды, Поиск)
    let filtered = contextProducts.filter(p => {
        if (state.currentCat1 && p.cat1 !== state.currentCat1) return false;
        if (state.currentCat2 && p.cat2 !== state.currentCat2) return false;
        if (state.currentCat3 && p.cat3 !== state.currentCat3) return false;
        if (state.selectedBrands.length > 0 && !state.selectedBrands.includes(p.brand)) return false;
        if (state.searchQuery) {
            const matchesName = p.name && p.name.toLowerCase().includes(state.searchQuery);
            const matchesSku = p.partNumber && String(p.partNumber).toLowerCase().includes(state.searchQuery);
            if (!matchesName && !matchesSku) return false;
        }
        return true;
    });

    // Этап 2: Специфические фильтры (Цвет, Вязкость и т.д.)
    filtered = filtered.filter(p => {
        for (let config of specificFiltersConfig) {
            const activeValues = state.activeSpecificFilters[config.key];
            if (activeValues && activeValues.length > 0) {
                const pVal = p[config.key];
                if (!pVal) return false; 
                if (config.isArray) {
                    const hasMatch = activeValues.some(val => pVal.includes(val));
                    if (!hasMatch) return false;
                } else {
                    if (!activeValues.includes(pVal)) return false;
                }
            }
        }
        return true;
    });

    // Этап 3: Сортировка
    if (state.currentSort === 'alpha-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.currentSort === 'alpha-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
    else if (state.currentSort === 'price-asc') filtered.sort((a, b) => getNumericPrice(a.price) - getNumericPrice(b.price));
    else if (state.currentSort === 'price-desc') filtered.sort((a, b) => {
        let pA = getNumericPrice(a.price) === Infinity ? 0 : getNumericPrice(a.price);
        let pB = getNumericPrice(b.price) === Infinity ? 0 : getNumericPrice(b.price);
        return pB - pA;
    });

    return filtered;
}