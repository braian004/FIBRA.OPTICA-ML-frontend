// =========================================================================
// CONFIGURACIÓN DE MAPAS (CESIUM 3D & LEAFLET 2D)
// MAP CONFIGURATION (CESIUM 3D & LEAFLET 2D)
// =========================================================================

// Proveedor de mapas: Satélite de Google
// Map provider: Google Satellite
const googleSatelliteProvider = new Cesium.UrlTemplateImageryProvider({ 
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' 
});

// Inicialización del visor Cesium 3D sin controles por defecto
// Initialization of Cesium 3D viewer without default controls
const viewer = new Cesium.Viewer('cesiumContainer', { 
    imageryProvider: googleSatelliteProvider, 
    baseLayerPicker: false, 
    geocoder: false, 
    homeButton: false, 
    sceneModePicker: false, 
    navigationHelpButton: false, 
    timeline: false, 
    animation: false, 
    infoBox: false 
});

// Vista inicial global en Cesium
// Global initial view in Cesium
viewer.camera.setView({ 
    destination: Cesium.Cartesian3.fromDegrees(lonSincronizada, latSincronizada, 200000000.0) 
});

// Inicialización de Leaflet usando Canvas nativo de alto rendimiento y soporte de zoom amplio
// Leaflet initialization using high-performance native Canvas and wide zoom support
const map = L.map('mapContainer', { 
    zoomControl: false,
    minZoom: 2,
    preferCanvas: true // Renderiza círculos estáticos usando Canvas nativo en vez de SVG (Evita lentitud)
}).setView([latSincronizada, lonSincronizada], 5);

// Capa de satélite basada en las teselas de Google
// Satellite layer based on Google tiles
L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
    maxZoom: 20 
}).addTo(map);

// =========================================================================
// MANIPULACIÓN DE EVENTOS / EVENT HANDLING
// =========================================================================

// Captura de clics en el mapa plano para ejecutar escaneos
// Map clicks capture on flat map to execute scans
map.on('click', (e) => { 
    if (!radarActivo || vistaActual === "CESIUM_3D") return; 
    
    latSincronizada = e.latlng.lat; 
    lonSincronizada = e.latlng.lng; 
    
    actualizarMonitorHUD(); 
    analizarConIAReal(); 
});

// Monitoreo de zoom unificado: controla la optimización de rendimiento de las olas animadas
// Unified zoom monitoring: controls the performance optimization of animated waves
map.on('zoomend', () => { 
    const contenedorMapa = document.getElementById('mapContainer');
    if (!contenedorMapa) return;

    // Si el zoom es menor a 10 (vista lejana), congelamos la ejecución de las olas animadas para evitar lag
    // If zoom is less than 10 (far view), we freeze animated waves execution to prevent lag
    if (map.getZoom() < 10) {
        contenedorMapa.classList.add('mapa-lejano');
    } else {
        contenedorMapa.classList.remove('mapa-lejano');
    }
});

// =========================================================================
// CONTROL DE CAPAS VISUALES / VISUAL LAYERS CONTROL
// =========================================================================

// Transición de interfaz hacia Leaflet 2D y sincronización del switch visual
// Interface transition to Leaflet 2D and visual switch synchronization
function alternarA_Leaflet2D() { 
    vistaActual = "LEAFLET_2D"; 
    
    const toggle = document.getElementById('vistaToggle');
    if (toggle) {
        toggle.checked = true;
        document.getElementById('vistaStatusText').innerText = "LEAFLET 2D ACTIVE";
        document.getElementById('vistaStatusText').className = "status-indicator label-on";
    }

    document.getElementById('cesiumContainer').style.opacity = "0"; 
    document.getElementById('cesiumContainer').style.zIndex = "1"; 
    document.getElementById('mapContainer').style.opacity = "1"; 
    document.getElementById('mapContainer').style.zIndex = "2"; 
    
    map.invalidateSize(); 
    
    if (radarActivo) { 
        cargarNodosDesdePython(); 
        analizarConIAReal(); 
    } 
}

// Transición de interfaz hacia Cesium 3D y reseteo de los componentes en 2D
// Interface transition to Cesium 3D and 2D components reset
function alternarA_Cesium3D() { 
    vistaActual = "CESIUM_3D"; 
    
    const toggle = document.getElementById('vistaToggle');
    if (toggle) {
        toggle.checked = false;
        document.getElementById('vistaStatusText').innerText = "CESIUM 3D ACTIVE";
        document.getElementById('vistaStatusText').className = "status-indicator label-off";
    }

    document.getElementById('mapContainer').style.opacity = "0"; 
    document.getElementById('mapContainer').style.zIndex = "1"; 
    document.getElementById('cesiumContainer').style.opacity = "1"; 
    document.getElementById('cesiumContainer').style.zIndex = "2"; 
    
    limpiarMapaPlano(); 
    limpiarAnalisisAnterior(); 
    
    if (radarActivo) { 
        document.getElementById('aiResult').innerText = "Radar listo en órbita. Aterrice en una localidad para escanear."; 
    } 
}

// =========================================================================
// MÉTODOS DE LIMPIEZA / CLEANUP METHODS
// =========================================================================

// Elimina del mapa Leaflet todos los nodos e iconos de ondas cargados
// Removes all loaded nodes and wave icons from Leaflet map
function limpiarMapaPlano() { 
    entidadesNodosMap.forEach(e => map.removeLayer(e)); 
    entidadesNodosMap = []; 
}

// Remueve líneas de enlace, marcadores de usuario y contornos de localidad
// Removes link lines, user markers, and location outlines
function limpiarAnalisisAnterior() { 
    if (lineaEnlaceFibra) { 
        map.removeLayer(lineaEnlaceFibra); 
        lineaEnlaceFibra = null; 
    } 
    if (marcadorClicUsuario) { 
        map.removeLayer(marcadorClicUsuario); 
        marcadorClicUsuario = null; 
    } 
    
    if (typeof window.borrarResaltadoLugar === "function") { 
        window.borrarResaltadoLugar(); 
    } 
}