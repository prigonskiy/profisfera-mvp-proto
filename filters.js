import { state } from './state.js';

// Получить товары для выбранной специализации
export function getGlobalProducts() {
    if (state.currentSpecialization === 'all') return state.allProducts;
    return state.allProducts.filter(p => {
        if (!p.specializations || p.specializations.length === 0) return true;
        return p.specializations.includes(state.currentSpecialization);
    });
}

// Построить дерево категорий
export function buildCategoryTree(currentProducts) {
    state.categoryTree = {};
    currentProducts.forEach(p => {
        if (!p.cat1 || !p.cat2) return;
        if (!state.categoryTree[p.cat1]) state.categoryTree[p.cat1] = {};
        if (!state.categoryTree[p.cat1][p.cat2]) state.categoryTree[p.cat1][p.cat2] = new Set();
        if (p.cat3 && p.cat3.trim() !== '') state.categoryTree[p.cat1][p.cat2].add(p.cat3);
    });
}

// Подсчет товаров для меню
export function getProductCount(cat1, cat2, cat3) {
    const currentProducts = getGlobalProducts();
    return currentProducts.filter(p => {
        if (cat1 && p.cat1 !== cat1) return false;
        if (cat2 && p.cat2 !== cat2) return false;
        if (cat3 && p.cat3 !== cat3) return false;
        if (state.searchQuery) {
            const matchesName = p.name && p.name.toLowerCase().includes(state.searchQuery);
            const matchesSku = p.partNumber && String(p.partNumber).toLowerCase().includes(state.searchQuery);
            if (!matchesName && !matchesSku) return false;
        }
        return true;
    }).length;
}

// Проверка: дошли ли мы до конечной категории
export function isFinalCategorySelected() {
    if (!state.currentCat1 || !state.currentCat2) return false;
    const subcats3 = state.categoryTree[state.currentCat1][state.currentCat2];
    if (subcats3 && subcats3.size > 0) return state.currentCat3 !== null && state.currentCat3 !== undefined;
    return true;
}

// Преобразование цены в число для сортировки
export function getNumericPrice(priceVal) {
    if (!priceVal) return Infinity; 
    let numStr = String(priceVal).replace(/\s/g, '').replace(',', '.');
    let num = parseFloat(numStr);
    return isNaN(num) ? Infinity : num;
}