/**
 * map.js - Mapbox inicijalizacija i renderiranje
 */

// Inicijaliziraj mapu
function initMap() {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    AppState.map = new mapboxgl.Map({
        container: 'map',
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        pitch: 0,
        bearing: 0
    });

    AppState.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    
    return AppState.map;
}

// Izgradi legendu
function buildLegend(maxVol = 50000, isRelative = false) {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = '';
    const scaleFactor = isRelative ? maxVol / 50000 : 1;

    COLOR_SCALE.forEach(range => {
        const min = Math.round(range.min * scaleFactor);
        const max = range.max === Infinity ? Infinity : Math.round(range.max * scaleFactor);

        const label = max === Infinity
            ? `${formatNumber(min)}+`
            : `${formatNumber(min)} – ${formatNumber(max)}`;

        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background:${range.color}"></div>
            <span class="legend-label">${label}</span>
        `;
        legendContainer.appendChild(item);
    });
}

// Postavi vidljivost prometnog sloja
function setTrafficVisibility(isVisible) {
    AppState.showTraffic = isVisible;
    const vis = isVisible ? 'visible' : 'none';
    if (AppState.map.getLayer('traffic-lines-glow')) {
        AppState.map.setLayoutProperty('traffic-lines-glow', 'visibility', vis);
    }
    if (AppState.map.getLayer('traffic-lines-main')) {
        AppState.map.setLayoutProperty('traffic-lines-main', 'visibility', vis);
    }
}

// Postavi vidljivost sloja sudara
function setCollisionVisibility(isVisible) {
    AppState.showCollisions = isVisible;
    const vis = isVisible ? 'visible' : 'none';
    if (AppState.map.getLayer('collision-glow')) {
        AppState.map.setLayoutProperty('collision-glow', 'visibility', vis);
    }
    if (AppState.map.getLayer('collision-circles')) {
        AppState.map.setLayoutProperty('collision-circles', 'visibility', vis);
    }
}

// Prikaži podatke za određeni sat
function displayHourData(hour) {
    const hourMap = AppState.allHourlyData.get(hour);
    if (!hourMap) {
        renderTraffic([]);
        return;
    }

    const features = [];
    let maxDisplayVol = 1;

    // Nađi maksimalni volumen
    hourMap.forEach(segment => {
        const avgPerInterval = segment.totalVolume / segment.countRecords;
        const hourlyVolume = avgPerInterval * 4;
        if (hourlyVolume > maxDisplayVol) maxDisplayVol = hourlyVolume;
    });

    // Izgradi features
    hourMap.forEach(segment => {
        const lionData = AppState.streetGeometryCache.get(segment.segmentId);
        if (!lionData || !lionData.geometry) return;

        const avgPerInterval = segment.totalVolume / segment.countRecords;
        const hourlyVolume = avgPerInterval * 4;
        const scaledForStyle = (hourlyVolume / maxDisplayVol) * 50000;

        features.push({
            type: 'Feature',
            geometry: lionData.geometry,
            properties: {
                segmentId: segment.segmentId,
                boro: segment.boro,
                street: segment.street || lionData.street,
                fromSt: segment.fromSt,
                toSt: segment.toSt,
                direction: segment.direction,
                hourlyVolume: Math.round(hourlyVolume),
                displayVolume: hourlyVolume,
                color: getColorForVolume(scaledForStyle),
                lineWidth: getLineWidth(scaledForStyle)
            }
        });
    });

    AppState.currentData = features;
    renderTraffic(features);

    const dataNoteEl = document.getElementById('dataNote');
    if (dataNoteEl) {
        dataNoteEl.textContent = `${features.length.toLocaleString()} streets @ ${formatHour(hour)}`;
    }
}

// Renderiraj prometne linije
function renderTraffic(features) {
    const map = AppState.map;
    const geojson = { type: 'FeatureCollection', features };
    const maxVol = features.length > 0 
        ? Math.max(...features.map(f => f.properties.displayVolume || 0), 1) 
        : 1;

    if (map.getSource('traffic-lines')) {
        map.getSource('traffic-lines').setData(geojson);
    } else {
        map.addSource('traffic-lines', { type: 'geojson', data: geojson });

        // Glow sloj
        map.addLayer({
            id: 'traffic-lines-glow',
            type: 'line',
            source: 'traffic-lines',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': ['get', 'color'],
                'line-width': ['interpolate', ['linear'], ['zoom'], 
                    10, ['*', ['get', 'lineWidth'], 2], 
                    14, ['*', ['get', 'lineWidth'], 2.5], 
                    18, ['*', ['get', 'lineWidth'], 3]
                ],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.15, 14, 0.2, 18, 0.25],
                'line-blur': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 5, 18, 7]
            }
        });

        // Glavni sloj
        map.addLayer({
            id: 'traffic-lines-main',
            type: 'line',
            source: 'traffic-lines',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': ['get', 'color'],
                'line-width': ['interpolate', ['linear'], ['zoom'], 
                    10, ['/', ['get', 'lineWidth'], 2], 
                    14, ['get', 'lineWidth'], 
                    18, ['*', ['get', 'lineWidth'], 1.5]
                ],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 14, 0.9, 18, 1]
            }
        });
    }

    // Ažuriraj legendu i statistike
    const hasFilters = AppState.selectedBoroughs.size > 0 || AppState.selectedRange !== 'all';
    buildLegend(maxVol, hasFilters);

    const totalVol = features.reduce((sum, f) => sum + (f.properties.displayVolume || 0), 0);
    document.getElementById('totalSegments').textContent = formatNumber(features.length);
    document.getElementById('totalVolume').textContent = formatNumber(totalVol);
    document.getElementById('avgVolume').textContent = features.length > 0 
        ? formatNumber(totalVol / features.length) 
        : '0';

    setTrafficVisibility(AppState.showTraffic);

    // Drži sudare na vrhu
    if (map.getLayer('collision-glow')) map.moveLayer('collision-glow');
    if (map.getLayer('collision-circles')) map.moveLayer('collision-circles');
}

// Ažuriraj sloj sudara za sat
function updateCollisionLayerForHour(hour) {
    const map = AppState.map;
    if (!map.getSource('collisions')) return;

    if (!AppState.showCollisions) {
        map.getSource('collisions').setData({ type: 'FeatureCollection', features: [] });
        return;
    }

    const records = AppState.collisionsByHour.get(hour) || [];

    const features = records
        .filter(r => r.latitude && r.longitude)
        .map(r => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)]
            },
            properties: {
                crash_date: r.crash_date || '',
                crash_time: r.crash_time || '',
                borough: r.borough || '',
                injured: r.number_of_persons_injured || 0,
                killed: r.number_of_persons_killed || 0,
                on_street: r.on_street_name || '',
                cross_street: r.cross_street_name || ''
            }
        }));

    map.getSource('collisions').setData({ type: 'FeatureCollection', features });
    setCollisionVisibility(AppState.showCollisions);
}

// Postavi slojeve sudara na mapi
function setupCollisionLayers(map) {
    if (!map.getSource('collisions')) {
        map.addSource('collisions', { 
            type: 'geojson', 
            data: { type: 'FeatureCollection', features: [] } 
        });
    }

    if (!map.getLayer('collision-glow')) {
        map.addLayer({
            id: 'collision-glow',
            type: 'circle',
            source: 'collisions',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 13, 14, 16, 22],
                'circle-color': '#ef4444',
                'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.15, 13, 0.2, 16, 0.25],
                'circle-blur': 1
            }
        });
    }

    if (!map.getLayer('collision-circles')) {
        map.addLayer({
            id: 'collision-circles',
            type: 'circle',
            source: 'collisions',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 13, 6, 16, 10],
                'circle-color': '#ef4444',
                'circle-opacity': 0.85,
                'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 13, 2, 16, 2.5],
                'circle-stroke-color': 'rgba(255, 255, 255, 0.7)',
                'circle-stroke-opacity': 0.9
            }
        });
    }

    // Popup za sudare
    map.on('click', 'collision-circles', (e) => {
        if (!e.features || !e.features.length) return;
        const f = e.features[0];
        const p = f.properties || {};
        const coords = f.geometry.coordinates.slice();

        new mapboxgl.Popup()
            .setLngLat(coords)
            .setHTML(`
                <div style="font-weight:700; margin-bottom:6px;">⚠️ Collision</div>
                <div><b>Date:</b> ${p.crash_date || '-'}</div>
                <div><b>Time:</b> ${p.crash_time || '-'}</div>
                <div><b>Borough:</b> ${p.borough || '-'}</div>
                <div><b>Injured:</b> ${p.injured || 0}</div>
                <div><b>Killed:</b> ${p.killed || 0}</div>
            `)
            .addTo(map);

        e.originalEvent.stopPropagation();
    });

    map.on('mouseenter', 'collision-circles', () => { 
        map.getCanvas().style.cursor = 'pointer'; 
    });
    map.on('mouseleave', 'collision-circles', () => { 
        map.getCanvas().style.cursor = ''; 
    });
}
