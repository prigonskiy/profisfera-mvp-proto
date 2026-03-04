// Настройки фильтров
export const specificFiltersConfig = [
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

// Глобальное состояние приложения (Единый источник правды)
export const state = {
    allProducts: [], 
    categoryTree: {},
    currentCat1: null,
    currentCat2: null,
    currentCat3: null,
    selectedBrands: [],
    searchQuery: '',
    currentSort: 'default',
    currentPage: 1,
    itemsPerPage: 25, 
    currentSpecialization: 'all',
    cartCount: 0,
    activeSpecificFilters: {},
    openedProductId: null,
};

// Инициализация пустых массивов для специфических фильтров
specificFiltersConfig.forEach(f => state.activeSpecificFilters[f.key] = []);