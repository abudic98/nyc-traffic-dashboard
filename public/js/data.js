/**
 * data.js - Dohvaćanje podataka sa servera
 */

// Učitaj LION geometriju
async function loadLionData() {
    if (AppState.lionDataLoaded) return true;

    try {
        updateProgress('Loading LION street geometry...', 5);
        const response = await axios.get(LION_GEOJSON_PATH);
        const geojson = response.data;
        
        if (!geojson.features || geojson.features.length === 0) {
            throw new Error('LION GeoJSON has no features');
        }

        updateProgress(`Indexing ${geojson.features.length.toLocaleString()} street segments...`, 10);

        let indexed = 0;
        geojson.features.forEach(feature => {
            if (feature.properties && feature.geometry) {
                const segId = feature.properties.segmentid;
                if (segId && !AppState.streetGeometryCache.has(segId)) {
                    AppState.streetGeometryCache.set(segId, {
                        geometry: feature.geometry,
                        street: feature.properties.Street || feature.properties.street || '',
                        trafDir: feature.properties.TrafDir || ''
                    });
                    indexed++;
                }
            }
        });

        console.log(`Indexed ${indexed} unique segments from LION data`);
        AppState.lionDataLoaded = true;
        return true;

    } catch (error) {
        console.error('Error loading LION data:', error);
        const errorMsg = axios.isAxiosError(error) ? `HTTP ${error.response?.status}` : error.message;
        updateProgress(`Error loading LION: ${errorMsg}`, 0);
        return false;
    }
}

// Dohvati agregirane podatke sa servera
async function fetchAggregatedData(showLoading = true) {
    if (AppState.isLoading) return;

    AppState.isLoading = true;
    setStatus(true);

    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Loading...';

    if (showLoading) {
        document.getElementById('loading').classList.remove('hidden');
    }

    try {
        // Korak 1: Učitaj LION geometriju
        if (!AppState.lionDataLoaded) {
            const lionLoaded = await loadLionData();
            if (!lionLoaded) throw new Error('Failed to load LION street geometry');
        }

        updateProgress('Fetching data from server...', 20);
        updateDateRangeDisplay();

        // Korak 2: Izgradi parametre za server API
        const dateRange = getDateRange();
        const params = {
            boroughs: AppState.selectedBoroughs.size > 0 ? [...AppState.selectedBoroughs].join(',') : undefined,
            startDate: dateRange?.startISO,
            endDate: dateRange?.endISO,
            range: AppState.selectedRange
        };

        // Korak 3: Dohvati podatke sa servera
        const startTime = Date.now();
        const response = await axios.get(`${API_BASE_URL}/data`, {
            params: params,
            timeout: 120000
        });
        
        const data = response.data;
        const fetchTime = Date.now() - startTime;

        console.log(`Data fetched in ${fetchTime}ms`, data.fromCache ? '(from cache)' : '(fresh)');
        
        updateProgress('Processing data...', 70);

        // Korak 4: Konvertiraj server podatke u Maps
        AppState.allHourlyData.clear();
        for (let h = 0; h < 24; h++) {
            const hourData = data.trafficByHour[h] || {};
            AppState.allHourlyData.set(h, new Map(Object.entries(hourData)));
        }

        AppState.collisionsByHour.clear();
        for (let h = 0; h < 24; h++) {
            AppState.collisionsByHour.set(h, data.collisionsByHour[h] || []);
        }

        // Korak 5: Renderiranje
        updateProgress('Rendering map...', 95);
        const currentHour = parseInt(document.getElementById('hourSlider').value);
        displayHourData(currentHour);
        updateCollisionLayerForHour(currentHour);

        // Ažuriraj statistike
        const meta = data.meta || {};
        const dataNoteEl = document.getElementById('dataNote');
        if (dataNoteEl) {
            const cacheIndicator = data.fromCache ? ' ⚡' : '';
            dataNoteEl.textContent = `${formatNumber(meta.trafficCount || 0)} traffic records | ${formatNumber(meta.collisionCount || 0)} collisions${cacheIndicator}`;
        }
        
        updateProgress('Complete!', 100);

        // Ažuriraj grafove
        updateDashboardCharts();

    } catch (error) {
        console.error('Error fetching data:', error);
        const errorMsg = axios.isAxiosError(error) 
            ? (error.response?.data?.error || error.message)
            : error.message;
        updateProgress(`Error: ${errorMsg}`, 0);
        
        const dataNoteEl = document.getElementById('dataNote');
        if (dataNoteEl) dataNoteEl.textContent = `Error: ${errorMsg}`;
    }

    if (showLoading) {
        setTimeout(() => document.getElementById('loading').classList.add('hidden'), 500);
    }

    AppState.isLoading = false;
    setStatus(false);
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Apply Filters';
}
