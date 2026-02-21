/**
 * NYC Traffic Dashboard - Server
 * Optimizirano za Render deployment
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const compression = require('compression');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache konfiguracija - podaci se čuvaju 1 sat
const cache = new NodeCache({ 
    stdTTL: 3600,
    checkperiod: 600
});

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// NYC Open Data API endpoints
const TRAFFIC_API = 'https://data.cityofnewyork.us/resource/7ym2-wayt.json';
const COLLISION_API = 'https://data.cityofnewyork.us/resource/h9gi-nx95.json';

// Excluded segment IDs
const EXCLUDED_SEGMENT_IDS = new Set([
    '30283','93020','93009','67396','55271','106892','130630','273571','150123','155878',
    '113440','72184','96975','101308','40768','19308','105214','542','9008902','164411',
    '83469','40593','21268','93735',
]);

// ==================================================
// POMOĆNE FUNKCIJE
// ==================================================

function getCacheKey(type, params) {
    const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `${type}:${sortedParams || 'all'}`;
}

async function fetchAllRecords(baseUrl, query, maxRecords = 200000) {
    const limit = 50000;
    let offset = 0;
    let allRecords = [];
    let hasMore = true;

    while (hasMore && allRecords.length < maxRecords) {
        const url = `${baseUrl}?${query}&$limit=${limit}&$offset=${offset}`;
        console.log(`Fetching: ${url.substring(0, 100)}...`);
        
        try {
            const response = await axios.get(url, {
                timeout: 60000,
                headers: { 'Accept': 'application/json' }
            });
            
            const data = response.data;
            
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRecords = allRecords.concat(data);
                offset += limit;
                console.log(`Fetched ${allRecords.length} records...`);
            }
        } catch (error) {
            console.error('Fetch error:', error.message);
            hasMore = false;
        }
    }

    return allRecords;
}

function buildTrafficQuery(params) {
    const selectClause = `segmentid, boro, street, fromst, tost, direction, hh, SUM(vol) as total_vol, COUNT(*) as count_records`;
    const groupClause = `segmentid, boro, street, fromst, tost, direction, hh`;
    
    const whereConditions = [];
    
    if (params.boroughs && params.boroughs.length > 0) {
        const boroConditions = params.boroughs.map(b => `upper(boro)='${b.toUpperCase()}'`);
        whereConditions.push(`(${boroConditions.join(' OR ')})`);
    }
    
    if (params.startDate && params.endDate) {
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const startNum = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
        const endNum = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
        whereConditions.push(`(yr * 10000 + m * 100 + d) >= ${startNum}`);
        whereConditions.push(`(yr * 10000 + m * 100 + d) <= ${endNum}`);
    }
    
    let query = `$select=${encodeURIComponent(selectClause)}&$group=${encodeURIComponent(groupClause)}`;
    if (whereConditions.length > 0) {
        query += `&$where=${encodeURIComponent(whereConditions.join(' AND '))}`;
    }
    query += `&$order=total_vol DESC`;
    
    return query;
}

function buildCollisionQuery(params) {
    const select = [
        'crash_date','crash_time','borough',
        'latitude','longitude',
        'on_street_name','cross_street_name',
        'number_of_persons_injured','number_of_persons_killed',
        'number_of_pedestrians_injured','number_of_pedestrians_killed',
        'number_of_cyclist_injured','number_of_cyclist_killed',
        'number_of_motorist_injured','number_of_motorist_killed',
        'contributing_factor_vehicle_1','contributing_factor_vehicle_2',
        'vehicle_type_code1','vehicle_type_code2'
    ].join(',');
    
    const whereConditions = [];
    
    if (params.boroughs && params.boroughs.length > 0) {
        const boroConditions = params.boroughs.map(b => `upper(borough)='${b.toUpperCase()}'`);
        whereConditions.push(`(${boroConditions.join(' OR ')})`);
    }
    
    if (params.startDate && params.endDate) {
        whereConditions.push(`crash_date >= '${params.startDate}'`);
        whereConditions.push(`crash_date <= '${params.endDate}'`);
    }
    
    let query = `$select=${encodeURIComponent(select)}`;
    if (whereConditions.length > 0) {
        query += `&$where=${encodeURIComponent(whereConditions.join(' AND '))}`;
    }
    query += `&$order=crash_date DESC`;
    
    return query;
}

function organizeTrafficByHour(records) {
    const hourlyData = {};
    for (let h = 0; h < 24; h++) hourlyData[h] = {};
    
    records.forEach(record => {
        const hour = parseInt(record.hh) || 0;
        const rawSegId = String(record.segmentid || '');
        
        if (EXCLUDED_SEGMENT_IDS.has(rawSegId) || 
            EXCLUDED_SEGMENT_IDS.has(rawSegId.replace(/^0+/, '')) ||
            EXCLUDED_SEGMENT_IDS.has(rawSegId.padStart(7, '0'))) {
            return;
        }
        
        const segmentId = rawSegId.padStart(7, '0');
        const direction = record.direction || '';
        const totalVol = parseInt(record.total_vol) || 0;
        const countRecords = parseInt(record.count_records) || 1;
        const uniqueKey = `${segmentId}_${direction}`;
        
        if (!hourlyData[hour]) hourlyData[hour] = {};
        
        if (hourlyData[hour][uniqueKey]) {
            hourlyData[hour][uniqueKey].totalVolume += totalVol;
            hourlyData[hour][uniqueKey].countRecords += countRecords;
        } else {
            hourlyData[hour][uniqueKey] = {
                segmentId,
                boro: record.boro,
                street: record.street,
                fromSt: record.fromst,
                toSt: record.tost,
                direction,
                totalVolume: totalVol,
                countRecords
            };
        }
    });
    
    return hourlyData;
}

function organizeCollisionsByHour(records) {
    const hourlyData = {};
    for (let h = 0; h < 24; h++) hourlyData[h] = [];
    
    records.forEach(record => {
        const crashTime = record.crash_time || '00:00';
        const hour = parseInt(crashTime.split(':')[0]) || 0;
        if (hour >= 0 && hour < 24) {
            hourlyData[hour].push(record);
        }
    });
    
    return hourlyData;
}

function calculateStats(trafficByHour, collisionsByHour) {
    let totalTrafficVolume = 0;
    let totalTrafficRecords = 0;
    let totalCollisions = 0;
    const uniqueSegments = new Set();
    const boroStats = {};
    
    Object.values(trafficByHour).forEach(hourData => {
        Object.values(hourData).forEach(segment => {
            totalTrafficVolume += segment.totalVolume;
            totalTrafficRecords += segment.countRecords;
            uniqueSegments.add(segment.segmentId);
            const boro = segment.boro || 'Unknown';
            if (!boroStats[boro]) boroStats[boro] = { volume: 0, collisions: 0 };
            boroStats[boro].volume += segment.totalVolume;
        });
    });
    
    Object.values(collisionsByHour).forEach(hourCollisions => {
        totalCollisions += hourCollisions.length;
        hourCollisions.forEach(collision => {
            const boro = collision.borough || 'Unknown';
            if (!boroStats[boro]) boroStats[boro] = { volume: 0, collisions: 0 };
            boroStats[boro].collisions++;
        });
    });
    
    return {
        totalTrafficVolume,
        totalTrafficRecords,
        totalCollisions,
        uniqueSegments: uniqueSegments.size,
        avgVolumePerRecord: totalTrafficRecords > 0 ? Math.round(totalTrafficVolume / totalTrafficRecords) : 0,
        boroStats
    };
}

// ==================================================
// API ENDPOINTS
// ==================================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        cache: { keys: cache.keys().length, stats: cache.getStats() },
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.get('/api/data', async (req, res) => {
    try {
        const params = {
            boroughs: req.query.boroughs ? req.query.boroughs.split(',') : [],
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            range: req.query.range || 'all'
        };
        
        const cacheKey = getCacheKey('data', params);
        
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for: ${cacheKey}`);
            return res.json({ ...cachedData, fromCache: true, cacheKey });
        }
        
        console.log(`Cache miss for: ${cacheKey}`);
        const startTime = Date.now();
        
        const trafficQuery = buildTrafficQuery(params);
        const trafficRecords = await fetchAllRecords(TRAFFIC_API, trafficQuery);
        console.log(`Fetched ${trafficRecords.length} traffic records`);
        
        const collisionQuery = buildCollisionQuery(params);
        const collisionRecords = await fetchAllRecords(COLLISION_API, collisionQuery, 50000);
        console.log(`Fetched ${collisionRecords.length} collision records`);
        
        const trafficByHour = organizeTrafficByHour(trafficRecords);
        const collisionsByHour = organizeCollisionsByHour(collisionRecords);
        const stats = calculateStats(trafficByHour, collisionsByHour);
        
        const responseData = {
            trafficByHour,
            collisionsByHour,
            stats,
            meta: {
                trafficCount: trafficRecords.length,
                collisionCount: collisionRecords.length,
                fetchTime: Date.now() - startTime,
                params
            }
        };
        
        cache.set(cacheKey, responseData);
        res.json({ ...responseData, fromCache: false, cacheKey });
        
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/traffic', async (req, res) => {
    try {
        const params = {
            boroughs: req.query.boroughs ? req.query.boroughs.split(',') : [],
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null
        };
        
        const cacheKey = getCacheKey('traffic', params);
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json({ ...cachedData, fromCache: true });
        
        const query = buildTrafficQuery(params);
        const records = await fetchAllRecords(TRAFFIC_API, query);
        const trafficByHour = organizeTrafficByHour(records);
        
        const responseData = { trafficByHour, count: records.length };
        cache.set(cacheKey, responseData);
        res.json({ ...responseData, fromCache: false });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/collisions', async (req, res) => {
    try {
        const params = {
            boroughs: req.query.boroughs ? req.query.boroughs.split(',') : [],
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null
        };
        
        const cacheKey = getCacheKey('collisions', params);
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json({ ...cachedData, fromCache: true });
        
        const query = buildCollisionQuery(params);
        const records = await fetchAllRecords(COLLISION_API, query, 50000);
        const collisionsByHour = organizeCollisionsByHour(records);
        
        const responseData = { collisionsByHour, count: records.length };
        cache.set(cacheKey, responseData);
        res.json({ ...responseData, fromCache: false });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cache/clear', (req, res) => {
    cache.flushAll();
    res.json({ message: 'Cache cleared', stats: cache.getStats() });
});

// Pokreni server
app.listen(PORT, () => {
    console.log(`🚦 NYC Traffic Dashboard Server running on port ${PORT}`);
});

module.exports = app;
