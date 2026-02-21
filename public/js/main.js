/**
 * main.js - Glavna inicijalizacija aplikacije
 */

// Inicijalizacija kada je DOM spreman
document.addEventListener('DOMContentLoaded', () => {
    console.log('NYC Traffic Dashboard - Initializing...');
    
    // Inicijaliziraj UI komponente
    initUI();
    
    console.log('NYC Traffic Dashboard - UI initialized');
});

// Inicijalizacija kada je mapa spremna
document.addEventListener('DOMContentLoaded', () => {
    // Inicijaliziraj mapu
    const map = initMap();
    
    map.on('load', () => {
        console.log('Mapbox loaded');
        
        // Postavi collision slojeve
        setupCollisionLayers(map);
        
        // Postavi vidljivost
        setTrafficVisibility(true);
        setCollisionVisibility(true);
        
        // Dohvati početne podatke
        fetchAggregatedData(true);
    });
});

// Window resize handler
window.addEventListener('resize', () => {
    // Debounce resize
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        if (document.getElementById('analyticsDrawer')?.classList.contains('active')) {
            updateDashboardCharts();
        }
    }, 250);
});

console.log('NYC Traffic Dashboard - Scripts loaded');
