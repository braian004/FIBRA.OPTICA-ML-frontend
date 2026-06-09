// =========================================================================
// VARIABLES GLOBALES / GLOBAL VARIABLES
// =========================================================================
let capaPoligonoResaltado = null;
let temporizadorBusqueda;

// =========================================================================
// 1. AUTOCOMPLETADO DE LUGARES / PLACES AUTOCOMPLETE
// =========================================================================

// Escuchar la escritura en el campo de búsqueda para detonar sugerencias
// Listen to input in the search field to trigger suggestions
document.getElementById('locationInput').addEventListener('input', function() {
    clearTimeout(temporizadorBusqueda);
    const entrada = this.value.trim();
    
    removerListaAutocompletado();

    if (entrada.length < 3) return;

    // Retraso para optimizar peticiones al servidor (Debounce)
    // Delay to optimize server requests (Debounce)
    temporizadorBusqueda = setTimeout(() => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=5&polygon_geojson=1`)
            .then(res => res.json())
            .then(data => {
                if (data.length === 0) return;
                
                const listaContenedor = document.createElement('div');
                listaContenedor.id = "autocomplete-lista";
                listaContenedor.className = "autocomplete-sugerencias";
                
                data.forEach(lugar => {
                    const item = document.createElement('div');
                    item.className = "autocomplete-item";
                    item.innerText = lugar.display_name;
                    
                    // Al hacer clic en una sugerencia, cambia a 3D e inicia el viaje visual
                    // When clicking a suggestion, switch to 3D and start the visual flight
                    item.addEventListener('click', () => {
                        document.getElementById('locationInput').value = lugar.display_name;
                        removerListaAutocompletado();
                        
                        alternarA_Cesium3D();
                        ejecutarVueloHaciaUbicacion(lugar);
                    });
                    listaContenedor.appendChild(item);
                });
                
                document.getElementById('searchContainer').appendChild(listaContenedor);
            })
            .catch(err => console.error("Error en autocompletado:", err));
    }, 400);
});

// Cerrar lista si se hace clic fuera del buscador
// Close list if clicked outside the search bar
document.addEventListener('click', (e) => {
    if (e.target.id !== 'locationInput') {
        removerListaAutocompletado();
    }
});

// Eliminar el nodo HTML de la lista desplegable de sugerencias
// Remove the HTML node of the suggestions dropdown list
function removerListaAutocompletado() {
    const listaExistente = document.getElementById('autocomplete-lista');
    if (listaExistente) listaExistente.remove();
}

// =========================================================================
// 2. VUELO Y RESALTADO DE LUGAR / FLY AND PLACE HIGHLIGHT
// =========================================================================

// Ejecutar búsqueda directa desde el botón buscar
// Execute direct search from the search button
function ejecutarVueloPlaneta3D() {
    const entrada = document.getElementById('locationInput').value;
    if (!entrada) return;
    document.getElementById('searchBtn').disabled = true;
    
    // Forzar el cambio a 3D antes de la consulta para garantizar la experiencia cinemática
    // Force transition to 3D before the query to guarantee the cinematic experience
    alternarA_Cesium3D();
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(entrada)}&limit=1&polygon_geojson=1`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('searchBtn').disabled = false;
            if (data.length > 0) {
                ejecutarVueloHaciaUbicacion(data[0]);
            } else {
                alert("No se encontró la localidad ingresada.");
            }
        })
        .catch(() => {
            document.getElementById('searchBtn').disabled = false;
        });
}

// Controlar la animación de vuelo de Cesium y Leaflet
// Control Cesium and Leaflet flight animation
function ejecutarVueloHaciaUbicacion(lugar) {
    latSincronizada = parseFloat(lugar.lat);
    lonSincronizada = parseFloat(lugar.lon);
    actualizarMonitorHUD();
    
    // Asegurar que Cesium inicie la animación desde el espacio exterior
    // Ensure Cesium starts the animation from outer space
    alternarA_Cesium3D();
    
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lonSincronizada, latSincronizada, 14000.0),
        duration: 3.5,
        complete: () => {
            map.setView([latSincronizada, lonSincronizada], 13);
            alternarA_Leaflet2D();
            
            if (lugar.geojson && (lugar.geojson.type === "Polygon" || lugar.geojson.type === "MultiPolygon")) {
                resaltarPoligonoLugar(lugar.geojson);
            }
        }
    });
}

// Dibujar polígono con estilo Google Maps (Contorno discontinuo)
// Draw polygon with Google Maps style (Dashed outline)
function resaltarPoligonoLugar(geojsonData) {
    borrarResaltadoLugar();
    
    capaPoligonoResaltado = L.geoJSON(geojsonData, {
        style: {
            color: '#00ffc8',       // Cyan brillante
            weight: 3,              // Grosor
            dashArray: '6, 8',      // Línea discontinua
            fillColor: '#00ffc8',   // Relleno
            fillOpacity: 0.12       // Opacidad sutil
        }
    }).addTo(map);
}

// Eliminar el polígono actual del mapa
// Remove the current polygon from the map
window.borrarResaltadoLugar = function() {
    if (capaPoligonoResaltado) {
        map.removeLayer(capaPoligonoResaltado);
        capaPoligonoResaltado = null;
    }
};

// =========================================================================
// 3. MONITOREO Y CONECTIVIDAD RADAR / MONITORING AND RADAR CONNECTIVITY
// =========================================================================

// Obtener la posición del dispositivo vía GPS nativo
// Get device position via native GPS
function obtenerUbicacionActualGPS() { 
    if (!navigator.geolocation) { 
        alert("Tu navegador no soporta geolocalización."); 
        return; 
    } 
    
    navigator.geolocation.getCurrentPosition((position) => { 
        latSincronizada = position.coords.latitude; 
        lonSincronizada = position.coords.longitude; 
        actualizarMonitorHUD(); 
        
        if (vistaActual === "LEAFLET_2D") { 
            limpiarAnalisisAnterior(); 
            map.flyTo([latSincronizada, lonSincronizada], 14, { duration: 2.5 }); 
            setTimeout(() => { 
                if (radarActivo) { 
                    cargarNodosDesdePython(); 
                    analizarConIAReal(); 
                } 
            }, 2500); 
        } else { 
            viewer.camera.flyTo({ 
                destination: Cesium.Cartesian3.fromDegrees(lonSincronizada, latSincronizada, 6000.0), 
                duration: 3.5, 
                complete: () => { 
                    map.setView([latSincronizada, lonSincronizada], 14); 
                    alternarA_Leaflet2D(); 
                } 
            }); 
        } 
    }, () => { 
        alert("No se pudo acceder a tu ubicación GPS."); 
    }); 
}

// Sincronizar datos numéricos en pantalla (HUD)
// Sync numerical data on screen (HUD)
function actualizarMonitorHUD() { 
    document.getElementById('hudLat').innerText = latSincronizada.toFixed(4); 
    document.getElementById('hudLon').innerText = lonSincronizada.toFixed(4); 
}

// Copiar la información del reporte al portapapeles
// Copy report information to clipboard
function copiarReporteAlPortapapeles() { 
    if(!ultimoReporteTexto) return; 
    navigator.clipboard.writeText(ultimoReporteTexto); 
    alert("¡Reporte de Viabilidad IA copiado al portapapeles con éxito!"); 
}

// Alternar el encendido/apagado del switch del Radar Engine
// Toggle Radar Engine switch power status
function toggleRadarEngine() { 
    const toggle = document.getElementById('radarToggle'); 
    const statusText = document.getElementById('radarStatusText'); 
    
    if (toggle.checked) { 
        radarActivo = true; 
        statusText.innerText = "RADAR ONLINE"; 
        statusText.className = "status-indicator label-on"; 
        
        if (vistaActual === "LEAFLET_2D") { 
            cargarNodosDesdePython(); 
            analizarConIAReal(); 
        } else { 
            document.getElementById('aiResult').innerText = "Radar listo en órbita. Busque una localidad para aterrizar."; 
        } 
    } else { 
        radarActivo = false; 
        statusText.innerText = "RADAR OFFLINE"; 
        statusText.className = "status-indicator label-off"; 
        document.getElementById('aiResult').innerText = "Active el RADAR POWER para iniciar el escaneo..."; 
        
        limpiarMapaPlano(); 
        limpiarAnalisisAnterior(); 
    } 
}

// =========================================================================
// 4. CONTROL MANUAL DE VISTA (2D / 3D) / MANUAL VIEW CONTROL (2D / 3D)
// =========================================================================

// Alternar manualmente las capas de visualización sin perder la posición actual
// Manually toggle map display layers without losing the current position
function toggleVistaManual() {
    const toggle = document.getElementById('vistaToggle');
    const statusText = document.getElementById('vistaStatusText');
    
    if (toggle.checked) {
        // ==========================================
        // PASAR DE 3D (CESIUM) A 2D (LEAFLET)
        // ==========================================
        statusText.innerText = "LEAFLET 2D ACTIVE";
        statusText.className = "status-indicator label-on";
        
        // 1. Capturar la posición exacta del centro de la pantalla en Cesium 3D
        const ventanaCentro = new Cesium.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2);
        const coordenadaCartesiana = viewer.camera.pickEllipsoid(ventanaCentro, viewer.scene.globe.ellipsoid);
        
        if (coordenadaCartesiana) {
            const posicionCartografica = viewer.scene.globe.ellipsoid.cartesianToCartographic(coordenadaCartesiana);
            latSincronizada = Cesium.Math.toDegrees(posicionCartografica.latitude);
            lonSincronizada = Cesium.Math.toDegrees(posicionCartografica.longitude);
        }
        
        // 2. Calcular una altura/zoom intermedio suave (Si está muy lejos, lo acerca un poco)
        let zoomActualLeaflet = map.getZoom();
        if (zoomActualLeaflet < 4) {
            zoomActualLeaflet = 5; // Zoom ideal para ver el continente de forma clara
        }
        
        // 3. Sincronizar y activar el mapa 2D en el lugar exacto sin saltos
        actualizarMonitorHUD();
        map.setView([latSincronizada, lonSincronizada], zoomActualLeaflet);
        alternarA_Leaflet2D();
        
    } else {
        // ==========================================
        // PASAR DE 2D (LEAFLET) A 3D (CESIUM)
        // ==========================================
        statusText.innerText = "CESIUM 3D ACTIVE";
        statusText.className = "status-indicator label-off";
        
        // 1. Capturar la posición exacta del centro de la pantalla en Leaflet 2D
        const centroActualLeaflet = map.getCenter();
        latSincronizada = centroActualLeaflet.lat;
        lonSincronizada = centroActualLeaflet.lng;
        
        // 2. Calcular la altura de la cámara en base al nivel de zoom actual de Leaflet
        const nivelZoom = map.getZoom();
        const alturaCalculada = Math.max(1200.0, 40000000.0 / Math.pow(2, nivelZoom));
        
        // 3. Sincronizar y activar el globo 3D en la misma coordenada
        actualizarMonitorHUD();
        alternarA_Cesium3D();
        
        viewer.camera.setView({ 
            destination: Cesium.Cartesian3.fromDegrees(lonSincronizada, latSincronizada, alturaCalculada) 
        });
    }
}