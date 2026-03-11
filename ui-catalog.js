import { state, specificFiltersConfig } from './state.js';
import { getGlobalProducts, buildCategoryTree, isFinalCategorySelected, getFilteredAndSortedProducts } from './logic.js';
import { updateUrlFromState } from './router.js';

// --- Утилиты ---
export function formatPrice(priceVal) {
    if (!priceVal) return 'Цена по запросу';
    let numStr = String(priceVal).replace(/\s/g, '').replace(',', '.');
    let num = parseFloat(numStr);
    if (isNaN(num)) return priceVal; 
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// --- Инициализация базовых списков ---
export function populateSpecializations() {
    const specs = new Set();
    state.allProducts.forEach(p => {
        if (p.specializations) p.specializations.forEach(s => specs.add(s));
    });
    const select = document.getElementById('global-specialization');
    select.innerHTML = '<option value="all">Всех специалистов</option>';
    Array.from(specs).sort().forEach(s => {
        select.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

export function applyGlobalContext() {
    const currentProducts = getGlobalProducts();
    buildCategoryTree(currentProducts);
    
    // Если текущая категория стала неактуальной для новой специализации - сбрасываем
    if (state.currentCat1 && !state.categoryTree[state.currentCat1]) {
        state.currentCat1 = null; state.currentCat2 = null; state.currentCat3 = null;
    }

    renderSidebar(currentProducts);
    renderProducts();
}

// --- Отрисовка каталога ---
export function renderProducts() {
    const grid = document.getElementById('products-grid');
    const filtered = getFilteredAndSortedProducts();

    // Обновляем фильтры на основе оставшихся товаров
    renderBrandFilter(filtered);
    if (isFinalCategorySelected()) {
        document.getElementById('category-filters').style.display = 'block';
        renderSpecificFilters(filtered);
    } else {
        document.getElementById('category-filters').style.display = 'none';
        state.activeSpecificFilters = {};
    }
    updateActiveTags();

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: #7f8c8d;">Товары не найдены. Попробуйте изменить фильтры.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Пагинация
    const totalPages = Math.ceil(filtered.length / state.itemsPerPage);
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const itemsToShow = filtered.slice(startIndex, startIndex + state.itemsPerPage);

    grid.innerHTML = itemsToShow.map(p => {
        let priceStr = formatPrice(p.price);
        let imgHtml = '';
        if (p.images && p.images.length > 0) {
            imgHtml = `<img src="${p.images[0].thumb}" class="product-img" onerror="this.src='https://via.placeholder.com/200?text=Нет+фото'">`;
        } else {
            imgHtml = `<img src="https://via.placeholder.com/200?text=Нет+фото" class="product-img">`;
        }
        
        return `
            <div class="product-card" onclick="openModal('${p.id}')">
                ${imgHtml}
                <div class="product-brand">${p.brand || 'Без бренда'}</div>
                <div class="product-name">${p.name}</div>
                ${p.partNumber ? `<div style="font-size:12px; color:#95a5a6; margin-bottom:5px;">Арт. ${p.partNumber}</div>` : ''}
                <div class="product-price">${priceStr === 'Цена по запросу' ? priceStr : priceStr + ' ₽'}</div>
                <button class="btn-cart" onclick="event.stopPropagation(); addToCart(this)">В корзину</button>
            </div>
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pag = document.getElementById('pagination');
    if (totalPages <= 1) { pag.innerHTML = ''; return; }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === state.currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
    }
    pag.innerHTML = html;
}

// --- Отрисовка фильтров и сайдбара ---
function renderSidebar(currentProducts) {
    const menu = document.getElementById('catalog-menu');
    let html = '';

    Object.keys(state.categoryTree).sort().forEach(cat1 => {
        const isCat1Active = state.currentCat1 === cat1;
        html += `
            <div class="cat1 ${isCat1Active ? 'active' : ''}">
                <div class="cat-header" onclick="window.selectCategory('${cat1}', null, null)">
                    ${cat1}
                </div>
        `;

        if (isCat1Active) {
            html += `<div class="cat-children">`;
            Object.keys(state.categoryTree[cat1]).sort().forEach(cat2 => {
                const isCat2Active = state.currentCat2 === cat2;
                html += `
                    <div class="cat2 ${isCat2Active ? 'active' : ''}">
                        <div class="cat-header" onclick="window.selectCategory('${cat1}', '${cat2}', null)">
                            ${cat2}
                        </div>
                `;

                if (isCat2Active) {
                    const subcats3 = Array.from(state.categoryTree[cat1][cat2]).sort();
                    if (subcats3.length > 0) {
                        html += `<div class="cat-children">`;
                        subcats3.forEach(cat3 => {
                            const isCat3Active = state.currentCat3 === cat3;
                            html += `
                                <div class="cat3 ${isCat3Active ? 'active' : ''}" 
                                     onclick="window.selectCategory('${cat1}', '${cat2}', '${cat3}')">
                                    ${cat3}
                                </div>
                            `;
                        });
                        html += `</div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    menu.innerHTML = html || '<div style="color:#7f8c8d;font-size:13px;">Для данной специализации нет категорий</div>';
    
    // Обновляем хлебные крошки
    const bc = document.getElementById('breadcrumbs');
    let bcHtml = '<span style="cursor:pointer;" onclick="window.selectCategory(null,null,null)">Все товары</span>';
    if (state.currentCat1) bcHtml += ` > <span style="cursor:pointer;" onclick="window.selectCategory('${state.currentCat1}',null,null)">${state.currentCat1}</span>`;
    if (state.currentCat2) bcHtml += ` > <span style="cursor:pointer;" onclick="window.selectCategory('${state.currentCat1}','${state.currentCat2}',null)">${state.currentCat2}</span>`;
    if (state.currentCat3) bcHtml += ` > <span>${state.currentCat3}</span>`;
    bc.innerHTML = bcHtml;
}

function renderBrandFilter(filteredProducts) {
    const container = document.getElementById('brand-filters-container');
    const brandCounts = {};
    filteredProducts.forEach(p => {
        if (!p.brand) return;
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });

    const sortedBrands = Object.keys(brandCounts).sort();
    if (sortedBrands.length === 0) {
        container.innerHTML = '<span style="font-size: 13px; color: #95a5a6;">Нет доступных брендов</span>';
        return;
    }

    container.innerHTML = sortedBrands.map(b => `
        <label class="filter-checkbox">
            <input type="checkbox" value="${b}" 
                   ${state.selectedBrands.includes(b) ? 'checked' : ''}
                   onchange="window.toggleBrand('${b}')">
            ${b} <span class="count">(${brandCounts[b]})</span>
        </label>
    `).join('');
}

function renderSpecificFilters(filteredProducts) {
    const container = document.getElementById('dynamic-filters');
    let html = '';

    specificFiltersConfig.forEach(config => {
        const valueCounts = {};
        filteredProducts.forEach(p => {
            const val = p[config.key];
            if (!val) return;
            if (config.isArray) {
                val.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
            } else {
                valueCounts[val] = (valueCounts[val] || 0) + 1;
            }
        });

        const sortedValues = Object.keys(valueCounts).sort();
        if (sortedValues.length > 0) {
            html += `
                <div class="filter-group">
                    <div class="filter-group-title">${config.label}</div>
                    <div class="scrollable-filters">
                        ${sortedValues.map(v => {
                            const isActive = state.activeSpecificFilters[config.key] && state.activeSpecificFilters[config.key].includes(v);
                            return `
                                <label class="filter-checkbox">
                                    <input type="checkbox" 
                                           ${isActive ? 'checked' : ''}
                                           onchange="window.toggleSpecificFilter('${config.key}', '${v}')">
                                    ${v} <span class="count">(${valueCounts[v]})</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html || '<span style="font-size: 13px; color: #95a5a6;">Нет специфических характеристик для данной категории</span>';
}

function updateActiveTags() {
    const container = document.getElementById('active-tags-container');
    let tagsHtml = '';

    if (state.searchQuery) {
        tagsHtml += `<div class="tag">Поиск: ${state.searchQuery} <span onclick="window.clearSearch()">×</span></div>`;
    }
    state.selectedBrands.forEach(b => {
        tagsHtml += `<div class="tag">${b} <span onclick="window.toggleBrand('${b}')">×</span></div>`;
    });
    specificFiltersConfig.forEach(config => {
        const activeVals = state.activeSpecificFilters[config.key];
        if (activeVals) {
            activeVals.forEach(v => {
                tagsHtml += `<div class="tag">${config.label}: ${v} <span onclick="window.toggleSpecificFilter('${config.key}', '${v}')">×</span></div>`;
            });
        }
    });

    if (tagsHtml) {
        tagsHtml += `<div class="tag" style="background:#e74c3c; color:white; cursor:pointer;" onclick="window.resetAllFilters()">Сбросить всё</div>`;
    }
    container.innerHTML = tagsHtml;
}

export function renderSuggestions(query) {
    const suggBox = document.getElementById('search-suggestions');
    if (!query || query.length < 2) {
        suggBox.style.display = 'none';
        return;
    }

    const currentProducts = getGlobalProducts();
    const matches = currentProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) || 
        (p.partNumber && String(p.partNumber).toLowerCase().includes(query))
    ).slice(0, 5);

    if (matches.length > 0) {
        suggBox.innerHTML = matches.map(p => `
            <div class="suggestion-item" onclick="window.openModal('${p.id}')">
                <div style="font-weight: bold;">${p.name}</div>
                ${p.partNumber ? `<div style="font-size: 11px; color: #7f8c8d;">Арт. ${p.partNumber}</div>` : ''}
            </div>
        `).join('');
        suggBox.style.display = 'block';
    } else {
        suggBox.style.display = 'none';
    }
}