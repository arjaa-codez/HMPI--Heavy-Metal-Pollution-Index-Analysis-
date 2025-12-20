// Enhanced Telangana Water Quality Analyzer
// Map functionality with state highlighting and district boundaries

let map;
let markersLayer;
let drawnItems;
let currentLayer = 'street';
let telanganaLayer;
let districtsLayer;
let telangana_bounds = {
    lat_min: 15.85, lat_max: 19.91,
    lon_min: 77.27, lon_max: 81.78
};

// Initialize map
function initMap() {
    // Center map on Telangana
    const telanganaCenter = [17.1232, 79.2088];
    
    map = L.map('map', {
        center: telanganaCenter,
        zoom: 8,
        zoomControl: false
    });

    // Add zoom control to top right
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Initialize layers
    markersLayer = L.layerGroup().addTo(map);
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Set default layer
    setMapLayer('street');

    // Add Telangana state boundary highlight
    addTelanganaHighlight();

    // Add district boundaries
    addDistrictBoundaries();

    // Initialize drawing controls
    initDrawControls();

    // Initialize search
    initSearch();

    // Initialize fullscreen
    L.control.fullscreen({
        position: 'topright'
    }).addTo(map);

    // Restrict map to Telangana region
    map.setMaxBounds([
        [telangana_bounds.lat_min - 0.5, telangana_bounds.lon_min - 0.5],
        [telangana_bounds.lat_max + 0.5, telangana_bounds.lon_max + 0.5]
    ]);

    // Map click handler for predictions
    map.on('click', onMapClick);
}

function addTelanganaHighlight() {
    // Create Telangana state boundary
    const telanganaPolygon = L.rectangle([
        [telangana_bounds.lat_min, telangana_bounds.lon_min],
        [telangana_bounds.lat_max, telangana_bounds.lon_max]
    ], {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.8,
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        dashArray: '10, 10'
    });

    telanganaLayer = L.layerGroup([telanganaPolygon]).addTo(map);
    
    // Add label
    const centerLat = (telangana_bounds.lat_min + telangana_bounds.lat_max) / 2;
    const centerLon = (telangana_bounds.lon_min + telangana_bounds.lon_max) / 2;
    
    L.marker([centerLat, centerLon], {
        icon: L.divIcon({
            className: 'telangana-label',
            html: '<div style="background: rgba(59, 130, 246, 0.9); color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold; font-size: 14px;">TELANGANA STATE</div>',
            iconSize: [120, 30],
            iconAnchor: [60, 15]
        })
    }).addTo(telanganaLayer);
}

function addDistrictBoundaries() {
    // Fetch district data and add to map
    fetch('/districts')
        .then(response => response.json())
        .then(districts => {
            districtsLayer = L.layerGroup();
            
            districts.forEach(district => {
                const marker = L.circleMarker([district.lat, district.lon], {
                    radius: 8,
                    fillColor: '#10B981',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                marker.bindPopup(`
                    <div style='
                        background-color: #1a1a1a; 
                        color: #ffffff; 
                        padding: 15px; 
                        border-radius: 8px; 
                        font-family: Arial, sans-serif;
                        min-width: 200px;
                        margin: -10px;
                    '>
                        <h3 style="color: #60a5fa; margin-bottom: 12px; font-size: 16px; font-weight: bold; border-bottom: 2px solid #374151; padding-bottom: 6px;">${district.name}</h3>
                        <p style="color: #e5e7eb; margin-bottom: 8px;"><strong style="color: #fbbf24;">Training Samples:</strong> ${district.samples}</p>
                        <p style="color: #e5e7eb; margin-bottom: 12px;"><strong style="color: #fbbf24;">Coordinates:</strong> ${district.lat.toFixed(4)}, ${district.lon.toFixed(4)}</p>
                        <button onclick="analyzeLocation(${district.lat}, ${district.lon})" style="
                            background: linear-gradient(135deg, #10b981, #059669); 
                            color: white; 
                            border: none; 
                            padding: 10px 16px; 
                            border-radius: 6px; 
                            cursor: pointer; 
                            width: 100%; 
                            font-weight: 600;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                        " onmouseover='this.style.background="linear-gradient(135deg, #059669, #047857)"' 
                           onmouseout='this.style.background="linear-gradient(135deg, #10b981, #059669)"'>
                            <i class="fas fa-chart-line" style="margin-right: 8px;"></i>Analyze Water Quality
                        </button>
                    </div>
                `);

                marker.addTo(districtsLayer);
            });
            
            districtsLayer.addTo(map);
        })
        .catch(error => {
            console.error('Error loading districts:', error);
        });
}

function setMapLayer(layerType) {
    // Remove existing tile layer
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    let tileLayer;
    
    switch(layerType) {
        case 'satellite':
            tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
            });
            break;
        case 'terrain':
            tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.opentopomap.org/">OpenTopoMap</a>'
            });
            break;
        default: // street
            tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            });
    }
    
    tileLayer.addTo(map);
    currentLayer = layerType;
    
    // Update button states
    updateLayerButtons();
}

function updateLayerButtons() {
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="setMapLayer('${currentLayer}')"]`).classList.add('active');
}

function initDrawControls() {
    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            remove: true
        },
        draw: {
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Error:</strong> shape edges cannot cross!'
                },
                shapeOptions: {
                    color: '#97009c'
                }
            },
            rectangle: {
                shapeOptions: {
                    clickable: false,
                    color: '#97009c'
                }
            },
            circle: false,
            marker: false,
            circlemarker: false,
            polyline: false
        }
    });
    
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        
        // Analyze drawn area
        if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
            analyzePolygon(layer);
        }
    });
}

function initSearch() {
    // Use the existing sidebar search input instead of creating a new one
    const searchInput = document.getElementById('location-search');
    const searchResults = document.getElementById('search-results');
    let searchTimeout;
    let currentResults = [];

    if (!searchInput || !searchResults) {
        console.error('Search elements not found in sidebar');
        return;
    }

    // Handle search input
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    // Handle click outside to close results
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });

    function performSearch(query) {
        // Show loading state
        searchResults.innerHTML = '<div class="search-loading">🔍 Searching...</div>';
        showSearchResults();
        
        // Use Nominatim for geocoding
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=8&addressdetails=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                currentResults = data;
                displaySearchResults(data, query);
            })
            .catch(error => {
                console.error('Search error:', error);
                showSearchError();
            });
    }

    function displaySearchResults(results, query) {
        if (results.length === 0) {
            showNoResults(query);
            return;
        }

        let html = '';
        results.forEach((result, index) => {
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            const isInTelangana = isWithinTelangana(lat, lng);
            
            const displayName = result.display_name;
            const shortName = displayName.split(',')[0];
            const location = displayName.split(',').slice(1, 3).join(',');
            
            html += `
                <div class="search-result-item" onclick="selectLocation(${index})" data-index="${index}">
                    <div class="flex items-start space-x-3 p-3 hover:bg-gray-600 cursor-pointer rounded">
                        <div class="flex-shrink-0 mt-1">
                            <div class="location-indicator text-lg">
                                ${isInTelangana ? '🌟' : '🌍'}
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-white truncate">${shortName}</div>
                            <div class="text-sm text-gray-400 truncate">${location}</div>
                            ${!isInTelangana ? '<div class="text-xs text-orange-400 mt-1">⚠️ Outside Telangana</div>' : '<div class="text-xs text-green-400 mt-1">✅ In Telangana</div>'}
                        </div>
                    </div>
                </div>
            `;
        });

        searchResults.innerHTML = html;
        showSearchResults();
    }

    function showNoResults(query) {
        searchResults.innerHTML = `
            <div class="p-4 text-center text-gray-400">
                <i class="fas fa-search text-2xl mb-2"></i>
                <div>No results found for "${query}"</div>
                <div class="text-xs mt-1">Try searching for districts, cities, or landmarks</div>
            </div>
        `;
        showSearchResults();
    }

    function showSearchError() {
        searchResults.innerHTML = `
            <div class="p-4 text-center text-red-400">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <div>Search error occurred</div>
                <div class="text-xs mt-1">Please try again</div>
            </div>
        `;
        showSearchResults();
    }

    function showSearchResults() {
        searchResults.classList.remove('hidden');
    }

    function hideSearchResults() {
        searchResults.classList.add('hidden');
    }

    // Make selectLocation global
    window.selectLocation = function(index) {
        const result = currentResults[index];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const name = result.display_name.split(',')[0];
        
        // Update search input
        searchInput.value = name;
        hideSearchResults();
        
        // Move map to location
        map.setView([lat, lng], 12);
        markersLayer.clearLayers();
        
        const isInTelangana = isWithinTelangana(lat, lng);
        const warningText = isInTelangana ? '' : 
            '<p style="color: orange; margin: 8px 0;"><strong>⚠️ Note:</strong> This location is outside Telangana. Model accuracy may be limited.</p>';
        
        // Add marker
        L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'search-location-marker',
                html: `<div style="background: ${isInTelangana ? '#10B981' : '#F59E0B'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">📍</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        })
        .addTo(markersLayer)
        .bindPopup(`
            <div style='
                background-color: #1a1a1a; 
                color: #ffffff; 
                padding: 15px; 
                border-radius: 8px; 
                font-family: Arial, sans-serif;
                min-width: 220px;
                margin: -10px;
            '>
                <h3 style="color: #60a5fa; margin-bottom: 12px; font-size: 16px; font-weight: bold; border-bottom: 2px solid #374151; padding-bottom: 6px;">📍 ${name}</h3>
                <p style="color: #e5e7eb; margin-bottom: 12px;"><strong style="color: #fbbf24;">Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                ${warningText ? `<div style="color: #f59e0b; margin-bottom: 12px; padding: 8px; background: rgba(245, 158, 11, 0.1); border-radius: 4px; border-left: 3px solid #f59e0b;"><strong>⚠️ Note:</strong> This location is outside Telangana. Model accuracy may be limited.</div>` : ''}
                <button onclick="analyzeLocation(${lat}, ${lng})" style="
                    background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; 
                    border: none; 
                    padding: 10px 16px; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    width: 100%; 
                    font-weight: 600;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                " onmouseover='this.style.background="linear-gradient(135deg, #059669, #047857)"' 
                   onmouseout='this.style.background="linear-gradient(135deg, #10b981, #059669)"'>
                    🔬 Analyze Water Quality
                </button>
            </div>
        `).openPopup();
    };
}

function isWithinTelangana(lat, lon) {
    return lat >= telangana_bounds.lat_min && lat <= telangana_bounds.lat_max &&
           lon >= telangana_bounds.lon_min && lon <= telangana_bounds.lon_max;
}

function onMapClick(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    if (!isWithinTelangana(lat, lon)) {
        alert('Please select a location within Telangana state. The model is trained only for this region.');
        return;
    }
    
    analyzeLocation(lat, lon);
}

async function analyzeLocation(lat, lon) {
    // Show loading
    showLoading(true);
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latitude: lat,
                longitude: lon
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        // Add marker to map
        const marker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'prediction-marker',
                html: `<div style="background: ${data.risk_color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        });
        
        marker.bindPopup(createPredictionPopup(data)).addTo(markersLayer);
        
        // Update results panel
        updateResultsPanel(data);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error analyzing location. Please try again.');
    } finally {
        showLoading(false);
    }
}

function createPredictionPopup(data) {
    const predictions = data.predictions;
    
    return `
        <div style='
            background-color: #1a1a1a; 
            color: #ffffff; 
            padding: 15px; 
            border-radius: 8px; 
            font-family: Arial, sans-serif;
            min-width: 280px;
            margin: -10px;
        '>
            <h3 style='
                color: #60a5fa; 
                margin: 0 0 12px 0; 
                font-size: 16px; 
                font-weight: bold;
                border-bottom: 2px solid #374151; 
                padding-bottom: 6px;
            '>🔬 Water Quality Analysis</h3>
            
            <div style='margin-bottom: 12px;'>
                <strong style='color: #fbbf24;'>Risk Level:</strong> 
                <span style='
                    color: ${data.risk_color}; 
                    font-weight: bold; 
                    font-size: 16px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                '>${data.risk_level}</span>
            </div>
            
            <div style='
                background-color: #374151; 
                padding: 10px; 
                border-radius: 6px; 
                margin-bottom: 12px;
                border-left: 4px solid ${data.risk_color};
            '>
                <div style='color: #d1d5db; font-size: 13px; line-height: 1.4;'>
                    <div style='margin-bottom: 6px;'><strong style='color: #fbbf24;'>TDS:</strong> <span style='color: #e5e7eb;'>${predictions.tds?.toFixed(2)} mg/L</span></div>
                    <div style='margin-bottom: 6px;'><strong style='color: #fbbf24;'>Chloride:</strong> <span style='color: #e5e7eb;'>${predictions.chloride?.toFixed(2)} mg/L</span></div>
                    <div style='margin-bottom: 6px;'><strong style='color: #fbbf24;'>Total Hardness:</strong> <span style='color: #e5e7eb;'>${predictions.total_hardness?.toFixed(2)} mg/L</span></div>
                    <div style='margin-bottom: 6px;'><strong style='color: #fbbf24;'>Fluoride:</strong> <span style='color: #e5e7eb;'>${predictions.fluoride?.toFixed(2)} mg/L</span></div>
                    <div style='margin-bottom: 6px;'><strong style='color: #fbbf24;'>WQI:</strong> <span style='color: #10b981;'>${predictions.wqi?.toFixed(2)}</span></div>
                    <div><strong style='color: #fbbf24;'>Pollution Risk:</strong> <span style='color: ${data.risk_color};'>${(predictions.pollution_risk * 100)?.toFixed(1)}%</span></div>
                </div>
            </div>
            
            <div style='
                margin-top: 12px; 
                padding-top: 8px; 
                border-top: 1px solid #374151; 
                font-size: 11px; 
                color: #9ca3af;
                text-align: center;
            '>
                Coordinates: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}
            </div>
        </div>
    `;
}

function updateResultsPanel(data) {
    const resultsPanel = document.getElementById('results');
    const predictions = data.predictions;
    const hmpi = data.hmpi || {};
    
    resultsPanel.innerHTML = `
        <div class="result-header">
            <h3>Groundwater Quality Analysis Report</h3>
            <div class="risk-indicator" style="background-color: ${data.risk_color};">
                ${data.risk_level}
            </div>
        </div>
        
        <!-- HMPI Section -->
        <div class="hmpi-section">
            <h4>🧪 Heavy Metal Pollution Index (HMPI)</h4>
            <div class="hmpi-main">
                <div class="hmpi-value">
                    <span class="hmpi-number">${hmpi.value || 'N/A'}</span>
                    <span class="hmpi-category" style="color: ${getHMPIColor(hmpi.category)}">
                        ${hmpi.category || 'Unknown'}
                    </span>
                </div>
                <div class="hmpi-interpretation">
                    <p><em>${hmpi.interpretation || 'No interpretation available'}</em></p>
                </div>
            </div>
            
            ${hmpi.details ? `
            <div class="heavy-metals-grid">
                <h5>📊 Heavy Metal Analysis</h5>
                <div class="metals-container">
                    ${Object.entries(hmpi.details).map(([metal, details]) => `
                        <div class="metal-item">
                            <div class="metal-header">
                                <span class="metal-name">${getMetalDisplayName(metal)}</span>
                                <span class="metal-status" style="color: ${details.status.color}">
                                    ${details.status.icon} ${details.status.level}
                                </span>
                            </div>
                            <div class="metal-details">
                                <div class="concentration">
                                    <strong>${details.concentration}</strong> ${getMetalUnit(metal)}
                                </div>
                                <div class="standard-comparison">
                                    WHO/BIS: ${details.standard} ${getMetalUnit(metal)}
                                </div>
                                <div class="quality-rating">
                                    Quality Rating: ${details.quality_rating}%
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        
        <!-- Water Quality Parameters -->
        <div class="prediction-grid">
            <h4>💧 Water Quality Parameters</h4>
            <div class="prediction-item">
                <span class="label">Total Dissolved Solids (TDS)</span>
                <span class="value">${predictions.tds?.toFixed(2)} mg/L</span>
                <span class="standard">${predictions.tds > 500 ? '⚠️ Above WHO limit' : '✅ Within WHO limit'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Chloride (Cl⁻)</span>
                <span class="value">${predictions.chloride?.toFixed(2)} mg/L</span>
                <span class="standard">${predictions.chloride > 250 ? '⚠️ Above WHO limit' : '✅ Within WHO limit'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Total Hardness (as CaCO₃)</span>
                <span class="value">${predictions.total_hardness?.toFixed(2)} mg/L</span>
                <span class="standard">${predictions.total_hardness > 300 ? '⚠️ Hard water' : '✅ Soft/Moderate'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Fluoride (F⁻)</span>
                <span class="value">${predictions.fluoride?.toFixed(2)} mg/L</span>
                <span class="standard">${predictions.fluoride > 1.5 ? '⚠️ Above WHO limit' : '✅ Within WHO limit'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Sulfate (SO₄²⁻)</span>
                <span class="value">${predictions.sulfate?.toFixed(2)} mg/L</span>
                <span class="standard">${predictions.sulfate > 250 ? '⚠️ Above WHO limit' : '✅ Within WHO limit'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Water Quality Index (WQI)</span>
                <span class="value">${predictions.wqi?.toFixed(2)}</span>
                <span class="standard">${predictions.wqi > 80 ? '✅ Excellent' : predictions.wqi > 60 ? '✅ Good' : predictions.wqi > 40 ? '⚠️ Fair' : '❌ Poor'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Sodium Absorption Ratio (SAR)</span>
                <span class="value">${predictions.sar?.toFixed(2)}</span>
                <span class="standard">${predictions.sar > 10 ? '⚠️ High sodium' : '✅ Acceptable'}</span>
            </div>
            <div class="prediction-item">
                <span class="label">Pollution Risk Assessment</span>
                <span class="value">${(predictions.pollution_risk * 100)?.toFixed(1)}%</span>
                <span class="standard">${predictions.pollution_risk > 0.6 ? '❌ High risk' : predictions.pollution_risk > 0.3 ? '⚠️ Moderate risk' : '✅ Low risk'}</span>
            </div>
        </div>
        
        <div class="coordinates">
            <strong>Geographic Coordinates:</strong> ${data.latitude.toFixed(6)}°N, ${data.longitude.toFixed(6)}°E<br>
            <strong>District:</strong> ${data.district || 'Telangana'}
        </div>
        <div class="analysis-info">
            <small><em>Analysis based on ML models trained on Telangana groundwater data (2018-2020)</em></small>
        </div>
    `;
}

// Helper functions for HMPI display
function getHMPIColor(category) {
    const colors = {
        'Excellent': '#28a745',
        'Good': '#17a2b8', 
        'Moderate': '#ffc107',
        'Poor': '#fd7e14',
        'Very Poor': '#dc3545'
    };
    return colors[category] || '#6c757d';
}

function getMetalDisplayName(metal) {
    const names = {
        'iron': 'Iron (Fe)',
        'manganese': 'Manganese (Mn)',
        'copper': 'Copper (Cu)',
        'zinc': 'Zinc (Zn)', 
        'lead': 'Lead (Pb)',
        'cadmium': 'Cadmium (Cd)',
        'chromium': 'Chromium (Cr)',
        'nickel': 'Nickel (Ni)',
        'fluoride': 'Fluoride (F⁻)',
        'chloride': 'Chloride (Cl⁻)',
        'sulfate': 'Sulfate (SO₄²⁻)',
        'tds': 'Total Dissolved Solids'
    };
    return names[metal] || metal.charAt(0).toUpperCase() + metal.slice(1);
}

function getMetalUnit(metal) {
    return 'mg/L';
}

async function analyzePolygon(layer) {
    // Get polygon bounds
    const bounds = layer.getBounds();
    const center = bounds.getCenter();
    
    if (!isWithinTelangana(center.lat, center.lng)) {
        alert('Please draw polygons within Telangana state only.');
        drawnItems.removeLayer(layer);
        return;
    }
    
    // Analyze center point of polygon
    await analyzeLocation(center.lat, center.lng);
}

function clearMarkers() {
    markersLayer.clearLayers();
    drawnItems.clearLayers();
    document.getElementById('results').innerHTML = `
        <div class="no-results">
            <h3>No Analysis Yet</h3>
            <p>Click on the map or search for a location to analyze water quality.</p>
        </div>
    `;
}

function toggleTelanganaLayer() {
    if (map.hasLayer(telanganaLayer)) {
        map.removeLayer(telanganaLayer);
    } else {
        telanganaLayer.addTo(map);
    }
}

function toggleDistrictsLayer() {
    if (map.hasLayer(districtsLayer)) {
        map.removeLayer(districtsLayer);
    } else {
        districtsLayer.addTo(map);
    }
}

function showLoading(show) {
    const loadingDiv = document.getElementById('loading') || createLoadingDiv();
    loadingDiv.style.display = show ? 'block' : 'none';
}

function createLoadingDiv() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>Analyzing water quality...</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    // Initialize resizable sidebar
    initResizableSidebar();
    
    // Add event listeners
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearMarkers);
    }
    
    // CSV Upload toggle
    const uploadToggle = document.getElementById('upload-toggle');
    if (uploadToggle) {
        uploadToggle.addEventListener('click', function() {
            const section = document.getElementById('upload-section');
            const icon = this.querySelector('.fa-chevron-down');
            
            if (section) {
                section.classList.toggle('hidden');
            }
            if (icon) {
                icon.classList.toggle('rotate-180');
            }
        });
    }
    
    // CSV file input change listener
    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function() {
            const fileName = this.files[0]?.name;
            if (fileName) {
                const label = this.nextElementSibling;
                if (label) {
                    label.innerHTML = `
                        <i class="fas fa-file-csv text-green-400 text-xl mb-2"></i>
                        <div class="text-sm text-green-400">
                            <span>File selected: ${fileName}</span>
                        </div>
                    `;
                }
            }
        });
    }
    
    // CSV analyze button event listener
    const analyzeCsvBtn = document.getElementById('analyze-csv-btn');
    if (analyzeCsvBtn) {
        analyzeCsvBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Analyze CSV button clicked');
            handleCSVUpload();
        });
    }
});

// CSV Upload and Analysis Functions
window.handleCSVUpload = function() {
    console.log('handleCSVUpload called');
    
    const fileInput = document.getElementById('csvFileInput');
    if (!fileInput) {
        console.error('CSV file input not found');
        alert('Error: File input not found');
        return;
    }
    
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a valid CSV file');
        return;
    }
    
    console.log('Processing file:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const parsedData = parseCSV(csvData);
            const resultsWithHMPI = calculateHMPIForData(parsedData);
            
            // Store results globally with backup
            window.csvResults = resultsWithHMPI;
            window.lastCSVResults = resultsWithHMPI; // Backup storage
            
            console.log('CSV results stored globally:', window.csvResults.length, 'results');
            
            displayCSVResults(resultsWithHMPI);
            addMarkersFromCSV(resultsWithHMPI);
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the format.');
        }
    };
    
    reader.readAsText(file);
};

function parseCSV(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredColumns = ['location', 'latitude', 'longitude'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                const value = values[index];
                // Convert numeric values
                if (header === 'latitude' || header === 'longitude' || 
                    header.includes('fe') || header.includes('mn') || header.includes('pb') ||
                    header.includes('cd') || header.includes('cr') || header.includes('cu') ||
                    header.includes('ni') || header.includes('zn') || header.includes('iron') ||
                    header.includes('manganese') || header.includes('lead') || header.includes('cadmium') ||
                    header.includes('chromium') || header.includes('copper') || header.includes('nickel') ||
                    header.includes('zinc') || header.includes('chloride') || header.includes('fluoride') ||
                    header.includes('sulfate') || header.includes('tds')) {
                    row[header] = parseFloat(value) || 0;
                } else {
                    row[header] = value;
                }
            });
            
            data.push(row);
        }
    }
    
    return data;
}

function calculateHMPIForData(data) {
    const results = [];
    
    // WHO/BIS Standards for heavy metals (mg/L)
    const standards = {
        iron: 0.3, fe: 0.3,
        manganese: 0.1, mn: 0.1,
        copper: 2.0, cu: 2.0,
        zinc: 3.0, zn: 3.0,
        lead: 0.01, pb: 0.01,
        cadmium: 0.003, cd: 0.003,
        chromium: 0.05, cr: 0.05,
        nickel: 0.07, ni: 0.07,
        fluoride: 1.5,
        chloride: 250,
        sulfate: 250,
        tds: 500
    };
    
    // Toxicity weights
    const weights = {
        lead: 5.0, pb: 5.0,
        cadmium: 5.0, cd: 5.0,
        chromium: 4.0, cr: 4.0,
        nickel: 3.0, ni: 3.0,
        copper: 2.5, cu: 2.5,
        zinc: 2.0, zn: 2.0,
        iron: 2.0, fe: 2.0,
        manganese: 2.0, mn: 2.0,
        fluoride: 3.0,
        chloride: 1.5,
        sulfate: 1.5,
        tds: 1.0
    };
    
    data.forEach(row => {
        let hpi_sum = 0;
        let weight_sum = 0;
        const metalDetails = {};
        
        // Calculate HMPI for each available parameter
        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (standards[lowerKey] && typeof row[key] === 'number' && row[key] > 0) {
                const concentration = row[key];
                const standard = standards[lowerKey];
                const weight = weights[lowerKey] || 1.0;
                
                // Quality rating (Qi) = (Ci / Si) × 100
                const qualityRating = (concentration / standard) * 100;
                
                // Weighted contribution
                const weightedQi = weight * qualityRating;
                hpi_sum += weightedQi;
                weight_sum += weight;
                
                // Status classification
                const ratio = concentration / standard;
                let status;
                if (ratio <= 0.5) status = { level: 'Excellent', color: '#28a745', icon: '✅' };
                else if (ratio <= 1.0) status = { level: 'Acceptable', color: '#17a2b8', icon: '✓' };
                else if (ratio <= 2.0) status = { level: 'Moderate Risk', color: '#ffc107', icon: '⚠️' };
                else if (ratio <= 5.0) status = { level: 'High Risk', color: '#fd7e14', icon: '🔶' };
                else status = { level: 'Severe Risk', color: '#dc3545', icon: '🚨' };
                
                metalDetails[key] = {
                    concentration: concentration,
                    standard: standard,
                    qualityRating: Math.round(qualityRating * 100) / 100,
                    weight: weight,
                    contribution: Math.round(weightedQi * 100) / 100,
                    status: status
                };
            }
        });
        
        // Final HMPI calculation
        const hmpi = weight_sum > 0 ? hpi_sum / weight_sum : 0;
        
        // HMPI classification
        let hmpiCategory, hmpiColor, interpretation;
        if (hmpi < 15) {
            hmpiCategory = 'Excellent';
            hmpiColor = '#28a745';
            interpretation = 'Suitable for drinking with minimal treatment';
        } else if (hmpi < 30) {
            hmpiCategory = 'Good';
            hmpiColor = '#17a2b8';
            interpretation = 'Generally safe for consumption';
        } else if (hmpi < 60) {
            hmpiCategory = 'Moderate';
            hmpiColor = '#ffc107';
            interpretation = 'Requires monitoring and possible treatment';
        } else if (hmpi < 100) {
            hmpiCategory = 'Poor';
            hmpiColor = '#fd7e14';
            interpretation = 'Requires treatment before consumption';
        } else {
            hmpiCategory = 'Very Poor';
            hmpiColor = '#dc3545';
            interpretation = 'Unsuitable for drinking without extensive treatment';
        }
        
        results.push({
            ...row,
            hmpi: Math.round(hmpi * 100) / 100,
            hmpiCategory: hmpiCategory,
            hmpiColor: hmpiColor,
            interpretation: interpretation,
            metalDetails: metalDetails,
            parameterCount: Object.keys(metalDetails).length
        });
    });
    
    return results;
}

function displayCSVResults(results) {
    // Check if required DOM elements exist
    const placeholder = document.getElementById('placeholder');
    const resultsContent = document.getElementById('results-content');
    const csvResults = document.getElementById('csv-results');
    
    if (!placeholder || !resultsContent || !csvResults) {
        console.error('Required DOM elements not found:', {
            placeholder: !!placeholder,
            resultsContent: !!resultsContent,
            csvResults: !!csvResults
        });
        throw new Error('Required DOM elements not found. Please refresh the page.');
    }
    
    // Hide other sections and show CSV results
    placeholder.classList.add('hidden');
    resultsContent.classList.add('hidden');
    csvResults.classList.remove('hidden');
    
    // Display summary
    displaySummaryStatistics(results);
    
    // Display detailed table
    displayDetailedTable(results);
}

function displaySummaryStatistics(results) {
    const summaryContainer = document.getElementById('csv-summary');
    
    if (!summaryContainer) {
        console.error('CSV summary container not found');
        throw new Error('CSV summary container not found. Please refresh the page.');
    }
    
    // Calculate summary statistics
    const totalLocations = results.length;
    const avgHMPI = results.reduce((sum, r) => sum + r.hmpi, 0) / totalLocations;
    
    const categories = {};
    results.forEach(r => {
        categories[r.hmpiCategory] = (categories[r.hmpiCategory] || 0) + 1;
    });
    
    const maxHMPI = Math.max(...results.map(r => r.hmpi));
    const minHMPI = Math.min(...results.map(r => r.hmpi));
    
    summaryContainer.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white">
                <i class="fas fa-chart-bar text-blue-400 mr-2"></i>
                Analysis Summary (${totalLocations} locations)
            </h3>
            <button onclick="showAnalysisTable()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                <i class="fas fa-table mr-1"></i>View Analysis Table
            </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-2xl font-bold text-white">${totalLocations}</div>
                <div class="text-sm text-gray-400">Total Locations</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-blue-400">${avgHMPI.toFixed(1)}</div>
                <div class="text-sm text-gray-400">Average HMPI</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-green-400">${minHMPI.toFixed(1)}</div>
                <div class="text-sm text-gray-400">Best HMPI</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-red-400">${maxHMPI.toFixed(1)}</div>
                <div class="text-sm text-gray-400">Worst HMPI</div>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            ${Object.entries(categories).map(([category, count]) => `
                <div class="text-center p-2 bg-gray-600 rounded">
                    <div class="font-semibold text-white">${count}</div>
                    <div class="text-gray-300">${category}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayDetailedTable(results) {
    const tableContainer = document.getElementById('csv-table-container');
    
    if (!tableContainer) {
        console.error('CSV table container not found');
        throw new Error('CSV table container not found. Please refresh the page.');
    }
    
    // Get all unique metal parameters from the data
    const allMetals = new Set();
    results.forEach(result => {
        Object.keys(result.metalDetails).forEach(metal => allMetals.add(metal));
    });
    
    const metalColumns = Array.from(allMetals).sort();
    
    tableContainer.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="px-4 py-3 text-left">Location</th>
                        <th class="px-4 py-3 text-center">Coordinates</th>
                        <th class="px-4 py-3 text-center">HMPI</th>
                        <th class="px-4 py-3 text-center">Category</th>
                        <th class="px-4 py-3 text-center">Parameters</th>
                        <th class="px-4 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="text-gray-200">
                    ${results.map((result, index) => `
                        <tr class="border-b border-gray-600 hover:bg-gray-600 transition-colors">
                            <td class="px-4 py-3 font-medium">${result.location}</td>
                            <td class="px-4 py-3 text-center text-xs">
                                ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="text-lg font-bold" style="color: ${result.hmpiColor}">
                                    ${result.hmpi}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-1 rounded text-xs font-medium text-white" 
                                      style="background-color: ${result.hmpiColor}">
                                    ${result.hmpiCategory}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="text-blue-400 font-medium">${result.parameterCount}</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button onclick="showDetailedAnalysis(${index})" 
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                                    <i class="fas fa-eye mr-1"></i>View Details
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Store results globally for detail view with backup
    window.csvResults = results;
    window.lastCSVResults = results; // Backup storage
    console.log('CSV results stored in displayDetailedTable:', results.length, 'results');
}

function addMarkersFromCSV(results) {
    // Clear existing markers
    markersLayer.clearLayers();
    
    // Add markers for each location
    results.forEach((result, index) => {
        const marker = L.marker([result.latitude, result.longitude], {
            icon: L.divIcon({
                className: 'csv-marker',
                html: `<div class="marker-icon" style="background: ${result.hmpiColor}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${result.hmpi}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        });
        
        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'popup-content';
        popupContent.innerHTML = `
            <div style='
                background-color: #1a1a1a; 
                color: #ffffff; 
                padding: 15px; 
                border-radius: 8px; 
                font-family: Arial, sans-serif;
                min-width: 250px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                margin: -10px;
            '>
                <h3 style='
                    color: #60a5fa; 
                    margin: 0 0 12px 0; 
                    font-size: 16px; 
                    font-weight: bold;
                    border-bottom: 2px solid #374151; 
                    padding-bottom: 6px;
                '>
                    📍 ${result.location}
                </h3>
                
                <div style='margin-bottom: 12px;'>
                    <strong style='color: #fbbf24;'>HMPI Score:</strong> 
                    <span style='
                        color: ${result.hmpiColor}; 
                        font-weight: bold; 
                        font-size: 20px;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    '>${result.hmpi}</span>
                </div>
                
                <div style='
                    background-color: ${result.hmpiColor}; 
                    color: #000000; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    text-align: center; 
                    font-weight: bold; 
                    margin-bottom: 12px;
                    text-shadow: none;
                '>${result.hmpiCategory}</div>
                
                <div style='
                    color: #e5e7eb; 
                    margin-bottom: 15px; 
                    font-size: 14px;
                '>
                    <strong style='color: #d1d5db;'>Parameters Analyzed:</strong> 
                    <span style='color: #60a5fa; font-weight: bold;'>${result.parameterCount} metals</span>
                </div>
                
                <button id="detail-btn-${index}" style='
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                    color: white; 
                    border: none; 
                    padding: 10px 16px; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    width: 100%; 
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                ' onmouseover='this.style.background="linear-gradient(135deg, #1d4ed8, #1e40af)"' 
                   onmouseout='this.style.background="linear-gradient(135deg, #3b82f6, #1d4ed8)"'>
                    <i class="fas fa-chart-line" style="margin-right: 8px;"></i>View Detailed Analysis
                </button>
                
                <div style='
                    margin-top: 12px; 
                    padding-top: 8px; 
                    border-top: 1px solid #374151; 
                    font-size: 11px; 
                    color: #9ca3af;
                    text-align: center;
                '>
                    Coordinates: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}
                </div>
            </div>
        `;
        
        // Add event listener to the button after popup opens
        marker.on('popupopen', function() {
            const detailBtn = document.getElementById(`detail-btn-${index}`);
            if (detailBtn) {
                detailBtn.addEventListener('click', function() {
                    map.closePopup();
                    showDetailedAnalysis(index);
                });
            }
        });
        
        marker.bindPopup(popupContent);
        marker.addTo(markersLayer);
    });
    
    // Fit map to show all markers
    if (results.length > 0) {
        const group = new L.featureGroup(markersLayer.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

window.showDetailedAnalysis = function(index) {
    console.log('showDetailedAnalysis called with index:', index);
    
    if (!window.csvResults || !window.csvResults[index]) {
        console.error('No CSV results or invalid index:', index);
        alert('Error: No data available for this location.');
        return;
    }
    
    // Automatically expand sidebar to show detailed analysis properly
    expandSidebarForDetailedView();
    
    const result = window.csvResults[index];
    console.log('Analysis result:', result);
    
    // Create detailed analysis modal
    const detailsHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-white">
                    <i class="fas fa-microscope text-blue-400 mr-2"></i>
                    Detailed Analysis: ${result.location}
                </h3>
                <button type="button" onclick="goBackToCSVSummary()" class="back-summary-btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    <i class="fas fa-arrow-left mr-1"></i>Back to Summary
                </button>
            </div>
            
            <div class="detailed-analysis bg-gray-700 rounded-lg p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="hmpi-summary bg-gray-800 rounded-lg p-4">
                        <h4 class="text-lg font-semibold text-white mb-3">
                            <i class="fas fa-chart-pie text-blue-400 mr-2"></i>HMPI Summary
                        </h4>
                        <div class="text-center">
                            <div class="text-4xl font-bold mb-2" style="color: ${result.hmpiColor}">${result.hmpi}</div>
                            <div class="text-lg font-medium mb-2" style="color: ${result.hmpiColor}">${result.hmpiCategory}</div>
                            <div class="text-sm text-gray-400">${result.interpretation || 'Heavy Metal Pollution Index Analysis'}</div>
                        </div>
                    </div>
                    
                    <div class="location-info bg-gray-800 rounded-lg p-4">
                        <h4 class="text-lg font-semibold text-white mb-3">
                            <i class="fas fa-map-marker-alt text-green-400 mr-2"></i>Location Details
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div><strong class="text-white">Location:</strong> <span class="text-gray-300">${result.location}</span></div>
                            <div><strong class="text-white">Coordinates:</strong> <span class="text-gray-300">${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}</span></div>
                            <div><strong class="text-white">Parameters Analyzed:</strong> <span class="text-blue-400">${result.parameterCount}</span></div>
                            <div><strong class="text-white">Analysis Date:</strong> <span class="text-gray-300">${new Date().toLocaleDateString()}</span></div>
                        </div>
                    </div>
                </div>
                
                <div class="metal-details">
                    <h4 class="text-lg font-semibold text-white mb-4">
                        <i class="fas fa-flask text-yellow-400 mr-2"></i>Heavy Metal Parameter Analysis
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${Object.entries(result.metalDetails).map(([metal, details]) => {
                            const concentration = parseFloat(details.concentration);
                            const standard = parseFloat(details.standard);
                            const ratio = concentration / standard;
                            const qualityRating = details.qualityRating;
                            
                            // Determine status with more accurate thresholds
                            let statusColor, statusText, statusIcon, statusBg;
                            if (ratio <= 0.5) {
                                statusColor = '#10b981';
                                statusText = 'EXCELLENT';
                                statusIcon = '✅';
                                statusBg = 'rgba(16, 185, 129, 0.1)';
                            } else if (ratio <= 1.0) {
                                statusColor = '#06b6d4';
                                statusText = 'ACCEPTABLE';
                                statusIcon = '✓';
                                statusBg = 'rgba(6, 182, 212, 0.1)';
                            } else if (ratio <= 2.0) {
                                statusColor = '#f59e0b';
                                statusText = 'MODERATE RISK';
                                statusIcon = '⚠️';
                                statusBg = 'rgba(245, 158, 11, 0.1)';
                            } else if (ratio <= 5.0) {
                                statusColor = '#f97316';
                                statusText = 'HIGH RISK';
                                statusIcon = '🔶';
                                statusBg = 'rgba(249, 115, 22, 0.1)';
                            } else {
                                statusColor = '#ef4444';
                                statusText = 'SEVERE RISK';
                                statusIcon = '🚨';
                                statusBg = 'rgba(239, 68, 68, 0.1)';
                            }
                            
                            // Get the proper metal name
                            const metalName = metal.toUpperCase();
                            const properName = metalName === 'FE' ? 'IRON' : 
                                             metalName === 'MN' ? 'MANGANESE' :
                                             metalName === 'PB' ? 'LEAD' :
                                             metalName === 'CD' ? 'CADMIUM' :
                                             metalName === 'CR' ? 'CHROMIUM' :
                                             metalName === 'CU' ? 'COPPER' :
                                             metalName === 'ZN' ? 'ZINC' :
                                             metalName === 'NI' ? 'NICKEL' : metalName;
                            
                            return `
                                <div class="metal-card bg-gray-800 rounded-lg p-4 border-l-4" style="border-left-color: ${statusColor}; background: linear-gradient(135deg, var(--secondary-bg), ${statusBg});">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="font-bold text-white text-lg">${properName}</span>
                                        <span class="text-2xl">${statusIcon}</span>
                                    </div>
                                    
                                    <div class="space-y-3 text-sm">
                                        <div class="grid grid-cols-2 gap-2">
                                            <div class="text-center p-2 bg-gray-700 rounded">
                                                <div class="text-xs text-gray-400 mb-1">Detected</div>
                                                <div class="text-white font-bold">${concentration.toFixed(3)} mg/L</div>
                                            </div>
                                            <div class="text-center p-2 bg-gray-700 rounded">
                                                <div class="text-xs text-gray-400 mb-1">WHO/BIS Limit</div>
                                                <div class="text-white font-bold">${standard} mg/L</div>
                                            </div>
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-2">
                                            <div class="text-center p-2 bg-gray-700 rounded">
                                                <div class="text-xs text-gray-400 mb-1">Ratio</div>
                                                <div class="text-white font-bold">${ratio.toFixed(2)}x</div>
                                            </div>
                                            <div class="text-center p-2 bg-gray-700 rounded">
                                                <div class="text-xs text-gray-400 mb-1">Quality Index</div>
                                                <div class="text-white font-bold">${qualityRating.toFixed(1)}</div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center justify-between pt-2">
                                            <span class="text-xs text-gray-400">Assessment:</span>
                                            <span class="px-3 py-1 rounded text-xs font-bold text-white" 
                                                  style="background-color: ${statusColor}">
                                                ${statusText}
                                            </span>
                                        </div>
                                        
                                        <div class="text-xs text-gray-400 mt-2">
                                            ${ratio > 1 ? 
                                                `⚠️ Exceeds WHO/BIS standard by ${((ratio - 1) * 100).toFixed(1)}%` :
                                                `✅ Within acceptable limits (${(ratio * 100).toFixed(1)}% of standard)`
                                            }
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h5 class="font-semibold text-white mb-3">
                        <i class="fas fa-info-circle text-blue-400 mr-2"></i>Understanding the Analysis
                    </h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <h6 class="font-medium text-white mb-2">Quality Index Interpretation:</h6>
                            <ul class="space-y-1">
                                <li>• <strong>Quality Index:</strong> (Concentration ÷ Standard) × 100</li>
                                <li>• <strong>Values &lt; 100:</strong> Within WHO/BIS limits</li>
                                <li>• <strong>Values &gt; 100:</strong> Exceeds recommended standards</li>
                                <li>• <strong>Higher values:</strong> Greater contamination risk</li>
                            </ul>
                        </div>
                        <div>
                            <h6 class="font-medium text-white mb-2">HMPI Categories:</h6>
                            <ul class="space-y-1">
                                <li>• <strong>&lt; 15:</strong> Excellent water quality</li>
                                <li>• <strong>15-30:</strong> Good quality, generally safe</li>
                                <li>• <strong>30-60:</strong> Moderate risk, monitor closely</li>
                                <li>• <strong>60-100:</strong> Poor quality, treatment needed</li>
                                <li>• <strong>&gt; 100:</strong> Very poor, extensive treatment required</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-3 bg-gray-700 rounded">
                        <p class="text-xs text-gray-400">
                            <i class="fas fa-exclamation-triangle text-yellow-400 mr-1"></i>
                            <strong>Note:</strong> This analysis is based on WHO/BIS drinking water standards. 
                            For iron: Standard limit is 0.3 mg/L. The detected value of 0.49 mg/L represents 1.63 times the standard limit, 
                            indicating moderate contamination that may affect taste and appearance but is not immediately dangerous to health.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Display the detailed analysis
    document.getElementById('csv-results').innerHTML = detailsHTML;
    
    console.log('Detailed analysis displayed successfully');
};

// Resizable sidebar functionality
function initResizableSidebar() {
    const sidebar = document.querySelector('aside');
    const resizeHandle = document.querySelector('.resize-handle');
    
    if (!sidebar || !resizeHandle) {
        console.warn('Sidebar or resize handle not found');
        return;
    }
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection during resize
        e.preventDefault();
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        // Add visual feedback
        resizeHandle.style.backgroundColor = '#3b82f6';
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const currentX = e.clientX;
        const deltaX = currentX - startX;
        const newWidth = startWidth + deltaX;
        
        // Enforce min and max width constraints
        const minWidth = 320;
        const maxWidth = Math.min(800, window.innerWidth * 0.6);
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebar.style.width = newWidth + 'px';
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        
        // Restore normal cursor and text selection
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        // Remove visual feedback
        resizeHandle.style.backgroundColor = '';
    }
    
    // Add hover effect
    resizeHandle.addEventListener('mouseenter', function() {
        if (!isResizing) {
            this.style.backgroundColor = '#3b82f6';
        }
    });
    
    resizeHandle.addEventListener('mouseleave', function() {
        if (!isResizing) {
            this.style.backgroundColor = '';
        }
    });
}

// Sidebar width management functions
function expandSidebarForDetailedView() {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
        // Store current width for potential restoration
        sidebar.dataset.previousWidth = sidebar.style.width || '384px';
        
        // Expand to maximum allowed width
        const maxWidth = Math.min(800, window.innerWidth * 0.6);
        sidebar.style.width = maxWidth + 'px';
        
        // Add smooth transition
        sidebar.style.transition = 'width 0.3s ease';
        setTimeout(() => {
            sidebar.style.transition = '';
        }, 300);
    }
}

function resetSidebarWidth() {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
        // Restore to previous width or default
        const previousWidth = sidebar.dataset.previousWidth || '384px';
        
        // Add smooth transition
        sidebar.style.transition = 'width 0.3s ease';
        sidebar.style.width = previousWidth;
        
        setTimeout(() => {
            sidebar.style.transition = '';
        }, 300);
    }
}

function restoreSidebarWidth() {
    // Alias for resetSidebarWidth for consistency
    resetSidebarWidth();
}

window.showCSVTable = function() {
    if (!window.csvResults || window.csvResults.length === 0) {
        console.error('No CSV results available');
        return;
    }
    displayCSVResults(window.csvResults);
    
    // Reset sidebar width to default when going back to table
    resetSidebarWidth();
};

// New comprehensive analysis table function
window.showAnalysisTable = function() {
    if (!window.csvResults || window.csvResults.length === 0) {
        alert('No CSV data available. Please upload and analyze a CSV file first.');
        return;
    }
    
    // Automatically expand sidebar for better table view
    expandSidebarForDetailedView();
    
    const results = window.csvResults;
    
    // Get all unique metals across all results
    const allMetals = new Set();
    results.forEach(result => {
        Object.keys(result.metalDetails).forEach(metal => allMetals.add(metal));
    });
    const sortedMetals = Array.from(allMetals).sort();
    
    // Create comprehensive table HTML
    const tableHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-white">
                    <i class="fas fa-microscope text-green-400 mr-2"></i>
                    Comprehensive Heavy Metal Analysis Table
                </h3>
                <button onclick="goBackToSummaryFromTable()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    <i class="fas fa-arrow-left mr-1"></i>Back to Summary
                </button>
            </div>
            
            <div class="bg-gray-700 rounded-lg p-4">
                <div class="overflow-x-auto" style="max-height: 70vh;">
                    <table class="w-full text-sm border-collapse">
                        <thead class="bg-gray-800 text-white sticky top-0 z-10">
                            <tr>
                                <th class="border border-gray-600 px-3 py-2 text-left">Location</th>
                                <th class="border border-gray-600 px-3 py-2 text-center">Lat</th>
                                <th class="border border-gray-600 px-3 py-2 text-center">Lng</th>
                                <th class="border border-gray-600 px-3 py-2 text-center">HMPI</th>
                                <th class="border border-gray-600 px-3 py-2 text-center">Risk</th>
                                ${sortedMetals.map(metal => `
                                    <th class="border border-gray-600 px-3 py-2 text-center">${metal.toUpperCase()}<br><span class="text-xs text-gray-400">(mg/L)</span></th>
                                `).join('')}
                                <th class="border border-gray-600 px-3 py-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-200">
                            ${results.map((result, index) => `
                                <tr class="hover:bg-gray-600 transition-colors">
                                    <td class="border border-gray-600 px-3 py-2 font-medium">${result.location}</td>
                                    <td class="border border-gray-600 px-3 py-2 text-center text-xs">${result.latitude.toFixed(4)}</td>
                                    <td class="border border-gray-600 px-3 py-2 text-center text-xs">${result.longitude.toFixed(4)}</td>
                                    <td class="border border-gray-600 px-3 py-2 text-center">
                                        <span class="font-bold text-lg" style="color: ${result.hmpiColor}">${result.hmpi}</span>
                                    </td>
                                    <td class="border border-gray-600 px-3 py-2 text-center">
                                        <span class="px-2 py-1 rounded text-xs font-medium text-white" style="background-color: ${result.hmpiColor}">
                                            ${result.hmpiCategory}
                                        </span>
                                    </td>
                                    ${sortedMetals.map(metal => {
                                        const metalData = result.metalDetails[metal];
                                        if (metalData) {
                                            const concentration = parseFloat(metalData.concentration);
                                            const standard = parseFloat(metalData.standard);
                                            const ratio = concentration / standard;
                                            let cellColor = '#10b981'; // Green (safe)
                                            if (ratio > 2) cellColor = '#ef4444'; // Red (dangerous)
                                            else if (ratio > 1.5) cellColor = '#f97316'; // Orange (high)
                                            else if (ratio > 1) cellColor = '#f59e0b'; // Yellow (moderate)
                                            
                                            return `
                                                <td class="border border-gray-600 px-3 py-2 text-center" style="background-color: ${cellColor}20; color: ${cellColor}">
                                                    <div class="font-medium">${concentration}</div>
                                                    <div class="text-xs text-gray-400">/${standard}</div>
                                                </td>
                                            `;
                                        } else {
                                            return '<td class="border border-gray-600 px-3 py-2 text-center text-gray-500">N/A</td>';
                                        }
                                    }).join('')}
                                    <td class="border border-gray-600 px-3 py-2 text-center">
                                        <button onclick="showDetailedAnalysis(${index})" 
                                                class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-4 p-3 bg-gray-800 rounded text-xs text-gray-400">
                    <strong>Legend:</strong> 
                    <span class="inline-block mr-4"><span class="inline-block w-3 h-3 bg-green-500 bg-opacity-30 rounded mr-1"></span>Safe (&lt;1x standard)</span>
                    <span class="inline-block mr-4"><span class="inline-block w-3 h-3 bg-yellow-500 bg-opacity-30 rounded mr-1"></span>Moderate (1-1.5x)</span>
                    <span class="inline-block mr-4"><span class="inline-block w-3 h-3 bg-orange-500 bg-opacity-30 rounded mr-1"></span>High (1.5-2x)</span>
                    <span class="inline-block"><span class="inline-block w-3 h-3 bg-red-500 bg-opacity-30 rounded mr-1"></span>Dangerous (&gt;2x standard)</span>
                </div>
            </div>
        </div>
    `;
    
    // Display the analysis table
    document.getElementById('csv-results').innerHTML = tableHTML;
};

// Simple function to go back to main analysis page
window.goBackToMainAnalysis = function() {
    if (window.csvResults && window.csvResults.length > 0) {
        displayCSVResults(window.csvResults);
    }
};

// Function to go back to summary from analysis table
window.goBackToSummaryFromTable = function() {
    console.log('Going back to summary from analysis table');
    
    try {
        // Check if csvResults exists and has data
        if (!window.csvResults || !Array.isArray(window.csvResults) || window.csvResults.length === 0) {
            console.error('No valid CSV results found');
            
            // Try to find CSV results in alternative storage
            if (window.lastCSVResults && Array.isArray(window.lastCSVResults) && window.lastCSVResults.length > 0) {
                console.log('Using lastCSVResults as fallback');
                window.csvResults = window.lastCSVResults;
            } else {
                alert('No CSV data available. Please upload your CSV file again to view the summary.');
                return;
            }
        }
        
        // Force show the sidebar content if it's hidden (keep current width)
        const sidebar = document.querySelector('aside');
        const sidebarContent = sidebar ? sidebar.querySelector('.bg-gray-800') : null;
        if (sidebarContent) {
            sidebarContent.style.display = 'block';
            sidebarContent.style.visibility = 'visible';
        }
        
        // Check if the main csv-results container exists
        const csvResultsContainer = document.getElementById('csv-results');
        if (!csvResultsContainer) {
            console.error('CSV results container not found in DOM');
            alert('Error: CSV results section not found. Please refresh the page.');
            return;
        }
        
        // Restore the original CSV results structure
        console.log('Restoring original CSV results structure');
        csvResultsContainer.innerHTML = `
            <div class="space-y-4">
                <!-- Upload Status -->
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold text-white">
                        <i class="fas fa-file-csv text-green-400 mr-2"></i>
                        CSV Analysis Results
                    </h2>
                    <div class="flex space-x-2">
                        <button onclick="exportToPDF()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <i class="fas fa-file-pdf mr-1"></i>Export PDF
                        </button>
                    </div>
                </div>

                <!-- CSV Summary Statistics -->
                <div id="csv-summary" class="bg-gray-700 rounded-lg p-4 mb-4 min-w-0 overflow-x-auto">
                    <!-- Summary content will be populated by displaySummaryStatistics -->
                </div>

                <!-- CSV Data Table -->
                <div id="csv-table-container" class="bg-gray-700 rounded-lg overflow-auto min-w-0">
                    <!-- Table content will be populated by displayDetailedTable -->
                </div>
            </div>
        `;
        
        // Now the elements exist, so we can call displayCSVResults
        console.log('Calling displayCSVResults with', window.csvResults.length, 'results');
        displayCSVResults(window.csvResults);
        
        // Fix map size after layout changes
        setTimeout(() => {
            if (window.map) {
                map.invalidateSize();
                console.log('Map size invalidated to fix display issues');
            }
        }, 100);
        
        console.log('Successfully returned to CSV summary from table');
        
    } catch (error) {
        console.error('Error in goBackToSummaryFromTable:', error);
        alert('Error returning to summary: ' + error.message + '. Please refresh the page and try again.');
    }
};

// Global fallback function for testing back navigation
window.testBackButton = function() {
    console.log('Testing back button functionality...');
    console.log('CSV Results available:', !!window.csvResults);
    console.log('CSV Results length:', window.csvResults ? window.csvResults.length : 0);
    
    // Force back to summary
    if (window.csvResults && window.csvResults.length > 0) {
        window.goBackToSummaryFromTable();
    } else {
        console.error('No CSV results to go back to');
    }
};

// PDF Export functionality
function initPDFExport() {
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (!window.csvResults || window.csvResults.length === 0) {
                alert('No data available to export. Please analyze CSV data first.');
                return;
            }
            
            exportToPDF();
        });
    }
}

function exportToPDF() {
    console.log('Exporting CSV results to PDF...');
    
    // Check if CSV results exist
    if (!window.csvResults || window.csvResults.length === 0) {
        alert('No CSV data available to export. Please upload a CSV file first.');
        return;
    }
    
    // Show loading state (find the export button)
    const exportBtn = document.querySelector('button[onclick="exportToPDF()"]');
    let originalText = '<i class="fas fa-file-pdf mr-1"></i>Export PDF';
    
    if (exportBtn) {
        originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Generating PDF...';
        exportBtn.disabled = true;
    }
    
    // Prepare data for PDF generation
    const reportData = {
        title: 'Heavy Metal Pollution Analysis Report',
        subtitle: 'Telangana Groundwater Quality Assessment',
        generated_date: new Date().toLocaleDateString(),
        generated_time: new Date().toLocaleTimeString(),
        total_locations: window.csvResults.length,
        analysis_data: window.csvResults,
        summary_statistics: calculateSummaryStats(window.csvResults)
    };
    
    // Send request to Flask backend for PDF generation
    fetch('/export-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('PDF generation failed');
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Heavy_Metal_Analysis_Report_${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}-${new Date().getDate().toString().padStart(2,'0')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('PDF downloaded successfully');
        if (exportBtn) {
            // Show success feedback briefly
            exportBtn.innerHTML = '<i class="fas fa-check mr-1"></i>PDF Downloaded!';
            exportBtn.classList.add('bg-green-600');
            exportBtn.classList.remove('bg-red-600');
            
            setTimeout(() => {
                exportBtn.innerHTML = originalText;
                exportBtn.classList.remove('bg-green-600');
                exportBtn.classList.add('bg-red-600');
                exportBtn.disabled = false;
            }, 2000);
        }
    })
    .catch(error => {
        console.error('PDF export error:', error);
        alert('Failed to generate PDF report. Please try again.');
    })
    .finally(() => {
        // Restore button state if not already handled
        if (exportBtn && exportBtn.disabled) {
            setTimeout(() => {
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }, 100);
        }
    });
}

function calculateSummaryStats(results) {
    if (!results || results.length === 0) return {};
    
    // Initialize categories based on actual HMPI categories used in the analysis
    const categories = {
        'Excellent': 0,
        'Good': 0,
        'Moderate': 0,
        'Poor': 0,
        'Very Poor': 0
    };
    
    let totalHMPI = 0;
    let minHMPI = Infinity;
    let maxHMPI = -Infinity;
    
    console.log('Calculating summary stats for', results.length, 'results');
    
    results.forEach((result, index) => {
        const category = result.hmpiCategory || 'Unknown';
        console.log(`Result ${index}: Category = ${category}, HMPI = ${result.hmpi}`);
        
        // Count categories (including any category not in our predefined list)
        if (categories.hasOwnProperty(category)) {
            categories[category]++;
        } else {
            // Add unknown categories dynamically
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category]++;
        }
        
        const hmpi = parseFloat(result.hmpi);
        if (!isNaN(hmpi)) {
            totalHMPI += hmpi;
            minHMPI = Math.min(minHMPI, hmpi);
            maxHMPI = Math.max(maxHMPI, hmpi);
        }
    });
    
    console.log('Final categories count:', categories);
    
    return {
        categories: categories,
        average_hmpi: (totalHMPI / results.length).toFixed(3),
        min_hmpi: minHMPI === Infinity ? 0 : minHMPI.toFixed(3),
        max_hmpi: maxHMPI === -Infinity ? 0 : maxHMPI.toFixed(3),
        total_locations: results.length
    };
}

// Initialize PDF export when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initPDFExport();
});

// Simple and reliable function to go back to CSV summary
window.goBackToCSVSummary = function() {
    console.log('goBackToCSVSummary called');
    
    try {
        // Check if csvResults exists and has data
        console.log('Checking csvResults:', window.csvResults);
        
        if (!window.csvResults || !Array.isArray(window.csvResults) || window.csvResults.length === 0) {
            console.error('No valid CSV results found. csvResults:', window.csvResults);
            
            // Try to find CSV results in alternative storage
            if (window.lastCSVResults && Array.isArray(window.lastCSVResults) && window.lastCSVResults.length > 0) {
                console.log('Using lastCSVResults as fallback');
                window.csvResults = window.lastCSVResults;
            } else {
                alert('No CSV data available. Please upload your CSV file again to view the summary.');
                return;
            }
        }
        
        // Force show the sidebar content if it's hidden
        const sidebar = document.querySelector('aside');
        const sidebarContent = sidebar ? sidebar.querySelector('.bg-gray-800') : null;
        if (sidebarContent) {
            sidebarContent.style.display = 'block';
            sidebarContent.style.visibility = 'visible';
        }
        
        // Check if the main csv-results container exists
        const csvResultsContainer = document.getElementById('csv-results');
        if (!csvResultsContainer) {
            console.error('CSV results container not found in DOM');
            alert('Error: CSV results section not found. Please refresh the page.');
            return;
        }
        
        // Restore the original CSV results structure since it was replaced by detailed analysis
        console.log('Restoring original CSV results structure');
        csvResultsContainer.innerHTML = `
            <div class="space-y-4">
                <!-- Upload Status -->
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold text-white">
                        <i class="fas fa-file-csv text-green-400 mr-2"></i>
                        CSV Analysis Results
                    </h2>
                    <div class="flex space-x-2">
                        <button onclick="exportToPDF()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <i class="fas fa-file-pdf mr-1"></i>Export PDF
                        </button>
                    </div>
                </div>

                <!-- CSV Summary Statistics -->
                <div id="csv-summary" class="bg-gray-700 rounded-lg p-4 mb-4 min-w-0 overflow-x-auto">
                    <!-- Summary content will be populated by displaySummaryStatistics -->
                </div>

                <!-- CSV Data Table -->
                <div id="csv-table-container" class="bg-gray-700 rounded-lg overflow-auto min-w-0">
                    <!-- Table content will be populated by displayDetailedTable -->
                </div>
            </div>
        `;
        
        // Now the elements exist, so we can call displayCSVResults
        console.log('Calling displayCSVResults with', window.csvResults.length, 'results');
        displayCSVResults(window.csvResults);
        
        // Fix map size after layout changes
        setTimeout(() => {
            if (window.map) {
                map.invalidateSize();
                console.log('Map size invalidated to fix display issues');
            }
        }, 100);
        
        console.log('Successfully returned to CSV summary');
        
    } catch (error) {
        console.error('Error in goBackToCSVSummary:', error);
        console.error('Error stack:', error.stack);
        
        // More specific error message
        if (error.message.includes('not found')) {
            alert('Error: ' + error.message);
        } else if (error.message.includes('csvResults')) {
            alert('Error: CSV data not found. Please upload your CSV file again.');
        } else if (error.message.includes('innerHTML')) {
            alert('Error: Cannot display results. Please refresh the page and upload your CSV file again.');
        } else {
            alert('Error returning to summary: ' + error.message + '. Please refresh the page and try again.');
        }
    }
};