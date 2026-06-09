// =========================================================================
// CARGA Y PROCESAMIENTO DE NODOS / NODE LOADING AND PROCESSING
// =========================================================================

/**
 * Descarga los nodos de red desde el servidor Python y los dibuja en el mapa plano.
 * Downloads network nodes from the Python server and draws them on the flat map.
 */
async function cargarNodosDesdePython() {
    if (!radarActivo) return;

    try {
        // Petición de datos al servidor backend
        // Data request to the backend server
        const respuesta = await fetch(`${SERVIDOR_URL}/nodos`);
        listaNodosCache = await respuesta.json();
        
        // Limpiar elementos visuales previos en el mapa plano
        // Clear previous visual elements on the flat map
        limpiarMapaPlano();
        
        // Renderizar cada nodo en el mapa plano con sus animaciones
        // Render each node on the flat map with its animations
        listaNodosCache.forEach((punto) => {
            const latNum = parseFloat(punto.lat); 
            const lonNum = parseFloat(punto.lon);
            
            // 1. Marcador central del nodo
            // 1. Central node marker
            const instanciaPunto = L.circleMarker([latNum, lonNum], { 
                radius: 6, 
                color: '#fff', 
                weight: 1, 
                fillColor: '#ff4a4a', 
                fillOpacity: 1 
            }).bindPopup(`<b>Nodo Central: ${punto.name}</b>`).addTo(map);
            
            // 2. Ondas de radar animadas mediante HTML/CSS
            // 2. Animated radar waves using HTML/CSS
            const estructuraHtmlOlas = `
                <div class="contenedor-olas">
                    <div class="ola-anillo"></div>
                    <div class="ola-anillo"></div>
                    <div class="ola-anillo"></div>
                </div>
            `;
            
            const iconoOlas = L.divIcon({ 
                html: estructuraHtmlOlas, 
                className: '', 
                iconSize: [0, 0] 
            });
            
            const instanciaOndas = L.marker([latNum, lonNum], { icon: iconoOlas }).addTo(map);
            
            // Guardar referencias en el arreglo global de control
            // Save references in the global control array
            entidadesNodosMap.push(instanciaPunto, instanciaOndas);
        });
        
    } catch (error) { 
        console.error("Error en enlace de datos:", error); 
    }
}

// =========================================================================
// ANÁLISIS DE INTELIGENCIA ARTIFICIAL / ARTIFICIAL INTELLIGENCE ANALYSIS
// =========================================================================

/**
 * Envía las coordenadas actuales a la IA para calcular la viabilidad y población.
 * Sends the current coordinates to the AI to calculate viability and population.
 */
async function analizarConIAReal() {
    if (!radarActivo || vistaActual === "CESIUM_3D") return;
    
    const resDiv = document.getElementById('aiResult');
    resDiv.innerText = "Escaneando matriz de población..."; 
    resDiv.style.color = "#8a99ad";
    
    // Limpiar capas de análisis geográfico previas
    // Clear previous geographic analysis layers
    limpiarAnalisisAnterior();
    
    try {
        // Enviar coordenadas seleccionadas al módulo predictivo de IA
        // Send selected coordinates to the AI predictive module
        const respuesta = await fetch(`${SERVIDOR_URL}/analizar`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ lat: latSincronizada, lon: lonSincronizada }) 
        });
        
        const resultado = await respuesta.json();
        
        if (!respuesta.ok) { 
            resDiv.innerText = `ALERTA: ${resultado.mensaje}`; 
            resDiv.style.color = "#ff4a4a"; 
            return; 
        }
        
        // Determinar el color de la interfaz según el nivel del diagnóstico
        // Determine the interface color based on the diagnostic level
        let colorAlerta = "#ff4a4a";
        if (resultado.diagnostico.includes("MUY ALTA") || resultado.diagnostico.includes("ALTA")) { 
            colorAlerta = "#00ffc8"; 
        } else if (resultado.diagnostico.includes("MEDIA")) { 
            colorAlerta = "#ffaa00"; 
        }
        
        const porcentajeFlotante = parseFloat(resultado.viabilidad);
        
        // Construir la cadena de texto plana para la función de copiado rápido
        // Build the plain text string for the quick copy feature
        ultimoReporteTexto = `RADAR REPORT\nUbicación: ${latSincronizada.toFixed(4)}, ${lonSincronizada.toFixed(4)}\nDiagnóstico: ${resultado.diagnostico}\nConfianza: ${resultado.viabilidad}\nPoblación: ${resultado.poblacion_automatica} Hab.\nCentral: ${resultado.nodo_cercano}\nExtensión: ${resultado.distancia_nodo_km} Km`;
        
        // Inyectar las tarjetas KPI con el diseño tecnológico en la consola lateral
        // Inject the KPI cards with the technological layout in the side console
        resDiv.innerHTML = `
            <div class="kpi-card" style="border-left-color: ${colorAlerta}; background: rgba(0,255,200,0.03);">
                <b>DIAGNÓSTICO PREDICTIVO IA:</b>
                <span style="color: ${colorAlerta}; text-shadow: 0 0 10px ${colorAlerta};"${resultado.diagnostico}</span>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${porcentajeFlotante}%; background-color: ${colorAlerta};"></div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #8a99ad; margin-top: 4px;">Confianza: ${resultado.viabilidad}</div>
            </div>
            <div class="kpi-card" style="border-left-color: #00bfff;">
                👥 POBLACIÓN RECONOCIDA:<span>${resultado.poblacion_automatica.toLocaleString()} Hab.</span>
            </div>
            <div class="kpi-card" style="border-left-color: #ffaa00;">
                🛰️ CENTRAL DE ENLACE CERCANA:<span>${resultado.nodo_cercano}</span>
            </div>
            <div class="kpi-card" style="border-left-color: #e5e5e5;">
                📏 EXTENSIÓN DE LÍNEA REQUERIDA:<span>${resultado.distancia_nodo_km} Km</span>
            </div>
            <button class="btn-copiar" onclick="copiarReporteAlPortapapeles()">⚡ COPIAR REPORTE RÁPIDO</button>
        `;
        
        // Dibujar el marcador del punto exacto escaneado en Leaflet
        // Draw the exact scanned point marker in Leaflet
        marcadorClicUsuario = L.circleMarker([latSincronizada, lonSincronizada], { 
            radius: 7, 
            color: colorAlerta, 
            fillColor: '#000', 
            weight: 3, 
            fillOpacity: 1 
        }).addTo(map).bindPopup(`<b>Punto Escaneado por Usuario</b><br>Lat: ${latSincronizada.toFixed(4)}<br>Lon: ${lonSincronizada.toFixed(4)}`).openPopup();
        
        // Trazar línea de enlace (Línea de fibra óptica) hacia el nodo físico más cercano
        // Plot connection line (Fiber optic line) to the nearest physical node
        const nodoCoincidencia = listaNodosCache.find(n => n.name === resultado.nodo_cercano);
        if (nodoCoincidencia) { 
            lineaEnlaceFibra = L.polyline([[latSincronizada, lonSincronizada], [nodoCoincidencia.lat, nodoCoincidencia.lon]], { 
                color: colorAlerta, 
                weight: 2, 
                dashArray: '6, 6', 
                opacity: 0.8 
            }).addTo(map); 
        }
        
    } catch (error) { 
        resDiv.innerText = "Error crítico de enlace con el servidor de IA."; 
        resDiv.style.color = "#ff4a4a"; 
    }
}