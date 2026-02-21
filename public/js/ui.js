/**
 * ui.js - UI kontrole i event handleri
 */

// Animacija
function startAnimation() {
    stopAnimation();
    const hourSlider = document.getElementById('hourSlider');
    AppState.playInterval = setInterval(() => {
        let currentHour = parseInt(hourSlider.value);
        currentHour = (currentHour + 1) % 24;
        hourSlider.value = currentHour;
        updateTimeDisplay(currentHour);
        if (AppState.allHourlyData.size > 0) {
            displayHourData(currentHour);
        }
        updateCollisionLayerForHour(currentHour);
    }, AppState.playSpeed);
}

function stopAnimation() {
    if (AppState.playInterval) {
        clearInterval(AppState.playInterval);
        AppState.playInterval = null;
    }
}

// Postavi borough pills
function setupBoroPills() {
    const boroPills = document.getElementById('boroPills');
    if (!boroPills) return;
    
    boroPills.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-boro]');
        if (!btn) return;
        const boro = btn.dataset.boro;
        
        if (boro === 'all') {
            AppState.selectedBoroughs.clear();
        } else {
            if (AppState.selectedBoroughs.has(boro)) {
                AppState.selectedBoroughs.delete(boro);
            } else {
                AppState.selectedBoroughs.add(boro);
            }
        }
        
        updateBoroPillsUI();
        fetchAggregatedData(true);
    });
}

function updateBoroPillsUI() {
    const allBtn = document.querySelector('[data-boro="all"]');
    const boroBtns = document.querySelectorAll('[data-boro]:not([data-boro="all"])');
    
    if (AppState.selectedBoroughs.size === 0) {
        allBtn?.classList.add('active');
        boroBtns.forEach(btn => btn.classList.remove('active'));
    } else {
        allBtn?.classList.remove('active');
        boroBtns.forEach(btn => {
            btn.classList.toggle('active', AppState.selectedBoroughs.has(btn.dataset.boro));
        });
    }
}

// Postavi layer toggles
function setupLayerToggles() {
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer;
            btn.classList.toggle('active');

            if (layer === 'traffic') {
                AppState.showTraffic = btn.classList.contains('active');
                setTrafficVisibility(AppState.showTraffic);
            }
            if (layer === 'collisions') {
                AppState.showCollisions = btn.classList.contains('active');
                setCollisionVisibility(AppState.showCollisions);
            }
        });
    });
}

// Postavi quick select buttons
function setupQuickSelect() {
    const quickBtns = document.querySelectorAll('.quick-btn');
    
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            quickBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedRange = btn.dataset.days;
            updateDateRangeDisplay();
        });
    });
}

// Postavi date filter
function setupDateFilter() {
    const dateInput = document.getElementById('dateFilter');
    if (!dateInput) return;
    
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    AppState.selectedDate = today;
    
    dateInput.addEventListener('change', () => {
        AppState.selectedDate = dateInput.value || null;
        updateDateRangeDisplay();
    });
}

// Postavi time slider
function setupTimeSlider() {
    const hourSlider = document.getElementById('hourSlider');
    if (!hourSlider) return;
    
    hourSlider.addEventListener('input', (e) => {
        updateTimeDisplay(e.target.value);
        const h = parseInt(e.target.value);
        if (AppState.allHourlyData.size > 0) {
            displayHourData(h);
        }
        updateCollisionLayerForHour(h);
    });
}

// Postavi play/pause kontrole
function setupPlayControls() {
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');

    if (!playBtn) return;

    playBtn.addEventListener('click', () => {
        AppState.isPlaying = !AppState.isPlaying;

        if (AppState.isPlaying) {
            playBtn.classList.add('active');
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            startAnimation();
        } else {
            playBtn.classList.remove('active');
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            stopAnimation();
        }
    });

    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.playSpeed = parseInt(btn.dataset.speed);
            if (AppState.isPlaying) startAnimation();
        });
    });
}

// Postavi analytics drawer
function setupAnalyticsDrawer() {
    const analyticsBtn = document.getElementById('analyticsBtn');
    const drawer = document.getElementById('analyticsDrawer');
    const overlay = document.getElementById('analyticsOverlay');
    const closeBtn = document.getElementById('analyticsCloseBtn');

    const openDrawer = () => {
        drawer?.classList.add('active');
        drawer?.setAttribute('aria-hidden', 'false');
        overlay?.classList.add('active');
        overlay?.setAttribute('aria-hidden', 'false');
        
        // Re-renderaj grafove
        setTimeout(() => updateDashboardCharts(), 50);
        setTimeout(() => updateDashboardCharts(), 200);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
    };

    const closeDrawer = () => {
        drawer?.classList.remove('active');
        drawer?.setAttribute('aria-hidden', 'true');
        overlay?.classList.remove('active');
        overlay?.setAttribute('aria-hidden', 'true');
    };

    analyticsBtn?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
}

// Postavi refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchAggregatedData(true);
        });
    }
}

// Inicijaliziraj sve UI komponente
function initUI() {
    setupBoroPills();
    setupLayerToggles();
    setupQuickSelect();
    setupDateFilter();
    setupTimeSlider();
    setupPlayControls();
    setupAnalyticsDrawer();
    setupRefreshButton();
    updateDateRangeDisplay();
    updateTimeDisplay(12);
}
