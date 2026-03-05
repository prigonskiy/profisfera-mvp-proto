import { state, specificFiltersConfig } from './state.js';
import { getGlobalProducts, buildCategoryTree, getProductCount, isFinalCategorySelected, getNumericPrice } from './filters.js';
import { updateUrlFromState } from './router.js'; // <-- Добавили роутер

// --- ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ (Для работы onclick в HTML) ---
window.addToCart = addToCart;
window.copySku = copySku;
window.toggleMobileMenu = toggleMobileMenu;
window.resetAllFilters = resetAllFilters;
window.openModal = openModal;
window.closeModal = closeModal;
window.switchVariationTab = switchVariationTab;

// --- УТИЛИТЫ UI ---
export function formatPrice(priceVal) {
    if (!priceVal) return 'Цена по запросу';
    let numStr = String(priceVal).replace(/\s/g, '').replace(',', '.');
    let num = parseFloat(numStr);
    if (isNaN(num)) return priceVal; 
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function addToCart(btnElement) {
    state.cartCount++;
    const counterEl = document.getElementById('cart-counter-val');
    counterEl.textContent = state.cartCount;
    counterEl.classList.remove('pop-anim');
    void counterEl.offsetWidth; 
    counterEl.classList.add('pop-anim');
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Добавлено! ✔';
    btnElement.classList.add('added');
    setTimeout(() => {
        btnElement.textContent = originalText;
        btnElement.classList.remove('added');
    }, 1500);
}

function copySku(sku, element) {
    navigator.clipboard.writeText(sku).then(() => {
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 1500);
    });
}

export function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        overlay.style.display = 'none';
    } else {
        sidebar.classList.add('active');
        overlay.style.display = 'block';
    }
}

// --- ОТРИСОВКА МЕНЮ И ФИЛЬТРОВ ---
export function populateSpecializations() {
    const specs = new Set();
    state.allProducts.forEach(p => { if (p.specializations) p.specializations.forEach(s => specs.add(s)); });
    const select = document.getElementById('global-specialization');
    [...specs].sort().forEach(spec => {
        const opt = document.createElement('option');
        opt.value = spec; opt.textContent = spec; select.appendChild(opt);
    });
}

export function applyGlobalContext() {
    const currentProducts = getGlobalProducts();
    buildCategoryTree(currentProducts);
    renderMenu();
    const contextBrands = [...new Set(currentProducts.map(p => p.brand).filter(b => b !== ''))].sort();
    renderBrandFilters(contextBrands, currentProducts);
    updateBreadcrumbs();
    renderProducts();
}

export function renderMenu() {
    const menuContainer = document.getElementById('catalog-menu');
    menuContainer.innerHTML = '';
    for (const [cat1, subcats] of Object.entries(state.categoryTree)) {
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
                    if (state.currentCat3 === cat3) li3.classList.add('active');
                    li3.addEventListener('click', (e) => {
                        e.stopPropagation(); selectCategory(cat1, cat2, cat3);
                        document.querySelectorAll('.cat-level-3 li').forEach(el => el.classList.remove('active'));
                        li3.classList.add('active');
                        if(window.innerWidth <= 992) toggleMobileMenu(); 
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
                if(!hasCat3 && window.innerWidth <= 992) toggleMobileMenu();
            });
            item2.appendChild(title2); item2.appendChild(list3); list2.appendChild(item2);
        }
        
        title1.addEventListener('click', () => {
            const isOpen = block1.classList.contains('open');
            document.querySelectorAll('.cat-level-1').forEach(el => el.classList.remove('open'));
            if (!isOpen) { block1.classList.add('open'); selectCategory(cat1, null, null); } 
            else { selectCategory(null, null, null); }
            document.querySelectorAll('.cat-level-3 li').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.cat-level-2-item').forEach(el => el.classList.remove('open'));
        });
        block1.appendChild(title1); block1.appendChild(list2); menuContainer.appendChild(block1);
    }
}

function selectCategory(cat1, cat2, cat3) {
    state.currentCat1 = cat1; state.currentCat2 = cat2; state.currentCat3 = cat3;
    state.currentPage = 1; 
    specificFiltersConfig.forEach(f => state.activeSpecificFilters[f.key] = []);
    updateBreadcrumbs(); 
    renderProducts();
    updateUrlFromState();
}

function updateBreadcrumbs() {
    const bc = document.getElementById('breadcrumbs');
    let html = '<span>Все товары</span>';
    if (state.currentCat1) html = `Каталог / <span>${state.currentCat1}</span>`;
    if (state.currentCat2) html = `Каталог / ${state.currentCat1} / <span>${state.currentCat2}</span>`;
    if (state.currentCat3) html = `Каталог / ${state.currentCat1} / ${state.currentCat2} / <span>${state.currentCat3}</span>`;
    bc.innerHTML = html;
}

function renderBrandFilters(brands, currentProducts) {
    const container = document.getElementById('brand-filters-container');
    container.innerHTML = '';
    if (brands.length === 0) return;
    brands.forEach(brand => {
        const count = currentProducts.filter(p => p.brand === brand).length;
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = brand;
        if(state.selectedBrands.includes(brand)) cb.checked = true;

        cb.addEventListener('change', (e) => {
            if (e.target.checked) state.selectedBrands.push(brand);
            else state.selectedBrands = state.selectedBrands.filter(b => b !== brand);
            state.currentPage = 1; renderProducts();
            updateUrlFromState(); 
        });
        label.appendChild(cb);
        label.insertAdjacentHTML('beforeend', ` ${brand} <span class="cat-count">(${count})</span>`);
        container.appendChild(label);
    });
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
                if (config.isArray) { val.forEach(v => { if(v) valueCounts[v] = (valueCounts[v] || 0) + 1; }); } 
                else { valueCounts[val] = (valueCounts[val] || 0) + 1; }
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
                cb.type = 'checkbox'; cb.value = val;
                if (state.activeSpecificFilters[config.key].includes(val)) cb.checked = true;
                
                cb.addEventListener('change', (e) => {
                    if (e.target.checked) state.activeSpecificFilters[config.key].push(val);
                    else state.activeSpecificFilters[config.key] = state.activeSpecificFilters[config.key].filter(v => v !== val);
                    state.currentPage = 1; renderProducts(false); 
                    updateUrlFromState();
                });
                label.appendChild(cb);
                label.insertAdjacentHTML('beforeend', ` ${val} <span class="cat-count">(${count})</span>`);
                scrollDiv.appendChild(label);
            });
            groupDiv.appendChild(scrollDiv); dynamicFiltersContainer.appendChild(groupDiv);
        }
    });

    if (hasAnyFilter) categoryFiltersBlock.style.display = 'block';
    else categoryFiltersBlock.style.display = 'none';
}

// --- ОТРИСОВКА СЕТКИ ТОВАРОВ И ТЕГОВ ---
export function renderActiveTags() {
    const container = document.getElementById('active-tags-container');
    container.innerHTML = '';
    let hasTags = false;

    const createChip = (text, onClickAction) => {
        hasTags = true;
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `<span>${text}</span> <button title="Удалить">×</button>`;
        chip.querySelector('button').onclick = onClickAction;
        container.appendChild(chip);
    };

    if (state.currentCat3) createChip(`Категория: ${state.currentCat3}`, () => selectCategory(state.currentCat1, state.currentCat2, null));
    else if (state.currentCat2) createChip(`Категория: ${state.currentCat2}`, () => selectCategory(state.currentCat1, null, null));
    else if (state.currentCat1) createChip(`Категория: ${state.currentCat1}`, () => selectCategory(null, null, null));

    state.selectedBrands.forEach(b => createChip(`Бренд: ${b}`, () => {
        state.selectedBrands = state.selectedBrands.filter(brand => brand !== b);
        state.currentPage = 1; renderProducts();
    }));

    specificFiltersConfig.forEach(config => {
        state.activeSpecificFilters[config.key].forEach(val => {
            createChip(`${config.label}: ${val}`, () => {
                state.activeSpecificFilters[config.key] = state.activeSpecificFilters[config.key].filter(v => v !== val);
                state.currentPage = 1; renderProducts();
            });
        });
    });

    if (hasTags) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'clear-all-btn';
        resetBtn.textContent = 'Сбросить всё';
        resetBtn.onclick = resetAllFilters;
        container.appendChild(resetBtn);
    }
}

export function resetAllFilters() {
    state.currentCat1 = state.currentCat2 = state.currentCat3 = null;
    state.selectedBrands = [];
    state.searchQuery = '';
    document.getElementById('search-input').value = '';
    state.currentPage = 1;
    specificFiltersConfig.forEach(f => state.activeSpecificFilters[f.key] = []);
    applyGlobalContext();
    updateUrlFromState();
}

export function renderProducts(rebuildFilters = true) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const contextProducts = getGlobalProducts();

    let filteredBase = contextProducts.filter(p => {
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

    if (state.searchQuery !== '') renderMenu();
    renderActiveTags();
    
    const contextBrands = [...new Set(contextProducts.map(p => p.brand).filter(b => b !== ''))].sort();
    renderBrandFilters(contextBrands, filteredBase);

    if (rebuildFilters) {
        if (isFinalCategorySelected()) buildSpecificFilters(filteredBase);
        else {
            document.getElementById('category-filters').style.display = 'none';
            document.getElementById('dynamic-filters').innerHTML = '';
            specificFiltersConfig.forEach(f => state.activeSpecificFilters[f.key] = []);
        }
    }

    let fullyFiltered = filteredBase.filter(p => {
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

    // Блок сортировки внутри renderProducts
    if (state.currentSort === 'alpha-asc') fullyFiltered.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.currentSort === 'alpha-desc') fullyFiltered.sort((a, b) => b.name.localeCompare(a.name));
    else if (state.currentSort === 'price-asc') fullyFiltered.sort((a, b) => getNumericPrice(a.price) - getNumericPrice(b.price));
    else if (state.currentSort === 'price-desc') fullyFiltered.sort((a, b) => {
        let pA = getNumericPrice(a.price) === Infinity ? 0 : getNumericPrice(a.price);
        let pB = getNumericPrice(b.price) === Infinity ? 0 : getNumericPrice(b.price);
        return pB - pA;
    });

    const totalItems = fullyFiltered.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    
    if (totalItems === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>По выбранным критериям товары не найдены.</h3>
                <p style="color:#7f8c8d; margin: 15px 0;">Попробуйте изменить параметры поиска или сбросить фильтры.</p>
                <button class="clear-all-btn" onclick="resetAllFilters()">Сбросить фильтры</button>
            </div>`;
        renderPagination(0, 0);
        return;
    }

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = fullyFiltered.slice(startIndex, startIndex + state.itemsPerPage);

    paginatedItems.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.addEventListener('click', () => openModal(p.id));
        
        const formattedPrice = formatPrice(p.price);
        const priceDisplay = formattedPrice === 'Цена по запросу' ? formattedPrice : `${formattedPrice} ₽`;
        const skuHtml = p.partNumber ? `<div class="product-sku" onclick="event.stopPropagation(); copySku('${p.partNumber}', this)" title="Нажмите, чтобы скопировать">Арт. ${p.partNumber}</div>` : '';
        const productUrl = `?product=${p.id}`;
        
        const shortDescHtml = p.shortDesc ? `<div class="product-short-desc">${p.shortDesc}</div>` : '';

        // Берем миниатюру первого изображения из массива, если она есть
        const firstThumb = (p.images && p.images.length > 0) 
            ? p.images[0].thumb 
            : 'https://via.placeholder.com/250x200?text=Нет+фото';

        // ВОТ ЗДЕСЬ БЫЛА ОШИБКА: код обрывался сразу после картинки
        card.innerHTML = `
            <img src="${firstThumb}" alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/250x200?text=Нет+фото'">
            <div class="product-brand">${p.brand || 'Без бренда'}</div>
            ${skuHtml}
            <a href="${productUrl}" class="product-name" onclick="event.preventDefault(); openModal('${p.id}')">${p.name}</a>
            ${shortDescHtml}
            <div style="flex-grow:1"></div>
            <div class="product-price">${priceDisplay}</div>
            <button class="btn-cart" onclick="event.stopPropagation(); addToCart(this)">В корзину</button>
        `;
        grid.appendChild(card);
    });

    renderPagination(totalPages, state.currentPage);
}

function renderPagination(totalPages, current) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (totalPages <= 1) return; 

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn'; prevBtn.textContent = 'Назад'; prevBtn.disabled = current === 1;
    prevBtn.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; renderProducts(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === current ? 'active' : ''}`; btn.textContent = i;
        btn.addEventListener('click', () => { state.currentPage = i; renderProducts(false); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn'; nextBtn.textContent = 'Вперед'; nextBtn.disabled = current === totalPages;
    nextBtn.addEventListener('click', () => { if (state.currentPage < totalPages) { state.currentPage++; renderProducts(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    container.appendChild(nextBtn);
}

export function renderSuggestions(query) {
    const box = document.getElementById('search-suggestions');
    if (query.length < 2) { box.style.display = 'none'; return; }

    const contextProducts = getGlobalProducts();
    const matches = contextProducts.filter(p => {
        const matchesName = p.name && p.name.toLowerCase().includes(query);
        const matchesSku = p.partNumber && String(p.partNumber).toLowerCase().includes(query);
        return matchesName || matchesSku;
    }).slice(0, 6);

    if (matches.length === 0) { box.style.display = 'none'; return; }

    box.innerHTML = '';
    matches.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.onclick = () => {
            openModal(p.id);
            box.style.display = 'none';
            document.getElementById('search-input').value = p.name; 
            state.searchQuery = p.name.toLowerCase();
            renderProducts();
        };
        item.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'">
            <div class="suggestion-info">
                <div class="suggestion-name">${p.name}</div>
                <div class="suggestion-sku">Арт. ${p.partNumber || '—'}</div>
            </div>`;
        box.appendChild(item);
    });
    box.style.display = 'block';
}

export function openModal(productId, updateUrl = true) {
    const p = state.allProducts.find(item => String(item.id) === String(productId));
    if (!p) return;
    
    state.openedProductId = p.id;
    if (updateUrl) updateUrlFromState();

    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-body-content');

    const formattedPrice = formatPrice(p.price);
    const priceDisplay = formattedPrice === 'Цена по запросу' ? formattedPrice : `${formattedPrice} ₽`;
    const skuDisplay = p.partNumber ? `<div class="product-sku" onclick="copySku('${p.partNumber}', this)" title="Копировать">Арт. ${p.partNumber}</div>` : '';

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
    const charsTable = charsHtml ? `<table class="char-table"><tbody>${charsHtml}</tbody></table>` : '<p style="margin-top:20px;color:#7f8c8d;">Нет дополнительных характеристик</p>';

    // --- ЛОГИКА ДВУХУРОВНЕВОЙ ГРУППИРОВКИ (С ТАБАМИ) ---
    let variationsHtml = '';
    
    if (p.groupId) {
        const siblings = state.allProducts.filter(item => item.groupId === p.groupId);
        
        if (siblings.length > 1) {
            const groupsByDelivery = {};
            siblings.forEach(s => {
                const delivery = s.deliveryType || 'Стандартная поставка';
                if (!groupsByDelivery[delivery]) groupsByDelivery[delivery] = [];
                groupsByDelivery[delivery].push(s);
            });

            const familyNameDisplay = p.groupFamilyName ? `(${p.groupFamilyName})` : '';
            variationsHtml += `<div class="variations-block"><h3>Другие варианты ${familyNameDisplay}:</h3>`;
            
            const deliveryKeys = Object.keys(groupsByDelivery);
            
            variationsHtml += `<div class="variation-tabs">`;
            deliveryKeys.forEach((delivery, idx) => {
                const isActive = (delivery === (p.deliveryType || 'Стандартная поставка')) ? 'active' : '';
                variationsHtml += `<button class="var-tab-btn ${isActive}" onclick="switchVariationTab(${idx})">${delivery}</button>`;
            });
            variationsHtml += `</div>`;

            variationsHtml += `<div class="variation-content">`;
            deliveryKeys.forEach((delivery, idx) => {
                const isActive = (delivery === (p.deliveryType || 'Стандартная поставка'));
                const displayStyle = isActive ? 'display: flex;' : 'display: none;';
                
                variationsHtml += `<div class="variation-options-group" id="var-group-${idx}" style="${displayStyle} gap: 8px; flex-wrap: wrap;">`;
                
                groupsByDelivery[delivery].forEach(s => {
                    const isCurrentProduct = s.id === p.id ? 'active' : '';
                    const btnLabel = s.optionName ? s.optionName : `Арт. ${s.partNumber || s.id}`; 
                    
                    variationsHtml += `<button class="variation-btn ${isCurrentProduct}" onclick="openModal('${s.id}')">${btnLabel}</button>`;
                });
                variationsHtml += `</div>`;
            });
            variationsHtml += `</div></div>`; 
        }
    }

    // Собираем HTML для галереи миниатюр
    let galleryHtml = '';
    let mainImageSrc = 'https://via.placeholder.com/400?text=Нет+фото';
    
    if (p.images && p.images.length > 0) {
        mainImageSrc = p.images[0].orig; // Главная картинка - первый оригинал
        
        // Если картинок больше одной, рисуем полосу миниатюр
        if (p.images.length > 1) {
            const thumbs = p.images.map((img, index) => `
                <img src="${img.thumb}" 
                     class="${index === 0 ? 'active' : ''}"
                     onclick="document.getElementById('modal-main-image').src='${img.orig}'; 
                              document.querySelectorAll('.modal-gallery-thumbnails img').forEach(el => el.classList.remove('active'));
                              this.classList.add('active');"
                >
            `).join('');
            galleryHtml = `<div class="modal-gallery-thumbnails">${thumbs}</div>`;
        }
    }

    const modalShortDesc = p.shortDesc ? `<div style="font-size: 14px; color: #7f8c8d; margin-bottom: 15px; line-height: 1.5;">${p.shortDesc}</div>` : '';
    const modalFullDesc = p.fullDesc ? `
        <div class="product-full-desc">
            <h3>Описание</h3>
            <div>${p.fullDesc}</div>
        </div>
    ` : '';

    // ВОТ ЗДЕСЬ БЫЛА ОШИБКА: Код модалки был обрезан наполовину
    content.innerHTML = `
        <div class="modal-grid">
            <div class="modal-image-col">
                <img id="modal-main-image" src="${mainImageSrc}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400?text=Нет+фото'">
                ${galleryHtml}
            </div>
            <div class="modal-info-col">
                <div class="product-brand" style="margin-bottom:10px;">${p.brand || 'Без бренда'}</div>
                ${skuDisplay}
                <h2 class="modal-title">${p.name}</h2>
                
                ${modalShortDesc}
                
                ${variationsHtml}
                ${charsTable}
                
                ${modalFullDesc}
                
                <div class="modal-sticky-bottom">
                    <div class="modal-price">${priceDisplay}</div>
                    <button class="btn-cart" onclick="addToCart(this)">Добавить в корзину</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

export function switchVariationTab(activeIndex) {
    // Переключаем активный класс у вкладок
    const tabs = document.querySelectorAll('.var-tab-btn');
    tabs.forEach((tab, idx) => {
        if (idx === activeIndex) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    // Переключаем видимость блоков с кнопками опций
    const groups = document.querySelectorAll('.variation-options-group');
    groups.forEach((group, idx) => {
        if (idx === activeIndex) group.style.display = 'flex';
        else group.style.display = 'none';
    });
}

export function closeModal(updateUrl = true) {
    document.getElementById('product-modal').style.display = 'none';
    state.openedProductId = null;
    if (updateUrl) updateUrlFromState(); // Записываем закрытие в историю
}