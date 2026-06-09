//Fast Api 
//Cambiar a la del servidor  y se agrega URL de render + direccion donde pide la api 
const SERVIDOR_URL = "https://fibra-optica-ml.onrender.com/api"; 
let radarActivo = false;
let entidadesNodosMap = [];
let lineaEnlaceFibra = null;
let marcadorClicUsuario = null;
let listaNodosCache = [];
let vistaActual = "CESIUM_3D";
let latSincronizada = -24.7850;
let lonSincronizada = -65.4120;
let ultimoReporteTexto = "";