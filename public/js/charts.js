/**
 * charts.js - D3.js grafovi za Analytics panel
 */

// Tooltip funkcije

// Pomoćne funkcije za tooltip
function createTooltip() {
    let tooltip = document.getElementById('chartTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chartTooltip';
        tooltip.className = 'chart-tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function showTooltip(event, content) {
    const tooltip = createTooltip();
    tooltip.innerHTML = content;
    tooltip.classList.add('visible');
    
    // Pozicioniraj tooltip
    const x = event.clientX + 15;
    const y = event.clientY - 10;
    
    // Prilagodi ako je preblizu desnom rubu
    const tooltipWidth = 200;
    const adjustedX = (x + tooltipWidth > window.innerWidth) ? event.clientX - tooltipWidth - 15 : x;
    
    tooltip.style.left = adjustedX + 'px';
    tooltip.style.top = y + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('chartTooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

function formatFullNumber(num) {
    return Math.round(num).toLocaleString();
}

// Ažuriraj sve Grafovi kontrolne ploče
function updateDashboardCharts() {
    requestAnimationFrame(() => {
        updateHeaderStats();
        updateInjuryStats();
        // Grafovi prometa
        updateBoroChart();
        updateTrafficHourChart();
        updateTrafficDirectionChart();
        updateTopStreetsList();
        // Grafovi sudara
        updateCollisionChart();
        updateCollisionBoroChart();
        updateVehicleTypesGrid();
        updateFactorsList();
        updateMonthlyTrendChart();
        updateWeeklyHeatmap();
    });
}

// Ažuriraj statistike zaglavlja
function updateHeaderStats() {
    let trafficRecords = 0;
    let totalVehicles = 0;
    let uniqueSegments = new Set();
    
    AppState.allHourlyData.forEach(hourMap => {
        hourMap.forEach(segment => {
            trafficRecords += segment.countRecords;
            totalVehicles += segment.totalVolume;
            uniqueSegments.add(segment.segmentId);
        });
    });
    
    let collisionRecords = 0;
    AppState.collisionsByHour.forEach(arr => {
        collisionRecords += arr.length;
    });
    
    // Izračunaj prosječan 15-minutni obujam
    const avgVolume = trafficRecords > 0 ? Math.round(totalVehicles / trafficRecords) : 0;
    
    document.getElementById('headerTrafficRecords').textContent = formatNumber(trafficRecords);
    document.getElementById('headerCollisionRecords').textContent = formatNumber(collisionRecords);
    document.getElementById('totalCollisions').textContent = formatNumber(collisionRecords);
    document.getElementById('avgVolume').textContent = formatNumber(avgVolume);
    document.getElementById('totalVolume').textContent = formatNumber(totalVehicles);
    document.getElementById('totalSegments').textContent = formatNumber(uniqueSegments.size);
}

// NOVO: Statistika ozljeda
function updateInjuryStats() {
    const container = document.getElementById('injuryStats');
    if (!container) return;
    
    let totalKilled = 0;
    let totalInjured = 0;
    let pedestriansAffected = 0;
    let cyclistsAffected = 0;
    let motoristsAffected = 0;
    
    AppState.collisionsByHour.forEach(arr => {
        arr.forEach(collision => {
            totalKilled += parseInt(collision.number_of_persons_killed) || 0;
            totalInjured += parseInt(collision.number_of_persons_injured) || 0;
            
            pedestriansAffected += (parseInt(collision.number_of_pedestrians_injured) || 0) + 
                                   (parseInt(collision.number_of_pedestrians_killed) || 0);
            cyclistsAffected += (parseInt(collision.number_of_cyclist_injured) || 0) + 
                                (parseInt(collision.number_of_cyclist_killed) || 0);
            motoristsAffected += (parseInt(collision.number_of_motorist_injured) || 0) + 
                                 (parseInt(collision.number_of_motorist_killed) || 0);
        });
    });
    
    container.innerHTML = `
        <div class="injury-stat-card fatal">
            <div class="injury-stat-value">${formatNumber(totalKilled)}</div>
            <div class="injury-stat-label">Fatalities</div>
        </div>
        <div class="injury-stat-card injured">
            <div class="injury-stat-value">${formatNumber(totalInjured)}</div>
            <div class="injury-stat-label">Injuries</div>
        </div>
        <div class="injury-stat-card pedestrian">
            <div class="injury-stat-value">${formatNumber(pedestriansAffected)}</div>
            <div class="injury-stat-label">Pedestrians</div>
        </div>
        <div class="injury-stat-card cyclist">
            <div class="injury-stat-value">${formatNumber(cyclistsAffected)}</div>
            <div class="injury-stat-label">Cyclists</div>
        </div>
        <div class="injury-stat-card motorist">
            <div class="injury-stat-value">${formatNumber(motoristsAffected)}</div>
            <div class="injury-stat-label">Motorists</div>
        </div>
    `;
}

// Graf distribucije po kvartovima
function updateBoroChart() {
    const container = document.getElementById('boroChart');
    if (!container) return;
    container.innerHTML = '';

    // Koristi fiksne dimenzije za pouzdano renderiranje - jednake lijeve/desne margine
    const margin = { top: 15, right: 50, bottom: 45, left: 50 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 120;

    // Agregiraj po kvartu kroz sve sate
    const boroVolumes = {};
    const boroSegments = {};
    AppState.allHourlyData.forEach(hourMap => {
        hourMap.forEach(segment => {
            const boro = segment.boro || 'Unknown';
            const avgPerInterval = segment.totalVolume / segment.countRecords;
            boroVolumes[boro] = (boroVolumes[boro] || 0) + avgPerInterval * 4;
            boroSegments[boro] = (boroSegments[boro] || new Set()).add(segment.segmentId);
        });
    });

    // Izračunaj ukupno za postotke
    const totalVolume = Object.values(boroVolumes).reduce((a, b) => a + b, 0);

    const boroData = Object.entries(boroVolumes)
        .map(([boro, volume]) => ({ 
            boro, 
            volume,
            segments: boroSegments[boro]?.size || 0,
            percentage: ((volume / totalVolume) * 100).toFixed(1)
        }))
        .filter(d => d.boro !== 'Unknown')
        .sort((a, b) => b.volume - a.volume);

    if (boroData.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">No traffic data available</div>';
        return;
    }

    const subtitleEl = document.getElementById('boroChartSubtitle');
    if (subtitleEl) subtitleEl.textContent = `${boroData.length} boroughs`;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(boroData.map(d => d.boro))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(boroData, d => d.volume) * 1.1])
        .range([height, 0]);

    // Stupci s tooltipom
    svg.selectAll('.bar')
        .data(boroData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.boro))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.volume))
        .attr('height', d => height - y(d.volume))
        .attr('fill', d => BORO_COLORS[d.boro] || '#888')
        .attr('rx', 4)
        .on('mousemove', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(event, `
                <div class="chart-tooltip-title">${d.boro}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Traffic Volume</span>
                    <span class="chart-tooltip-value">${formatFullNumber(d.volume)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Share of Total</span>
                    <span class="chart-tooltip-value">${d.percentage}%</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Street Segments</span>
                    <span class="chart-tooltip-value blue">${formatFullNumber(d.segments)}</span>
                </div>
            `);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        });

    // Oznake vrijednosti na vrhu stupaca
    svg.selectAll('.bar-label')
        .data(boroData)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.boro) + x.bandwidth() / 2)
        .attr('y', d => y(d.volume) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b949e')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d => formatChartNumber(d.volume));

    // X Os - puna imena kvarta s rotacijom
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-25)')
        .style('text-anchor', 'end')
        .style('font-size', '9px');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => formatChartNumber(d)));
}

// Graf obujma prometa po satu
function updateTrafficHourChart() {
    const container = document.getElementById('trafficHourChart');
    if (!container) return;
    container.innerHTML = '';

    const margin = { top: 15, right: 50, bottom: 35, left: 50 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 120;

    // Agregiraj obujam prometa po satu
    const hourlyVolumes = Array(24).fill(0);
    const hourlyCounts = Array(24).fill(0);
    
    AppState.allHourlyData.forEach((hourMap, hour) => {
        hourMap.forEach(segment => {
            hourlyVolumes[hour] += segment.totalVolume;
            hourlyCounts[hour] += segment.countRecords;
        });
    });

    const trafficData = [];
    let totalVolume = 0;
    for (let h = 0; h < 24; h++) {
        const avgVolume = hourlyCounts[h] > 0 ? hourlyVolumes[h] / hourlyCounts[h] : 0;
        totalVolume += avgVolume;
        trafficData.push({ hour: h, volume: avgVolume, totalVol: hourlyVolumes[h], records: hourlyCounts[h] });
    }

    trafficData.forEach(d => {
        d.percentage = totalVolume > 0 ? ((d.volume / totalVolume) * 100).toFixed(1) : 0;
    });

    if (totalVolume === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">No traffic data available</div>';
        return;
    }

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, 23])
        .range([0, width]);

    const maxVol = d3.max(trafficData, d => d.volume) || 10;
    const y = d3.scaleLinear()
        .domain([0, maxVol * 1.15])
        .range([height, 0]);

    // Gradijent
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'trafficHourGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(63, 185, 80, 0.5)');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(63, 185, 80, 0.05)');

    // Područje
    const area = d3.area()
        .x(d => x(d.hour))
        .y0(height)
        .y1(d => y(d.volume))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(trafficData)
        .attr('fill', 'url(#trafficHourGradient)')
        .attr('d', area);

    // Linija
    const line = d3.line()
        .x(d => x(d.hour))
        .y(d => y(d.volume))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(trafficData)
        .attr('fill', 'none')
        .attr('stroke', '#3fb950')
        .attr('stroke-width', 2.5)
        .attr('d', line);

    // Interaktivne točke
    svg.selectAll('.data-point')
        .data(trafficData)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => x(d.hour))
        .attr('cy', d => y(d.volume))
        .attr('r', 12)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mousemove', function(event, d) {
            const hourLabel = d.hour === 0 ? '12:00 AM' : d.hour === 12 ? '12:00 PM' : 
                             d.hour < 12 ? `${d.hour}:00 AM` : `${d.hour - 12}:00 PM`;
            showTooltip(event, `
                <div class="chart-tooltip-title">${hourLabel}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Avg Volume</span>
                    <span class="chart-tooltip-value green">${formatFullNumber(Math.round(d.volume))}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Share of Day</span>
                    <span class="chart-tooltip-value">${d.percentage}%</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Total Vehicles</span>
                    <span class="chart-tooltip-value">${formatFullNumber(d.totalVol)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Records</span>
                    <span class="chart-tooltip-value blue">${formatFullNumber(d.records)}</span>
                </div>
            `);
        })
        .on('mouseleave', hideTooltip);

    // Oznaka vrha
    const peakHour = trafficData.reduce((max, d) => d.volume > max.volume ? d : max, trafficData[0]);
    svg.append('circle')
        .attr('cx', x(peakHour.hour))
        .attr('cy', y(peakHour.volume))
        .attr('r', 5)
        .attr('fill', '#3fb950')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');

    // X Os
    const xAxis = d3.axisBottom(x)
        .tickValues([0, 3, 6, 9, 12, 15, 18, 21, 23])
        .tickFormat(d => {
            if (d === 0) return '12am';
            if (d === 12) return '12pm';
            if (d === 23) return '11pm';
            if (d < 12) return d + 'am';
            return (d - 12) + 'pm';
        });

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '9px');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => formatChartNumber(d)));
}

// Graf prometa po smjeru
function updateTrafficDirectionChart() {
    const container = document.getElementById('trafficDirectionChart');
    if (!container) return;
    container.innerHTML = '';

    const margin = { top: 15, right: 50, bottom: 35, left: 50 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 120;

    // Agregiraj po smjeru
    const directionVolumes = {};
    AppState.allHourlyData.forEach(hourMap => {
        hourMap.forEach(segment => {
            const dir = segment.direction || 'Unknown';
            if (dir && dir !== 'Unknown') {
                directionVolumes[dir] = (directionVolumes[dir] || 0) + segment.totalVolume;
            }
        });
    });

    const directionLabels = {
        'NB': 'Northbound',
        'SB': 'Southbound',
        'EB': 'Eastbound',
        'WB': 'Westbound'
    };

    const directionColors = {
        'NB': '#3fb950',
        'SB': '#f85149',
        'EB': '#58a6ff',
        'WB': '#f59e0b'
    };

    const totalVolume = Object.values(directionVolumes).reduce((a, b) => a + b, 0);

    const dirData = Object.entries(directionVolumes)
        .map(([dir, volume]) => ({
            dir,
            label: directionLabels[dir] || dir,
            volume,
            percentage: ((volume / totalVolume) * 100).toFixed(1)
        }))
        .sort((a, b) => b.volume - a.volume);

    if (dirData.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">No direction data available</div>';
        return;
    }

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(dirData.map(d => d.label))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(dirData, d => d.volume) * 1.15])
        .range([height, 0]);

    // Stupci s tooltipoms
    svg.selectAll('.bar')
        .data(dirData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.label))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.volume))
        .attr('height', d => height - y(d.volume))
        .attr('fill', d => directionColors[d.dir] || '#888')
        .attr('rx', 4)
        .on('mousemove', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(event, `
                <div class="chart-tooltip-title">${d.label}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Total Volume</span>
                    <span class="chart-tooltip-value">${formatFullNumber(d.volume)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Share</span>
                    <span class="chart-tooltip-value">${d.percentage}%</span>
                </div>
            `);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        });

    // Oznake vrijednosti
    svg.selectAll('.bar-label')
        .data(dirData)
        .enter()
        .append('text')
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', d => y(d.volume) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b949e')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d => formatChartNumber(d.volume))
        .style('pointer-events', 'none');

    // X Os
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('font-size', '9px');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => formatChartNumber(d)));
}

// Lista najprometnijih ulica
function updateTopStreetsList() {
    const container = document.getElementById('topStreetsList');
    if (!container) return;

    // Agregiraj obujam po ulici
    const streetVolumes = {};
    AppState.allHourlyData.forEach(hourMap => {
        hourMap.forEach(segment => {
            const street = segment.street || 'Unknown';
            if (street && street !== 'Unknown') {
                const key = `${street}|${segment.boro || ''}`;
                if (!streetVolumes[key]) {
                    streetVolumes[key] = {
                        street,
                        boro: segment.boro || '',
                        volume: 0,
                        segments: new Set()
                    };
                }
                streetVolumes[key].volume += segment.totalVolume;
                streetVolumes[key].segments.add(segment.segmentId);
            }
        });
    });

    const sortedStreets = Object.values(streetVolumes)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8);

    if (sortedStreets.length === 0) {
        container.innerHTML = '<div class="street-row"><span style="color:#6e7681;font-size:11px;">No street data available</span></div>';
        return;
    }

    const maxVol = sortedStreets[0].volume;

    container.innerHTML = sortedStreets.map((s, i) => {
        const pct = (s.volume / maxVol) * 100;
        return `
            <div class="street-row">
                <span class="street-rank">#${i + 1}</span>
                <div class="street-info">
                    <div class="street-name" title="${s.street}">${s.street}</div>
                    <div class="street-location">${s.boro} • ${s.segments.size} segments</div>
                </div>
                <div class="street-bar"><div class="street-bar-fill" style="width:${pct}%"></div></div>
                <span class="street-volume">${formatNumber(s.volume)}</span>
            </div>
        `;
    }).join('');
}

// Graf sudara po satu
function updateCollisionChart() {
    const container = document.getElementById('collisionChart');
    if (!container) return;
    container.innerHTML = '';

    // Jednake lijeve/desne margine
    const margin = { top: 15, right: 50, bottom: 35, left: 50 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 120;

    // Agregiraj sudare po satu s dodatnom statistikom
    const collisionData = [];
    let totalCollisions = 0;
    for (let h = 0; h < 24; h++) {
        const hourCollisions = AppState.collisionsByHour.get(h) || [];
        const count = hourCollisions.length;
        const injured = hourCollisions.reduce((sum, c) => sum + (parseInt(c.number_of_persons_injured) || 0), 0);
        const killed = hourCollisions.reduce((sum, c) => sum + (parseInt(c.number_of_persons_killed) || 0), 0);
        totalCollisions += count;
        collisionData.push({ hour: h, count, injured, killed });
    }

    // Izračunaj postotke
    collisionData.forEach(d => {
        d.percentage = totalCollisions > 0 ? ((d.count / totalCollisions) * 100).toFixed(1) : 0;
    });

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, 23])
        .range([0, width]);

    const maxCount = d3.max(collisionData, d => d.count) || 10;
    const y = d3.scaleLinear()
        .domain([0, maxCount * 1.15])
        .range([height, 0]);

    // Gradijent
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'collisionGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(248, 81, 73, 0.5)');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(248, 81, 73, 0.05)');

    // Područje
    const area = d3.area()
        .x(d => x(d.hour))
        .y0(height)
        .y1(d => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(collisionData)
        .attr('fill', 'url(#collisionGradient)')
        .attr('d', area);

    // Linija
    const line = d3.line()
        .x(d => x(d.hour))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(collisionData)
        .attr('fill', 'none')
        .attr('stroke', '#f85149')
        .attr('stroke-width', 2.5)
        .attr('d', line);

    // Interaktivne točke za tooltipove
    svg.selectAll('.data-point')
        .data(collisionData)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => x(d.hour))
        .attr('cy', d => y(d.count))
        .attr('r', 12)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mousemove', function(event, d) {
            const hourLabel = d.hour === 0 ? '12:00 AM' : d.hour === 12 ? '12:00 PM' : 
                             d.hour < 12 ? `${d.hour}:00 AM` : `${d.hour - 12}:00 PM`;
            showTooltip(event, `
                <div class="chart-tooltip-title">${hourLabel}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Collisions</span>
                    <span class="chart-tooltip-value red">${formatFullNumber(d.count)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Share of Day</span>
                    <span class="chart-tooltip-value">${d.percentage}%</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Persons Injured</span>
                    <span class="chart-tooltip-value" style="color: var(--accent-orange)">${formatFullNumber(d.injured)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Fatalities</span>
                    <span class="chart-tooltip-value red">${formatFullNumber(d.killed)}</span>
                </div>
            `);
        })
        .on('mouseleave', hideTooltip);

    // Oznaka vrha
    const peakHour = collisionData.reduce((max, d) => d.count > max.count ? d : max, collisionData[0]);
    svg.append('circle')
        .attr('cx', x(peakHour.hour))
        .attr('cy', y(peakHour.count))
        .attr('r', 5)
        .attr('fill', '#f85149')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');

    // X Os - prikaži svih 24 sata
    const xAxis = d3.axisBottom(x)
        .tickValues([0, 3, 6, 9, 12, 15, 18, 21, 23])
        .tickFormat(d => {
            if (d === 0) return '12am';
            if (d === 12) return '12pm';
            if (d === 23) return '11pm';
            if (d < 12) return d + 'am';
            return (d - 12) + 'pm';
        });

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '9px');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => formatChartNumber(d)));
}

// Graf sudara po kvartu
function updateCollisionBoroChart() {
    const container = document.getElementById('collisionBoroChart');
    if (!container) return;
    container.innerHTML = '';

    // Jednake lijeve/desne margine
    const margin = { top: 15, right: 55, bottom: 45, left: 55 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 120;

    // Agregiraj sudare po kvartu s detaljnom statistikom
    const boroStats = {};
    AppState.collisionsByHour.forEach(arr => {
        arr.forEach(collision => {
            const boro = collision.borough || 'Unknown';
            if (boro && boro !== 'Unknown') {
                if (!boroStats[boro]) {
                    boroStats[boro] = { count: 0, injured: 0, killed: 0 };
                }
                boroStats[boro].count++;
                boroStats[boro].injured += parseInt(collision.number_of_persons_injured) || 0;
                boroStats[boro].killed += parseInt(collision.number_of_persons_killed) || 0;
            }
        });
    });

    // Normaliziraj imena kvartova
    const normalizedBoro = {};
    Object.entries(boroStats).forEach(([boro, stats]) => {
        let normalized = boro.trim();
        if (normalized.toUpperCase() === 'BROOKLYN') normalized = 'Brooklyn';
        else if (normalized.toUpperCase() === 'QUEENS') normalized = 'Queens';
        else if (normalized.toUpperCase() === 'MANHATTAN') normalized = 'Manhattan';
        else if (normalized.toUpperCase() === 'BRONX') normalized = 'Bronx';
        else if (normalized.toUpperCase() === 'STATEN ISLAND') normalized = 'Staten Island';
        
        if (!normalizedBoro[normalized]) {
            normalizedBoro[normalized] = { count: 0, injured: 0, killed: 0 };
        }
        normalizedBoro[normalized].count += stats.count;
        normalizedBoro[normalized].injured += stats.injured;
        normalizedBoro[normalized].killed += stats.killed;
    });

    const totalCollisions = Object.values(normalizedBoro).reduce((sum, s) => sum + s.count, 0);

    const boroData = Object.entries(normalizedBoro)
        .map(([boro, stats]) => ({ 
            boro, 
            count: stats.count,
            injured: stats.injured,
            killed: stats.killed,
            percentage: ((stats.count / totalCollisions) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);

    if (boroData.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">No collision data</div>';
        return;
    }

    const subtitleEl = document.getElementById('collisionBoroSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `${formatNumber(totalCollisions)} total`;
    }

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(boroData.map(d => d.boro))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(boroData, d => d.count) * 1.15])
        .range([height, 0]);

    // Stupci s bojama kvartova i tooltipom
    svg.selectAll('.bar')
        .data(boroData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.boro))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count))
        .attr('fill', d => BORO_COLORS[d.boro] || '#888')
        .attr('rx', 4)
        .on('mousemove', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(event, `
                <div class="chart-tooltip-title">${d.boro}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Collisions</span>
                    <span class="chart-tooltip-value red">${formatFullNumber(d.count)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Share of Total</span>
                    <span class="chart-tooltip-value">${d.percentage}%</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Persons Injured</span>
                    <span class="chart-tooltip-value" style="color: var(--accent-orange)">${formatFullNumber(d.injured)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Fatalities</span>
                    <span class="chart-tooltip-value red">${formatFullNumber(d.killed)}</span>
                </div>
            `);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        });

    // Oznake vrijednosti
    svg.selectAll('.bar-label')
        .data(boroData)
        .enter()
        .append('text')
        .attr('x', d => x(d.boro) + x.bandwidth() / 2)
        .attr('y', d => y(d.count) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b949e')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d => formatChartNumber(d.count))
        .style('pointer-events', 'none');

    // X Os - puni nazivi kvartova
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-25)')
        .style('text-anchor', 'end')
        .style('font-size', '9px');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => formatChartNumber(d)));
}

// Mreža vrsta vozila
function updateVehicleTypesGrid() {
    const container = document.getElementById('vehicleTypesGrid');
    if (!container) return;

    // Agregiraj vrste vozila
    const vehicleTypes = {};
    AppState.collisionsByHour.forEach(arr => {
        arr.forEach(collision => {
            [collision.vehicle_type_code1, collision.vehicle_type_code2].forEach(type => {
                if (type && type.trim()) {
                    const normalizedType = type.toUpperCase().trim();
                    vehicleTypes[normalizedType] = (vehicleTypes[normalizedType] || 0) + 1;
                }
            });
        });
    });

    // Mapiraj vrste vozila na ikone i imena za prikaz
    const typeConfig = {
        'SEDAN': { icon: '🚗', name: 'Sedan' },
        'STATION WAGON/SPORT UTILITY VEHICLE': { icon: '🚙', name: 'SUV/Wagon' },
        'SPORT UTILITY / STATION WAGON': { icon: '🚙', name: 'SUV/Wagon' },
        'TAXI': { icon: '🚕', name: 'Taxi' },
        'PICK-UP TRUCK': { icon: '🛻', name: 'Pickup Truck' },
        'BOX TRUCK': { icon: '📦', name: 'Box Truck' },
        'BUS': { icon: '🚌', name: 'Bus' },
        'MOTORCYCLE': { icon: '🏍️', name: 'Motorcycle' },
        'BIKE': { icon: '🚲', name: 'Bicycle' },
        'BICYCLE': { icon: '🚲', name: 'Bicycle' },
        'E-BIKE': { icon: '🚴', name: 'E-Bike' },
        'E-SCOOTER': { icon: '🛴', name: 'E-Scooter' },
        'VAN': { icon: '🚐', name: 'Van' },
        'AMBULANCE': { icon: '🚑', name: 'Ambulance' },
        'FIRE TRUCK': { icon: '🚒', name: 'Fire Truck' },
        'TRACTOR TRUCK DIESEL': { icon: '🚛', name: 'Tractor Truck' },
        'GARBAGE OR REFUSE': { icon: '🗑️', name: 'Garbage Truck' },
        'CONVERTIBLE': { icon: '🏎️', name: 'Convertible' }
    };

    // Normaliziraj i agregiraj slične vrste
    const normalizedTypes = {};
    Object.entries(vehicleTypes).forEach(([type, count]) => {
        let key = type;
        // Rukuj sličnim vrstama
        if (type.includes('SPORT UTILITY') || type.includes('STATION WAGON')) {
            key = 'SUV/Wagon';
        } else if (type.includes('TAXI')) {
            key = 'Taxi';
        } else if (type.includes('PICK') && type.includes('TRUCK')) {
            key = 'Pickup Truck';
        } else if (type === 'SEDAN' || type === '4 DR SEDAN') {
            key = 'Sedan';
        } else if (type.includes('BUS')) {
            key = 'Bus';
        } else if (type === 'MOTORCYCLE') {
            key = 'Motorcycle';
        } else if (type === 'BIKE' || type === 'BICYCLE') {
            key = 'Bicycle';
        } else if (type.includes('VAN')) {
            key = 'Van';
        } else if (type.includes('BOX')) {
            key = 'Box Truck';
        } else {
            key = type.length > 15 ? type.substring(0, 12) + '...' : type;
        }
        normalizedTypes[key] = (normalizedTypes[key] || 0) + count;
    });

    const sortedTypes = Object.entries(normalizedTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    if (sortedTypes.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">No vehicle type data</div>';
        return;
    }

    const icons = {
        'Sedan': '🚗', 'SUV/Wagon': '🚙', 'Taxi': '🚕', 'Pickup Truck': '🛻',
        'Box Truck': '📦', 'Bus': '🚌', 'Motorcycle': '🏍️', 'Bicycle': '🚲',
        'Van': '🚐', 'E-Bike': '🚴', 'E-Scooter': '🛴'
    };

    container.innerHTML = sortedTypes.map(([type, count]) => {
        const icon = icons[type] || '🚗';
        return `
            <div class="vehicle-type-item">
                <div class="vehicle-type-icon">${icon}</div>
                <div class="vehicle-type-info">
                    <div class="vehicle-type-name">${type}</div>
                    <div class="vehicle-type-value">${formatNumber(count)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Graf mjesečnog trenda
function updateMonthlyTrendChart() {
    const container = document.getElementById('monthlyTrendChart');
    if (!container) return;
    container.innerHTML = '';

    // Jednake lijeve/desne margine
    const margin = { top: 20, right: 55, bottom: 40, left: 55 };
    const containerWidth = container.clientWidth || 500;
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const height = 150;

    // Agregiraj sudare po mjesecu s detaljnom statistikom
    const monthlyStats = {};
    AppState.collisionsByHour.forEach(arr => {
        arr.forEach(collision => {
            if (collision.crash_date) {
                const date = new Date(collision.crash_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = { count: 0, injured: 0, killed: 0 };
                }
                monthlyStats[monthKey].count++;
                monthlyStats[monthKey].injured += parseInt(collision.number_of_persons_injured) || 0;
                monthlyStats[monthKey].killed += parseInt(collision.number_of_persons_killed) || 0;
            }
        });
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const sortedMonths = Object.entries(monthlyStats)
        .map(([month, stats]) => {
            const [year, m] = month.split('-');
            return { 
                month, 
                count: stats.count,
                injured: stats.injured,
                killed: stats.killed,
                displayName: `${monthNames[parseInt(m) - 1]} ${year}`
            };
        })
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12); // Zadnjih 12 mjeseci

    if (sortedMonths.length < 2) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">Insufficient data for trend</div>';
        return;
    }

    // Izračunaj prosjek i trend
    const avgCount = sortedMonths.reduce((sum, d) => sum + d.count, 0) / sortedMonths.length;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(sortedMonths.map(d => d.month))
        .range([0, width])
        .padding(0.5);

    const maxCount = d3.max(sortedMonths, d => d.count) || 10;
    const y = d3.scaleLinear()
        .domain([0, maxCount * 1.15])
        .range([height, 0]);

    // Gradijent
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'trendGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(88, 166, 255, 0.4)');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(88, 166, 255, 0.02)');

    // Područje
    const area = d3.area()
        .x(d => x(d.month))
        .y0(height)
        .y1(d => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(sortedMonths)
        .attr('fill', 'url(#trendGradient)')
        .attr('d', area);

    // Linija
    const line = d3.line()
        .x(d => x(d.month))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(sortedMonths)
        .attr('fill', 'none')
        .attr('stroke', '#58a6ff')
        .attr('stroke-width', 2.5)
        .attr('d', line);

    // Interaktivne podatkovne točke s tooltipom
    svg.selectAll('.data-point')
        .data(sortedMonths)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => x(d.month))
        .attr('cy', d => y(d.count))
        .attr('r', 6)
        .attr('fill', '#58a6ff')
        .attr('stroke', '#0d1117')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .on('mousemove', function(event, d) {
            d3.select(this).attr('r', 8);
            const vsAvg = ((d.count - avgCount) / avgCount * 100).toFixed(1);
            const vsAvgText = vsAvg >= 0 ? `+${vsAvg}%` : `${vsAvg}%`;
            const vsAvgColor = vsAvg >= 0 ? 'red' : 'green';
            showTooltip(event, `
                <div class="chart-tooltip-title">${d.displayName}</div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Collisions</span>
                    <span class="chart-tooltip-value blue">${formatFullNumber(d.count)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">vs. Average</span>
                    <span class="chart-tooltip-value ${vsAvgColor}">${vsAvgText}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Persons Injured</span>
                    <span class="chart-tooltip-value" style="color: var(--accent-orange)">${formatFullNumber(d.injured)}</span>
                </div>
                <div class="chart-tooltip-row">
                    <span class="chart-tooltip-label">Fatalities</span>
                    <span class="chart-tooltip-value red">${formatFullNumber(d.killed)}</span>
                </div>
            `);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 6);
            hideTooltip();
        });

    // X Os
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            const [year, month] = d.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthNames[parseInt(month) - 1];
        }))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    // Y Os
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatChartNumber(d)));
}

// Lista čimbenika koji doprinose
function updateFactorsList() {
    const container = document.getElementById('factorsList');
    if (!container) return;

    // Agregiraj čimbenike koji doprinose sudaru
    const factors = {};
    AppState.collisionsByHour.forEach(arr => {
        arr.forEach(collision => {
            // Provjeri oba faktora vozila
            [collision.contributing_factor_vehicle_1, collision.contributing_factor_vehicle_2].forEach(factor => {
                if (factor && factor !== 'Unspecified' && factor.trim()) {
                    factors[factor] = (factors[factor] || 0) + 1;
                }
            });
        });
    });

    const sortedFactors = Object.entries(factors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

    if (sortedFactors.length === 0) {
        container.innerHTML = '<div class="factor-row"><span class="factor-name" style="color:#6e7681;">No contributing factor data available</span></div>';
        return;
    }

    const maxVal = sortedFactors[0][1];

    container.innerHTML = sortedFactors.map(([name, value]) => {
        const pct = (value / maxVal) * 100;
        const displayName = name.length > 35 ? name.substring(0, 32) + '...' : name;
        return `
            <div class="factor-row">
                <span class="factor-name" title="${name}">${displayName}</span>
                <div class="factor-bar"><div class="factor-bar-fill" style="width:${pct}%"></div></div>
                <span class="factor-value">${formatNumber(value)}</span>
            </div>
        `;
    }).join('');
}

// Tjedna toplinska karta sudara
function updateWeeklyHeatmap() {
    const container = document.getElementById('weeklyHeatmap');
    if (!container) return;

    // Stvori mrežu 7 dana x 24 sata
    const heatmapData = Array(7).fill(null).map(() => Array(24).fill(0));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Agregiraj sudare po danu u tjednu i satu
    AppState.collisionsByHour.forEach((arr, hour) => {
        arr.forEach(collision => {
            if (collision.crash_date) {
                const date = new Date(collision.crash_date);
                const dayOfWeek = date.getDay();
                heatmapData[dayOfWeek][hour]++;
            }
        });
    });

    const maxVal = Math.max(...heatmapData.flat()) || 1;

    // Ljestvica boja
    const colorScale = d3.scaleSequential()
        .domain([0, maxVal])
        .interpolator(d3.interpolateRgb('#21262d', '#f85149'));

    let html = '<div class="heatmap-wrapper">';
    
    // Stupac oznaka dana
    html += '<div class="heatmap-day-labels">';
    dayNames.forEach(day => {
        html += `<div class="heatmap-day-label">${day}</div>`;
    });
    html += '</div>';
    
    // Spremnik mreže
    html += '<div class="heatmap-grid-container">';
    
    for (let day = 0; day < 7; day++) {
        html += '<div class="heatmap-row">';
        for (let hour = 0; hour < 24; hour++) {
            const val = heatmapData[day][hour];
            const color = colorScale(val);
            html += `<div class="heatmap-cell" style="background:${color}" title="${dayNames[day]} ${hour}:00 - ${val} collisions"></div>`;
        }
        html += '</div>';
    }
    
    html += '</div>'; // kraj spremnika mreže
    html += '</div>'; // kraj omotača
    
    // Oznake sati
    html += '<div class="heatmap-hour-labels"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>';

    container.innerHTML = html;
}

// Prisilno promijeni veličinu grafova kada se ladica otvori
function resizeCharts() {
    const drawer = document.getElementById('analyticsDrawer');
    if (!drawer || !drawer.classList.contains('active')) return;
    
    // Mala odgoda kako bi dimenzije spremnika bile konačne
    setTimeout(() => {
        updateDashboardCharts();
    }, 100);
}

// Dodaj promatrač promjene veličine za ladicu
if (typeof ResizeObserver !== 'undefined') {
    const drawerBody = document.querySelector('.drawer-body');
    if (drawerBody) {
        const resizeObserver = new ResizeObserver(() => {
            resizeCharts();
        });
        resizeObserver.observe(drawerBody);
    }
}
