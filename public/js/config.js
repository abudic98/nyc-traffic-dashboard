/**
 * config.js - Konstante i konfiguracija
 */

// Server API URL
const API_BASE_URL = window.location.origin + '/api';

// Mapbox pristupni token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWJ1ZGljIiwiYSI6ImNta2R4cnJtbDAxNDIza3F0ZWd2anpnMXgifQ.Stqbu_SOFKTXxJkNSeF7zQ';

// Putanja do LION GeoJSON datoteke
const LION_GEOJSON_PATH = 'lion_streets.geojson';

// Ljestvica boja za obujam prometa
const COLOR_SCALE = [
    { min: 0, max: 500, color: '#22c55e', label: '0 - 500' },
    { min: 500, max: 1500, color: '#4ade80', label: '500 - 1,500' },
    { min: 1500, max: 2500, color: '#84cc16', label: '1,500 - 2,500' },
    { min: 2500, max: 3500, color: '#a3e635', label: '2,500 - 3,500' },
    { min: 3500, max: 5000, color: '#facc15', label: '3,500 - 5,000' },
    { min: 5000, max: 10000, color: '#fbbf24', label: '5,000 - 10,000' },
    { min: 10000, max: 15000, color: '#f59e0b', label: '10,000 - 15,000' },
    { min: 15000, max: 20000, color: '#f97316', label: '15,000 - 20,000' },
    { min: 20000, max: 30000, color: '#ef4444', label: '20,000 - 30,000' },
    { min: 30000, max: 40000, color: '#dc2626', label: '30,000 - 40,000' },
    { min: 40000, max: 50000, color: '#b91c1c', label: '40,000 - 50,000' },
    { min: 50000, max: Infinity, color: '#7f1d1d', label: '50,000+' }
];

// Mapiranje smjerova
const DIRECTION_MAP = {
    'NB': 'Northbound',
    'SB': 'Southbound',
    'EB': 'Eastbound',
    'WB': 'Westbound',
    'NS': 'North/South',
    'EW': 'East/West'
};

// Boje kvartova
const BORO_COLORS = {
    'Manhattan': '#f59e0b',
    'Brooklyn': '#3fb950',
    'Queens': '#58a6ff',
    'Bronx': '#f85149',
    'Staten Island': '#a371f7'
};

// Mapbox početne postavke
const MAP_CONFIG = {
    center: [-73.95, 40.73],
    zoom: 11,
    style: 'mapbox://styles/mapbox/dark-v11'
};
