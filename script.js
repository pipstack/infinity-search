// ========================================
// LOCAL STORAGE KEY
// ========================================
const STORAGE_KEY = 'infinitySites';

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

// ========================================
// STATE MANAGEMENT
// ========================================
let sites = [];

// ========================================
// INITIALIZATION
// ========================================
function init() {
    loadSites();
    renderSites();
    attachEventListeners();
}

// ========================================
// LOCAL STORAGE FUNCTIONS
// ========================================
function loadSites() {
    try {
        const storedSites = localStorage.getItem(STORAGE_KEY);
        sites = storedSites ? JSON.parse(storedSites) : [];
    } catch (error) {
        console.error('Error loading sites from local storage:', error);
        sites = [];
    }
}

function saveSites() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    } catch (error) {
        console.error('Error saving sites to local storage:', error);
        showSnackbar('Failed to save site', 'error');
    }
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
    document.body.style.overflow = '';
}

// ========================================
// SITE MANAGEMENT
// ========================================
function addSite() {
    const name = siteNameInput.value.trim();
    const url = siteUrlInput.value.trim();

    // Validation
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

    // Validate URL format
    if (!isValidUrl(url)) {
        showSnackbar('Please enter a valid URL', 'error');
        siteUrlInput.focus();
        return;
    }

    // Create new site object
    const newSite = {
        id: generateId(),
        name: name,
        url: url,
        createdAt: new Date().toISOString()
    };

    // Add to sites array
    sites.unshift(newSite);

    // Save to local storage
    saveSites();

    // Re-render
    renderSites();

    // Close modal
    closeModalDialog();

    // Show success feedback
    showSnackbar('Site added successfully');
}

function deleteSite(id) {
    const site = sites.find(s => s.id === id);

    if (!site) return;

    if (confirm(`Delete "${site.name}"?`)) {
        sites = sites.filter(s => s.id !== id);
        saveSites();
        renderSites();
        showSnackbar('Site deleted');
    }
}

// ========================================
// RENDER FUNCTIONS
// ========================================
function renderSites(filteredSites = null) {
    const sitesToRender = filteredSites !== null ? filteredSites : sites;

    // Update count
    updateSiteCount(sitesToRender.length);

    // Clear the list
    sitesList.innerHTML = '';

    // Show/hide empty state
    if (sitesToRender.length === 0) {
        emptyState.classList.add('show');
        return;
    } else {
        emptyState.classList.remove('show');
    }

    // Render each site
    sitesToRender.forEach(site => {
        const siteCard = createSiteCard(site);
        sitesList.appendChild(siteCard);
    });
}

function createSiteCard(site) {
    const card = document.createElement('div');
    card.className = 'site-card';
    card.setAttribute('data-id', site.id);

    card.innerHTML = `
        <a href="${escapeHtml(site.url)}" class="site-link" target="_blank" rel="noopener noreferrer">
            <div class="site-header">
                <div class="site-info">
                    <div class="site-name">${escapeHtml(site.name)}</div>
                    <div class="site-url">${escapeHtml(site.url)}</div>
                </div>
            </div>
        </a>
        <div class="site-actions">
            <button class="icon-btn" onclick="deleteSite('${site.id}')" aria-label="Delete site">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

    return card;
}

function updateSiteCount(count) {
    siteCount.textContent = `${count} ${count === 1 ? 'site' : 'sites'}`;
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================
function searchSites(query) {
    const searchTerm = query.toLowerCase().trim();

    // Show/hide clear button
    if (searchTerm) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }

    if (!searchTerm) {
        renderSites();
        return;
    }

    const filteredSites = sites.filter(site => {
        return site.name.toLowerCase().includes(searchTerm) ||
            site.url.toLowerCase().includes(searchTerm);
    });

    renderSites(filteredSites);
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderSites();
    searchInput.focus();
}

// ========================================
// EVENT LISTENERS
// ========================================
function attachEventListeners() {
    // FAB button
    fabBtn.addEventListener('click', openModal);

    // Modal controls
    closeModal.addEventListener('click', closeModalDialog);
    cancelBtn.addEventListener('click', closeModalDialog);

    // Close modal on backdrop click
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal || e.target.classList.contains('modal-backdrop')) {
            closeModalDialog();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addModal.classList.contains('show')) {
            closeModalDialog();
        }
    });

    // Add site button
    addSiteBtn.addEventListener('click', addSite);

    // Enter key on inputs
    siteNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            siteUrlInput.focus();
        }
    });

    siteUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSite();
        }
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchSites(e.target.value);
    });

    // Search button click
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchSites(searchInput.value);
        });
    }

    // Show all button click
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch();
        });
    }

    // Enter key on search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchSites(searchInput.value);
        }
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', clearSearch);

    // Focus search on '/' key
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isValidUrl(string) {
    try {
        // Check if it's a file:// URL
        if (string.startsWith('file://')) {
            return true;
        }

        // Check if it's a valid http/https URL
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
        return false;
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showSnackbar(message, type = 'success') {
    // Remove existing snackbar
    const existingSnackbar = document.querySelector('.snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }

    // Create snackbar
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar ${type}`;
    snackbar.textContent = message;

    // Add styles
    Object.assign(snackbar.style, {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ea4335' : '#202124',
        color: 'white',
        padding: '14px 24px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'Roboto, sans-serif',
        boxShadow: '0 4px 8px 3px rgba(60, 64, 67, 0.15)',
        zIndex: '2000',
        animation: 'slideUp 0.2s ease-out',
        minWidth: '288px',
        textAlign: 'center'
    });

    document.body.appendChild(snackbar);

    // Remove after 3 seconds
    setTimeout(() => {
        snackbar.style.animation = 'slideDown 0.2s ease-out';
        setTimeout(() => snackbar.remove(), 200);
    }, 3000);
}

// Add snackbar animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========================================
// START THE APP
// ========================================
init();
