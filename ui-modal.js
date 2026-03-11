import { state } from './state.js';
import { updateUrlFromState } from './router.js';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Генераторы HTML) ---

function buildGalleryHtml(p) {
    let galleryHtml = '';
    let mainImageSrc = 'https://via.placeholder.com/400?text=Нет+фото';
    
    if (p.images && p.images.length > 0) {
        mainImageSrc = p.images[0].orig;
        if (p.images.length > 1) {
            const thumbs = p.images.map((img, index) => `
                <img src="${img.thumb}" class="${index === 0 ? 'active' : ''}"
                     onclick="document.getElementById('modal-main-image').src='${img.orig}'; 
                              document.querySelectorAll('.modal-gallery-thumbnails img').forEach(el => el.classList.remove('active'));
                              this.classList.add('active');">
            `).join('');
            galleryHtml = `<div class="modal-gallery-thumbnails">${thumbs}</div>`;
        }
    }
    return { mainImageSrc, galleryHtml };
}

function buildCharacteristicsHtml(p) {
    let html = '';
    const addRow = (label, val) => { if (val) html += `<tr><th>${label}</th><td>${val}</td></tr>`; };
    
    addRow('Серия', p.series);
    if (p.colors?.length) addRow('Цвет', p.colors.join(', '));
    addRow('Назначение', p.appointment);
    addRow('Консистенция', p.consistency);
    addRow('Вязкость', p.viscosity);
    addRow('Отверждение', p.curing);
    addRow('Тип материала', p.materialType);
    addRow('Форма выпуска', p.packaging);
    addRow('Самопротравливающийся', p.selfEtching);
    addRow('Твёрдость', p.hardness);
    if (p.purposes?.length) addRow('Предназначение', p.purposes.join('<br>'));
    if (p.specializations?.length) addRow('Подходит для', p.specializations.join(', '));

    return html ? `<table class="char-table"><tbody>${html}</tbody></table>` : '<p style="color:#7f8c8d;">Нет дополнительных характеристик</p>';
}

function buildVariationsHtml(p) {
    if (!p.groupId) return '';
    const siblings = state.allProducts.filter(item => item.groupId === p.groupId);
    if (siblings.length <= 1) return '';

    const groupsByDelivery = {};
    siblings.forEach(s => {
        const delivery = s.deliveryType || 'Стандартная поставка';
        if (!groupsByDelivery[delivery]) groupsByDelivery[delivery] = [];
        groupsByDelivery[delivery].push(s);
    });

    const deliveryKeys = Object.keys(groupsByDelivery);
    const currentDelivery = p.deliveryType || 'Стандартная поставка';
    
    let html = `<div class="variations-block"><h3>Другие варианты ${p.groupFamilyName ? `(${p.groupFamilyName})` : ''}:</h3>`;
    
    // Табы
    html += `<div class="variation-tabs">`;
    deliveryKeys.forEach((delivery, idx) => {
        html += `<button class="var-tab-btn ${delivery === currentDelivery ? 'active' : ''}" onclick="switchVariationTab(${idx})">${delivery}</button>`;
    });
    html += `</div><div class="variation-content">`;

    // Контент табов
    deliveryKeys.forEach((delivery, idx) => {
        const isVisible = delivery === currentDelivery ? 'display: flex;' : 'display: none;';
        html += `<div class="variation-options-group" style="${isVisible} gap: 8px; flex-wrap: wrap;">`;
        groupsByDelivery[delivery].forEach(s => {
            const btnLabel = s.optionName ? s.optionName : `Арт. ${s.partNumber || s.id}`; 
            html += `<button class="variation-btn ${s.id === p.id ? 'active' : ''}" onclick="openModal('${s.id}')">${btnLabel}</button>`;
        });
        html += `</div>`;
    });

    return html + `</div></div>`;
}

// --- ОСНОВНЫЕ ФУНКЦИИ ---

export function openModal(productId, updateUrl = true) {
    const p = state.allProducts.find(item => String(item.id) === String(productId));
    if (!p) return;
    
    state.openedProductId = p.id;
    if (updateUrl) updateUrlFromState();

    const { mainImageSrc, galleryHtml } = buildGalleryHtml(p);
    const charsTable = buildCharacteristicsHtml(p);
    const variationsHtml = buildVariationsHtml(p);
    
    // Форматирование ценника (можно вынести в общий utils.js позже)
    let priceDisplay = p.price;
    if (priceDisplay && !isNaN(parseFloat(String(priceDisplay).replace(/\s/g, '').replace(',', '.')))) {
        priceDisplay = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(priceDisplay)) + ' ₽';
    } else {
        priceDisplay = 'Цена по запросу';
    }

    const skuDisplay = p.partNumber ? `<div class="product-sku" onclick="copySku('${p.partNumber}', this)">Арт. ${p.partNumber}</div>` : '';

    document.getElementById('modal-body-content').innerHTML = `
        <div class="modal-grid">
            <div class="modal-image-col">
                <img id="modal-main-image" src="${mainImageSrc}" onerror="this.src='https://via.placeholder.com/400?text=Нет+фото'">
                ${galleryHtml}
            </div>
            <div class="modal-info-col">
                <div class="product-brand" style="margin-bottom:10px;">${p.brand || 'Без бренда'}</div>
                ${skuDisplay}
                <h2 class="modal-title">${p.name}</h2>
                ${p.shortDesc ? `<div style="color: #7f8c8d; margin-bottom: 15px;">${p.shortDesc}</div>` : ''}
                ${variationsHtml}
                ${charsTable}
                ${p.fullDesc ? `<div class="product-full-desc"><h3>Описание</h3><div>${p.fullDesc}</div></div>` : ''}
                
                <div class="modal-sticky-bottom">
                    <div class="modal-price">${priceDisplay}</div>
                    <button class="btn-cart" onclick="addToCart(this)">Добавить в корзину</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('product-modal').style.display = 'flex';
}

export function closeModal(updateUrl = true) {
    document.getElementById('product-modal').style.display = 'none';
    state.openedProductId = null;
    if (updateUrl) updateUrlFromState();
}

export function switchVariationTab(activeIndex) {
    const tabs = document.querySelectorAll('.var-tab-btn');
    const groups = document.querySelectorAll('.variation-options-group');
    
    tabs.forEach((tab, idx) => tab.classList.toggle('active', idx === activeIndex));
    groups.forEach((group, idx) => group.style.display = idx === activeIndex ? 'flex' : 'none');
}

// Пробрасываем в window для HTML onclick
window.openModal = openModal;
window.closeModal = closeModal;
window.switchVariationTab = switchVariationTab;