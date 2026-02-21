/**
 * state.js - Globalno stanje aplikacije
 */

const AppState = {
    // Podaci
    allHourlyData: new Map(),
    collisionsByHour: new Map(),
    streetGeometryCache: new Map(),
    currentData: [],
    
    // Status
    lionDataLoaded: false,
    isLoading: false,
    isPlaying: false,
    playInterval: null,
    playSpeed: 1000,
    
    // Vidljivost slojeva
    showTraffic: true,
    showCollisions: true,
    
    // Filteri
    selectedBoroughs: new Set(),
    selectedDate: null,
    selectedRange: 'all',
    
    // Mapbox instanca
    map: null
};
