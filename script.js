const API_BASE = '/api';

// ========================================
// DOM ELEMENTS
// ========================================
const fabBtn = document.getElementById('fabBtn');
const addModal = document.getElementById('addModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const addSiteBtn = document.getElementById('addSiteBtn');
const siteNameInput = document.getElementById('siteName');
const siteUrlInput = document.getElementById('siteUrl');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const sitesList = document.getElementById('sitesList');
const emptyState = document.getElementById('emptyState');
const siteCount = document.getElementById('siteCount');

let sites = [];
let currentQuery = '';

// ========================================
// INITIALIZATION
// ========================================
async function init() {
    attachEventListeners();
    await loadSites();
}

// ========================================
// API
// ========================================
async function loadSites(query = '') {
    try {
        const url = query
            ? `${API_BASE}/sites?q=${encodeURIComponent(query)}`
            : `${API_BASE}/sites`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        sites = await response.json();
        renderSites();
    } catch (error) {
        console.error('Error loading sites:', error);
        showSnackbar('Failed to load sites', 'error');
        sites = [];
        renderSites();
    }
}

async function createSite(name, url, description) {
    const response = await fetch(`${API_BASE}/sites`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            url,
            description
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to add site');
    }

    return data;
}

async function removeSite(id) {
    const response = await fetch(`${API_BASE}/sites/${id}`, {
        method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete site');
    }

    return data;
}

// ========================================
// MODAL MANAGEMENT
// ========================================
function openModal() {
    addModal.classList.add('show');
    siteNameInput.focus();
    document.body.style.overflow = 'hidden';
}

function closeModalDialog() {
    addModal.classList.remove('show');

    siteNameInput.value = '';
    siteUrlInput.value = '';

    const descriptionInput = document.getElementById('siteDescription');
    if (descriptionInput) {
        descriptionInput.value = '';
    }

    document.body.style.overflow = '';
}

// ========================================
// SITE MANAGEMENT
// ========================================
async function addSite() {
    const name = siteNameInput.value.trim();
    const url = siteUrlInput.value.trim();

    const descriptionInput = document.getElementById('siteDescription');
    const description = descriptionInput
        ? descriptionInput.value.trim()
        : '';

    if (!name) {
        showSnackbar('Please enter a site name', 'error');
        siteNameInput.focus();
        return;
    }

    if (!url) {
        showSnackbar('Please enter a site URL', 'error');
        siteUrlInput.focus();
        return;
    }

    if (!isValidUrl(url)) {
        showSnackbar('Please enter a valid URL', 'error');
        siteUrlInput.focus();
        return;
    }

    addSiteBtn.disabled = true;

    try {
        await createSite(name, url, description);

        closeModalDialog();

        await loadSites(currentQuery);

        showSnackbar('Site added successfully');
    } catch (error) {
        console.error('Error adding site:', error);
        showSnackbar(error.message, 'error');
    } finally {
        addSiteBtn.disabled = false;
    }
}

async function deleteSite(id) {
    const site = sites.find(s => s.id === id);

    if (!site) {
        return;
    }

    if (!confirm(`Delete "${site.name}"?`)) {
        return;
    }

    try {
        await removeSite(id);

        await loadSites(currentQuery);

        showSnackbar('Site deleted');
    } catch (error) {
        console.error('Error deleting site:', error);
        showSnackbar(error.message, 'error');
    }
}

// ========================================
// RENDER
// ========================================
function renderSites() {
    updateSiteCount(sites.length);

    sitesList.innerHTML = '';

    if (sites.length === 0) {
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');

    sites.forEach(site => {
        sitesList.appendChild(createSiteCard(site));
    });
}

function createSiteCard(site) {
    const card = document.createElement('div');

    card.className = 'site-card';
    card.setAttribute('data-id', site.id);

    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'site-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const header = document.createElement('div');
    header.className = 'site-header';

    const info = document.createElement('div');
    info.className = 'site-info';

    const name = document.createElement('div');
    name.className = 'site-name';
    name.textContent = site.name;

    const url = document.createElement('div');
    url.className = 'site-url';
    url.textContent = site.url;

    info.appendChild(name);
    info.appendChild(url);

    if (site.description) {
        const description = document.createElement('div');
        description.className = 'site-description';
        description.textContent = site.description;
        info.appendChild(description);
    }

    const date = document.createElement('div');
    date.className = 'site-date';
    date.textContent = formatDate(site.created_at);

    info.appendChild(date);
    header.appendChild(info);
    link.appendChild(header);

    const actions = document.createElement('div');
    actions.className = 'site-actions';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon-btn';
    deleteButton.setAttribute('aria-label', 'Delete site');

    deleteButton.innerHTML =
        '<span class="material-symbols-outlined">delete</span>';

    deleteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSite(site.id);
    });

    actions.appendChild(deleteButton);

    card.appendChild(link);
    card.appendChild(actions);

    return card;
}

function updateSiteCount(count) {
    siteCount.textContent =
        `${count} ${count === 1 ? 'site' : 'sites'}`;
}

// ========================================
// SEARCH
// ========================================
async function searchSites(query) {
    const searchTerm = query.trim();

    currentQuery = searchTerm;

    clearSearchBtn.style.display =
        searchTerm ? 'flex' : 'none';

    await loadSites(searchTerm);
}

function clearSearch() {
    searchInput.value = '';
    currentQuery = '';

    clearSearchBtn.style.display = 'none';

    loadSites();

    searchInput.focus();
}

// ========================================
// EVENTS
// ========================================
function attachEventListeners() {
    fabBtn.addEventListener('click', openModal);

    closeModal.addEventListener('click', closeModalDialog);

    cancelBtn.addEventListener('click', closeModalDialog);

    addModal.addEventListener('click', (event) => {
        if (
            event.target === addModal ||
            event.target.classList.contains('modal-backdrop')
        ) {
            closeModalDialog();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (
            event.key === 'Escape' &&
            addModal.classList.contains('show')
        ) {
            closeModalDialog();
        }
    });

    addSiteBtn.addEventListener('click', addSite);

    siteNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            siteUrlInput.focus();
        }
    });

    siteUrlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addSite();
        }
    });

    searchInput.addEventListener('input', (event) => {
        searchSites(event.target.value);
    });

    const searchBtn = document.getElementById('searchBtn');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchSites(searchInput.value);
        });
    }

    const showAllBtn = document.getElementById('showAllBtn');

    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch();
        });
    }

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchSites(searchInput.value);
        }
    });

    clearSearchBtn.addEventListener('click', clearSearch);

    document.addEventListener('keydown', (event) => {
        if (
            event.key === '/' &&
            !['INPUT', 'TEXTAREA'].includes(
                document.activeElement.tagName
            )
        ) {
            event.preventDefault();
            searchInput.focus();
        }
    });
}

// ========================================
// UTILITIES
// ========================================
function isValidUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === 'http:' ||
            url.protocol === 'https:'
        );
    } catch {
        return false;
    }
}

function formatDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showSnackbar(message, type = 'success') {
    const existingSnackbar =
        document.querySelector('.snackbar');

    if (existingSnackbar) {
        existingSnackbar.remove();
    }

    const snackbar = document.createElement('div');

    snackbar.className = `snackbar ${type}`;
    snackbar.textContent = message;

    document.body.appendChild(snackbar);

    requestAnimationFrame(() => {
        snackbar.classList.add('show');
    });

    setTimeout(() => {
        snackbar.classList.remove('show');

        setTimeout(() => {
            snackbar.remove();
        }, 300);
    }, 3000);
}

// ========================================
// START
// ========================================
init();
