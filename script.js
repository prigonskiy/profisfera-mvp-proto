let allProducts = []; // Исходная база
let categoryTree = {};

let currentCat1 = null;
let currentCat2 = null;
let currentCat3 = null;
let selectedBrands = [];
let searchQuery = '';

let currentSort = 'default';
let currentPage = 1;
const itemsPerPage = 25; 

// ГЛОБАЛЬНЫЙ КОНТЕКСТ
let currentSpecialization = 'all';

const specificFiltersConfig = [
    { key: 'series', label: 'Серия', isArray: false },
    { key: 'colors', label: 'Цвет', isArray: true },
    { key: 'appointment', label: 'Назначение', isArray: false },
    { key: 'consistency', label: 'Консистенция', isArray: false },
    { key: 'viscosity', label: 'Вязкость', isArray: false },
    { key: 'curing', label: 'Отверждение', isArray: false },
    { key: 'materialType', label: 'Тип материала', isArray: false },
    { key: 'packaging', label: 'Форма выпуска', isArray: false },
    { key: 'selfEtching', label: 'Самопротравливающийся', isArray: false },
    { key: 'hardness', label: 'Твёрдость', isArray: false },
    { key: 'purposes', label: 'Предназначение', isArray: true }
];

let activeSpecificFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    specificFiltersConfig.forEach(f => activeSpecificFilters[f.key] = []);

    fetch('products.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            allProducts = data;
            
            // Собираем все доступные специализации из базы
            populateSpecializations();

            // Первичная отрисовка
            applyGlobalContext();
        })
        .catch(err => console.error('Ошибка загрузки products.json:', err));

    // Слушатель на глобальный переключатель специализации
    document.getElementById('global-specialization').addEventListener('change', (e) => {
        currentSpecialization = e.target.value;
        // При смене врача сбрасываем всё (категории, бренды, страницу)
        currentCat1 = currentCat2 = currentCat3 = null;
        selectedBrands = [];
        searchQuery = '';
        document.getElementById('search-input').value = '';
        currentPage = 1;
        specificFiltersConfig.forEach(f => activeSpecificFilters[f.key] = []);
        
        applyGlobalContext();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        renderProducts();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1;
        renderProducts();
    });
    
    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal();
    });
});

// Заполнение выпадающего списка специализаций
function populateSpecializations() {
    const specs = new Set();
    allProducts.forEach(p => {
        if (p.specializations) {
            p.specializations.forEach(s => specs.add(s));
        }
    });

    const select = document.getElementById('global-specialization');
    [...specs].sort().forEach(spec => {
        const opt = document.createElement('option');
        opt.value = spec;
        opt.textContent = spec;
        select.appendChild(opt);
    });
}

// Получение товаров, актуальных для выбранного врача
function getGlobalProducts() {
    if (currentSpecialization === 'all') return allProducts;
    
    return allProducts.filter(p => {
        // Если специализация не указана - товар универсальный (показываем всем)
        if (!p.specializations || p.specializations.length === 0) return true;
        // Иначе проверяем, есть ли нужный врач в списке
        return p.specializations.includes(currentSpecialization);
    });
}

// Применение глобального контекста (перестройка всего сайта)
function applyGlobalContext() {
    const currentProducts = getGlobalProducts();
    
    buildCategoryTree(currentProducts);
    renderMenu();
    
    const contextBrands = [...new Set(currentProducts.map(p => p.brand).filter(b => b !== ''))].sort();
    renderBrandFilters(contextBrands, currentProducts);
    
    updateBreadcrumbs();
    renderProducts();
}

// Строим дерево категорий только из доступных товаров
function buildCategoryTree(currentProducts) {
    categoryTree = {};
    currentProducts.forEach(p => {
        if (!p.cat1 || !p.cat2) return;
        if (!categoryTree[p.cat1]) categoryTree[p.cat1] = {};
        if (!categoryTree[p.cat1][p.cat2]) categoryTree[p.cat1][p.cat2] = new Set();
        if (p.cat3 && p.cat3.trim() !== '') categoryTree[p.cat1][p.cat2].add(p.cat3);
    });
}

// Фильтр брендов: показываем только те бренды, которые есть в контексте
function renderBrandFilters(brands, currentProducts) {
    const container = document.getElementById('brand-filters-container');
    container.innerHTML = '';
    
    if (brands.length === 0) return;

    brands.forEach(brand => {
        // Подсчет товаров бренда в ТЕКУЩЕМ контексте
        const count = currentProducts.filter(p => p.brand === brand).length;

        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = brand;
        
        cb.addEventListener('change', (e) => {
            if (e.target.checked) selectedBrands.push(brand);
            else selectedBrands = selectedBrands.filter(b => b !== brand);
            currentPage = 1; 
            renderProducts(); 
        });
        
        label.appendChild(cb);
        label.insertAdjacentHTML('beforeend', ` ${brand} <span class="cat-count">(${count})</span>`);
        container.appendChild(label);
    });
}

// Подсчет товаров в меню (с учетом глобального контекста)
function getProductCount(cat1, cat2, cat3) {
    const currentProducts = getGlobalProducts();
    return currentProducts.filter(p => {
        if (cat1 && p.cat1 !== cat1) return false;
        if (cat2 && p.cat2 !== cat2) return false;
        if (cat3 && p.cat3 !== cat3) return false;
        if (searchQuery) {
            const matchesName = p.name && p.name.toLowerCase().includes(searchQuery);
            const matchesSku = p.partNumber && String(p.partNumber).toLowerCase().includes(searchQuery);
            if (!matchesName && !matchesSku) return false;
        }
        return true;
    }).length;
}

function renderMenu() {
    const menuContainer = document.getElementById('catalog-menu');
    menuContainer.innerHTML = '';

    for (const [cat1, subcats] of Object.entries(categoryTree)) {
        const block1 = document.createElement('div');
        block1.className = 'cat-level-1 open'; 
        
        const count1 = getProductCount(cat1, null, null);
        const title1 = document.createElement('div');
        title1.className = 'cat-level-1-title';
        title1.innerHTML = `<span>${cat1} <span class="cat-count">(${count1})</span></span> <span>▼</span>`;
        
        const list2 = document.createElement('ul');
        list2.className = 'cat-level-2';

        for (const [cat2, subcats3] of Object.entries(subcats)) {
            const item2 = document.createElement('li');
            item2.className = 'cat-level-2-item';
            
            const count2 = getProductCount(cat1, cat2, null);
            const title2 = document.createElement('div');
            title2.className = 'cat-level-2-title';
            const hasCat3 = subcats3.size > 0;
            title2.innerHTML = `<span>${cat2} <span class="cat-count">(${count2})</span></span> ${hasCat3 ? '<span>▼</span>' : ''}`;
            
            const list3 = document.createElement('ul');
            list3.className = 'cat-level-3';

            if (hasCat3) {
                Array.from(subcats3).forEach(cat3 => {
                    const li3 = document.createElement('li');
                    const count3 = getProductCount(cat1, cat2, cat3);
                    li3.innerHTML = `${cat3} <span class="cat-count">(${count3})</span>`;
                    
                    li3.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectCategory(cat1, cat2, cat3);
                        document.querySelectorAll('.cat-level-3 li').forEach(el => el.classList.remove('active'));
                        li3.classList.add('active');
                    });
                    list3.appendChild(li3);
                });
            }

            title2.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = item2.classList.contains('open');
                block1.querySelectorAll('.cat-level-2-item').forEach(el => el.classList.remove('open'));
                if (!isOpen && hasCat3) item2.classList.add('open');
                
                selectCategory(cat1, cat2, null);
                document.querySelectorAll('.cat-level-3 li').forEach(el => el.classList.remove('active'));
            });

            item2.appendChild(title2);
            item2.appendChild(list3);
            list2.appendChild(item2);
        }

        title1.addEventListener('click', () => {
            const isOpen = block1.classList.contains('open');
            document.querySelectorAll('.cat-level-1').forEach(el => el.classList.remove('open'));
            if (!isOpen) {
                block1.classList.add('open');
                selectCategory(cat1, null, null);
            } else {
                selectCategory(null, null, null);
            }
            document.querySelectorAll('.cat-level-3 li').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.cat-level-2-item').forEach(el => el.classList.remove('open'));
        });

        block1.appendChild(title1);
        block1.appendChild(list2);
        menuContainer.appendChild(block1);
    }
}

function selectCategory(cat1, cat2, cat3) {
    currentCat1 = cat1;
    currentCat2 = cat2;
    currentCat3 = cat3;
    currentPage = 1; 
    specificFiltersConfig.forEach(f => activeSpecificFilters[f.key] = []);
    updateBreadcrumbs();
    renderProducts();
}

function updateBreadcrumbs() {
    const bc = document.getElementById('breadcrumbs');
    let html = '<span>Все товары</span>';
    if (currentCat1) html = `Каталог / <span>${currentCat1}</span>`;
    if (currentCat2) html = `Каталог / ${currentCat1} / <span>${currentCat2}</span>`;
    if (currentCat3) html = `Каталог / ${currentCat1} / ${currentCat2} / <span>${currentCat3}</span>`;
    bc.innerHTML = html;
}

function isFinalCategorySelected() {
    if (!currentCat1 || !currentCat2) return false;
    const subcats3 = categoryTree[currentCat1][currentCat2];
    if (subcats3 && subcats3.size > 0) {
        return currentCat3 !== null && currentCat3 !== undefined;
    }
    return true;
}

function buildSpecificFilters(currentItems) {
    const categoryFiltersBlock = document.getElementById('category-filters');
    const dynamicFiltersContainer = document.getElementById('dynamic-filters');
    dynamicFiltersContainer.innerHTML = '';

    let hasAnyFilter = false;

    specificFiltersConfig.forEach(config => {
        const valueCounts = {};
        
        currentItems.forEach(item => {
            const val = item[config.key];
            if (val) {
                if (config.isArray) {
                    val.forEach(v => { if(v) valueCounts[v] = (valueCounts[v] || 0) + 1; });
                } else {
                    valueCounts[val] = (valueCounts[val] || 0) + 1;
                }
            }
        });

        const uniqueValues = Object.keys(valueCounts);

        if (uniqueValues.length > 0) {
            hasAnyFilter = true;
            const valuesArray = uniqueValues.sort();
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';
            groupDiv.innerHTML = `<h4 style="margin-bottom: 8px; color: #34495e;">${config.label}</h4>`;
            
            const scrollDiv = document.createElement('div');
            scrollDiv.className = 'scrollable-filters';
            scrollDiv.style.maxHeight = '150px';

            valuesArray.forEach(val => {
                const count = valueCounts[val];
                const label = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = val;
                
                if (activeSpecificFilters[config.key].includes(val)) cb.checked = true;

                cb.addEventListener('change', (e) => {
                    if (e.target.checked) activeSpecificFilters[config.key].push(val);
                    else activeSpecificFilters[config.key] = activeSpecificFilters[config.key].filter(v => v !== val);
                    currentPage = 1;
                    renderProducts(false); 
                });

                label.appendChild(cb);
                label.insertAdjacentHTML('beforeend', ` ${val} <span class="cat-count">(${count})</span>`);
                scrollDiv.appendChild(label);
            });

            groupDiv.appendChild(scrollDiv);
            dynamicFiltersContainer.appendChild(groupDiv);
        }
    });

    if (hasAnyFilter) categoryFiltersBlock.style.display = 'block';
    else categoryFiltersBlock.style.display = 'none';
}

function getNumericPrice(priceVal) {
    if (!priceVal) return Infinity; 
    let numStr = String(priceVal).replace(/\s/g, '').replace(',', '.');
    let num = parseFloat(numStr);
    return isNaN(num) ? Infinity : num;
}

function formatPrice(priceVal) {
    if (!priceVal) return 'Цена по запросу';
    let numStr = String(priceVal).replace(/\s/g, '').replace(',', '.');
    let num = parseFloat(numStr);
    if (isNaN(num)) return priceVal; 
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function renderProducts(rebuildFilters = true) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    // База товаров теперь берется из глобального контекста!
    const contextProducts = getGlobalProducts();

    let filteredBase = contextProducts.filter(p => {
        if (currentCat1 && p.cat1 !== currentCat1) return false;
        if (currentCat2 && p.cat2 !== currentCat2) return false;
        if (currentCat3 && p.cat3 !== currentCat3) return false;
        if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
        if (searchQuery) {
            const matchesName = p.name && p.name.toLowerCase().includes(searchQuery);
            const matchesSku = p.partNumber && String(p.partNumber).toLowerCase().includes(searchQuery);
            if (!matchesName && !matchesSku) return false;
        }
        return true;
    });

    if (searchQuery !== '') renderMenu();

    if (rebuildFilters) {
        if (isFinalCategorySelected()) buildSpecificFilters(filteredBase);
        else {
            document.getElementById('category-filters').style.display = 'none';
            document.getElementById('dynamic-filters').innerHTML = '';
            specificFiltersConfig.forEach(f => activeSpecificFilters[f.key] = []);
        }
    }

    let fullyFiltered = filteredBase.filter(p => {
        for (let config of specificFiltersConfig) {
            const activeValues = activeSpecificFilters[config.key];
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

    if (currentSort === 'alpha-asc') fullyFiltered.sort((a, b) => a.name.localeCompare(b.name));
    else if (currentSort === 'alpha-desc') fullyFiltered.sort((a, b) => b.name.localeCompare(a.name));
    else if (currentSort === 'price-asc') fullyFiltered.sort((a, b) => getNumericPrice(a.price) - getNumericPrice(b.price));
    else if (currentSort === 'price-desc') fullyFiltered.sort((a, b) => {
        let pA = getNumericPrice(a.price) === Infinity ? 0 : getNumericPrice(a.price);
        let pB = getNumericPrice(b.price) === Infinity ? 0 : getNumericPrice(b.price);
        return pB - pA;
    });

    const totalItems = fullyFiltered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalItems === 0) {
        grid.innerHTML = '<div class="no-results">По выбранным критериям товары не найдены.</div>';
        renderPagination(0, 0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = fullyFiltered.slice(startIndex, startIndex + itemsPerPage);

    paginatedItems.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.addEventListener('click', () => openModal(p.id));
        
        const formattedPrice = formatPrice(p.price);
        const priceDisplay = formattedPrice === 'Цена по запросу' ? formattedPrice : `${formattedPrice} ₽`;
        const skuHtml = p.partNumber ? `<div class="product-sku">Арт. ${p.partNumber}</div>` : '';

        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/250x200?text=Нет+фото'}" alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/250x200?text=Нет+фото'">
            <div class="product-brand">${p.brand || 'Без бренда'}</div>
            ${skuHtml}
            <div class="product-name">${p.name}</div>
            <div class="product-price">${priceDisplay}</div>
            <button class="btn-cart" onclick="event.stopPropagation(); alert('Добавлено в корзину!')">В корзину</button>
        `;
        grid.appendChild(card);
    });

    renderPagination(totalPages, currentPage);
}

function renderPagination(totalPages, current) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    
    if (totalPages <= 1) return; 

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = 'Назад';
    prevBtn.disabled = current === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) { 
            currentPage--; 
            renderProducts(false); 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
    });
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === current ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderProducts(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Вперед';
    nextBtn.disabled = current === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) { 
            currentPage++; 
            renderProducts(false); 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
    });
    container.appendChild(nextBtn);
}

function openModal(productId) {
    const p = allProducts.find(item => item.id === productId);
    if (!p) return;

    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-body-content');

    const formattedPrice = formatPrice(p.price);
    const priceDisplay = formattedPrice === 'Цена по запросу' ? formattedPrice : `${formattedPrice} ₽`;
    const skuDisplay = p.partNumber ? `<div class="product-sku">Арт. ${p.partNumber}</div>` : '';

    // Таблица характеристик
    let charsHtml = '';
    if (p.series) charsHtml += `<tr><th>Серия</th><td>${p.series}</td></tr>`;
    if (p.colors && p.colors.length > 0) charsHtml += `<tr><th>Цвет</th><td>${p.colors.join(', ')}</td></tr>`;
    if (p.appointment) charsHtml += `<tr><th>Назначение</th><td>${p.appointment}</td></tr>`;
    if (p.consistency) charsHtml += `<tr><th>Консистенция</th><td>${p.consistency}</td></tr>`;
    if (p.viscosity) charsHtml += `<tr><th>Вязкость</th><td>${p.viscosity}</td></tr>`;
    if (p.curing) charsHtml += `<tr><th>Отверждение</th><td>${p.curing}</td></tr>`;
    if (p.materialType) charsHtml += `<tr><th>Тип материала</th><td>${p.materialType}</td></tr>`;
    if (p.packaging) charsHtml += `<tr><th>Форма выпуска</th><td>${p.packaging}</td></tr>`;
    if (p.selfEtching) charsHtml += `<tr><th>Самопротравливающийся</th><td>${p.selfEtching}</td></tr>`;
    if (p.hardness) charsHtml += `<tr><th>Твёрдость</th><td>${p.hardness}</td></tr>`;
    if (p.purposes && p.purposes.length > 0) charsHtml += `<tr><th>Предназначение</th><td>${p.purposes.join('<br>')}</td></tr>`;
    if (p.specializations && p.specializations.length > 0) charsHtml += `<tr><th>Подходит для</th><td>${p.specializations.join(', ')}</td></tr>`;
    if (p.specializations && p.specializations.length > 0) charsHtml += `<tr><th>Подходит для</th><td>${p.specializations.join(', ')}</td></tr>`;
    const charsTable = charsHtml ? `<table class="char-table"><tbody>${charsHtml}</tbody></table>` : '<p style="margin-top:20px;color:#7f8c8d;">Нет дополнительных характеристик</p>';

    content.innerHTML = `
        <div class="modal-grid">
            <div class="modal-image-col">
                <img src="${p.image || 'https://via.placeholder.com/400?text=Нет+фото'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400?text=Нет+фото'">
            </div>
            <div class="modal-info-col">
                <div class="product-brand" style="margin-bottom:10px;">${p.brand || 'Без бренда'}</div>
                ${skuDisplay}
                <h2 class="modal-title">${p.name}</h2>
                <div class="modal-price">${priceDisplay}</div>
                <button class="btn-cart" style="width: 100%; font-size: 16px;">Добавить в корзину</button>
                ${charsTable}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}