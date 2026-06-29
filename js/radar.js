// Variable global para almacenar temporalmente los datos del último escaneo exitoso
let ultimoResultadoEscaneo = null;

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
        
        // Guardamos el resultado en la ventana de manera global para que el botón PDF lo pueda leer fácilmente
        window.ultimoResultadoEscaneo = resultado;
        
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
                <span style="color: ${colorAlerta}; text-shadow: 0 0 10px ${colorAlerta};">${resultado.diagnostico}</span>
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
            <button class="btn-copiar" onclick="descargarReportePDF(window.ultimoResultadoEscaneo)">⚡ DESCARGAR REPORTE PDF</button>
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

// =========================================================================
// GENERACIÓN Y DESCARGA DE REPORTE EN PDF
// PDF GENERATION AND DOWNLOAD FUNCTION
// =========================================================================
/**
 * Crea un PDF estilizado dinámicamente usando jsPDF y lo descarga automáticamente.
 */
function descargarReportePDF(datos) {
    if (!datos) {
        alert("No hay datos cargados para generar un reporte.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString();

    // Estructuración visual del Reporte Ejecutivo
    // Encabezado Superior (Banner Corporativo Oscuro HUD)
    doc.setFillColor(10, 16, 26);
    doc.rect(0, 0, 210, 40, 'F');

    // Título Principal
    doc.setTextColor(0, 255, 200); // Tono Cyber/Neon del HUD original
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AI FIBER RADAR REPORT", 15, 25);

    // Metadata de Fecha
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de Emisión: ${fechaActual}`, 145, 25);

    // Título de la Sección de Datos Técnicos
    doc.setTextColor(10, 16, 26);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESULTADOS ANÁLISIS GEOGRÁFICO DE IA FIBRA OPTICA", 15, 55);

    // Línea de separación estética
    doc.setDrawColor(0, 255, 200);
    doc.setLineWidth(1);
    doc.line(15, 58, 195, 58);

    // Estructuración de Filas para la Tabla de Información
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);

    const matrizInformacion = [
        { key: "Coordenadas del Punto Analizado:", value: `${latSincronizada.toFixed(6)}, ${lonSincronizada.toFixed(6)}` },
        { key: "Diagnóstico Predictivo de IA:", value: datos.diagnostico },
        { key: "Nivel de Viabilidad / Confianza:", value: datos.viabilidad },
        { key: "Densidad de Población Calculada:", value: `${parseInt(datos.poblacion_automatica).toLocaleString()} Habitantes` },
        { key: "Central de Enlace más Cercana:", value: datos.nodo_cercano },
        { key: "Extensión de Línea de Fibra Requerida:", value: `${datos.distancia_nodo_km} Kilómetros` }
    ];

    let posicionY = 72;
    const altoFila = 10;

    matrizInformacion.forEach((fila) => {
        // Fondo Gris Alternado para mejorar legibilidad
        doc.setFillColor(245, 247, 250);
        doc.rect(15, posicionY - 6, 180, altoFila, 'F');

        // Etiqueta (Negrita)
        doc.setFont("helvetica", "bold");
        doc.text(fila.key, 20, posicionY);

        // Valor devuelto
        doc.setFont("helvetica", "normal");
        doc.text(fila.value, 105, posicionY);

        posicionY += altoFila + 2;
    });

    // Nota Legal / Pie de Página Corporativo
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Prediccion de conectividad de fibra optica de Argentina.", 15, 280);

    // Descarga automática en el navegador del usuario
    doc.save(`Reporte_Prediccion_fibra_optica_Argentina${latSincronizada.toFixed(4)}_${lonSincronizada.toFixed(4)}.pdf`);
}