/**
 * utils.js - Pomoćne funkcije
 */

// Dohvati boju za volumen
function getColorForVolume(volume) {
    for (const range of COLOR_SCALE) {
        if (volume >= range.min && volume < range.max) {
            return range.color;
        }
    }
    return COLOR_SCALE[COLOR_SCALE.length - 1].color;
}

// Dohvati širinu linije za volumen
function getLineWidth(volume) {
    if (volume < 1000) return 2;
    if (volume < 5000) return 3;
    if (volume < 10000) return 4;
    if (volume < 20000) return 5;
    if (volume < 40000) return 6;
    return 8;
}

// Formatiraj broj (1K, 1M, etc.)
function formatNumber(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
}

// Formatiraj broj za grafove
function formatChartNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return Math.round(num).toString();
}

// Formatiraj puni broj
function formatFullNumber(num) {
    return Math.round(num).toLocaleString();
}

// Formatiraj sat
function formatHour(hour) {
    const h = parseInt(hour);
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
}

// Formatiraj datum za prikaz
function formatDateDisplay(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Ažuriraj progress bar
function updateProgress(text, percent = null) {
    const el = document.getElementById('loadingProgress');
    if (el) el.textContent = text;
    if (percent !== null) {
        const bar = document.getElementById('progressBar');
        if (bar) bar.style.width = `${percent}%`;
    }
}

// Ažuriraj prikaz vremena
function updateTimeDisplay(hour) {
    const h = parseInt(hour);
    let displayHour, period;

    if (h === 0) { displayHour = '12:00'; period = 'AM'; }
    else if (h === 12) { displayHour = '12:00'; period = 'PM'; }
    else if (h < 12) { displayHour = `${h}:00`; period = 'AM'; }
    else { displayHour = `${h - 12}:00`; period = 'PM'; }

    document.getElementById('timeValue').textContent = displayHour;
    document.getElementById('timePeriod').textContent = period;
}

// Dohvati raspon datuma
function getDateRange() {
    let endDate;
    if (AppState.selectedDate) {
        endDate = new Date(AppState.selectedDate);
    } else {
        endDate = new Date();
    }
    
    if (AppState.selectedRange === 'all') {
        return null;
    }
    
    const days = parseInt(AppState.selectedRange);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    
    return {
        start: startDate,
        end: endDate,
        startISO: startDate.toISOString().split('T')[0],
        endISO: endDate.toISOString().split('T')[0]
    };
}

// Ažuriraj prikaz raspona datuma
function updateDateRangeDisplay() {
    const rangeText = document.getElementById('dataRangeText');
    if (!rangeText) return;
    
    const dateRange = getDateRange();
    
    if (!dateRange) {
        rangeText.textContent = 'Showing: All available data';
    } else if (AppState.selectedRange === '1') {
        rangeText.textContent = `Showing: ${formatDateDisplay(dateRange.end)}`;
    } else {
        rangeText.textContent = `Showing: ${formatDateDisplay(dateRange.start)} → ${formatDateDisplay(dateRange.end)}`;
    }
}

// Postavi status indikator
function setStatus(loading) {
    const indicator = document.getElementById('statusIndicator');
    const text = indicator?.querySelector('.status-text');
    if (loading) {
        indicator?.classList.add('loading');
        if (text) text.textContent = 'Loading...';
    } else {
        indicator?.classList.remove('loading');
        if (text) text.textContent = 'Ready';
    }
}
