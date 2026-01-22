import type { Platform, Sentiment, SocialPost, Topic } from "../types";

const municipalities = [
  { city: "San Juan", lat: 18.4655, lng: -66.1057 },
  { city: "Bayamon", lat: 18.3985, lng: -66.1557 },
  { city: "Ponce", lat: 18.0111, lng: -66.6141 },
  { city: "Mayaguez", lat: 18.2011, lng: -67.1396 },
  { city: "Carolina", lat: 18.3808, lng: -65.9574 },
  { city: "Arecibo", lat: 18.4724, lng: -66.7158 },
  { city: "Caguas", lat: 18.2338, lng: -66.0352 },
  { city: "Humacao", lat: 18.1515, lng: -65.8273 },
  { city: "Fajardo", lat: 18.3258, lng: -65.6526 },
  { city: "Guaynabo", lat: 18.3611, lng: -66.1108 },
  { city: "Trujillo Alto", lat: 18.3547, lng: -66.0074 },
  { city: "Vega Baja", lat: 18.4457, lng: -66.4043 },
  { city: "Isabela", lat: 18.5008, lng: -67.0247 },
  { city: "Culebra", lat: 18.3120, lng: -65.3000 },
  { city: "Vieques", lat: 18.1263, lng: -65.4413 },
];

const topics: Topic[] = [
  "Infraestructura",
  "Turismo",
  "Salud",
  "Seguridad",
  "Energia",
  "Educacion",
  "Clima",
  "Innovacion",
  "Empleo",
  "Comunidad",
];

const sentiments: Sentiment[] = ["positivo", "neutral", "negativo"];
const platforms: Platform[] = [
  "X/Twitter",
  "Facebook",
  "Instagram",
  "YouTube",
  "TikTok",
  "Reddit",
];

const sampleContent = [
  "Vecinos organizando limpieza comunitaria en la costa",
  "Conversación sobre proyectos de energía renovable en la montaña",
  "Video viral de nueva ruta turística por el oeste",
  "Reportan interrupciones de agua y coordinación de cisternas",
  "Debate sobre incentivos para startups locales",
  "Ciudadanos piden más rutas de transporte público",
  "Resumen del foro de seguridad ciudadana en el casco urbano",
  "Estudiantes muestran proyectos de tecnología aplicada a educación",
  "Alerta de oleaje y recomendaciones para pescadores",
  "Historia inspiradora de negocio familiar que exporta café",
  "Análisis de impacto económico tras eventos climáticos recientes",
  "Nueva inversión hotelera y empleo temporal",
  "Reclamos por mantenimiento de carreteras principales",
  "Iniciativa para convertir edificios vacíos en vivienda accesible",
  "Encuesta sobre calidad de servicios de salud en zonas rurales",
  "Cobertura de feria de empleo con empresas tecnológicas",
  "Opiniones divididas sobre plan de manejo de playas",
  "Innovación en agricultura vertical para suplir supermercados",
  "Reporte de tráfico pesado por construcción de puente",
  "Campaña de donación para escuelas técnicas",
  "Cobertura de huracán simulacro y preparación comunitaria",
  "Actualización sobre proyectos de placas solares en escuelas",
  "Conversación sobre turismo gastronómico en el sur",
  "Anuncio de feria de salud en plazas públicas",
  "Reporte de microapagones y reclamos a compañías",
  "Debate sobre seguridad en festivales municipales",
  "Lanzamiento de app cívica para reportar baches",
  "Campaña de reciclaje y economía circular",
  "Cierre de puente por mantenimiento preventivo",
  "Análisis de costo de vida y vivienda asequible",
  "Foro sobre manejo de inundaciones en zonas costeras",
  "Nueva ruta aérea directa a San Juan y su impacto",
  "Iniciativa de alfabetización digital en comunidades",
  "Reporte de congestión en Expreso y desvíos",
  "Conversaciones sobre incentivos para agro local",
  "Cobertura de torneo deportivo comunitario",
  "Alertas de calor extremo y centros de enfriamiento",
  "Opiniones sobre presupuesto municipal 2026",
  "Mesa de diálogo sobre seguridad en transporte público",
  "Historias de emprendedores tech boricuas",
];

const firstNames = [
  "Camila",
  "Sebastián",
  "Valeria",
  "Luis",
  "Andrea",
  "Carlos",
  "Gabriela",
  "Javier",
  "Mariana",
  "Enrique",
  "Lucía",
  "Pedro",
  "Natalia",
  "Diego",
  "Sofía",
  "Fernando",
  "Isabel",
  "Mateo",
  "Carla",
  "Ángel",
  "Patricia",
  "Daniel",
  "Rosa",
  "Óscar",
  "Elena",
  "Manuel",
  "Ana",
  "Ricardo",
  "Paola",
  "Jorge",
  "Lourdes",
  "Héctor",
  "Vivian",
  "Alberto",
  "Nadia",
  "Raúl",
  "Bianca",
  "Sergio",
  "Camille",
  "Alejandro",
  "Marta",
  "Rodrigo",
  "Nicolás",
  "Verónica",
  "Fabiola",
  "Marco",
  "Patty",
  "Andrés",
  "Iris",
  "Guillermo",
  "Patricio",
  "Elisa",
  "Gina",
  "Cristian",
  "Samuel",
  "Rebeca",
  "Jacqueline",
  "Mauricio",
  "Celeste",
  "Tania",
  "Julio",
  "Rafael",
  "Edgar",
  "Lorena",
  "Francisco",
];

const lastNames = [
  "Rivera",
  "González",
  "Rodríguez",
  "Martínez",
  "Santiago",
  "Ortiz",
  "Jiménez",
  "Pérez",
  "Cruz",
  "Torres",
  "Vélez",
  "Hernández",
  "Morales",
  "Figueroa",
  "Ramos",
  "Vargas",
  "Soto",
  "Suárez",
  "Maldonado",
  "Colón",
  "Román",
  "Flores",
  "Nieves",
  "Carrasquillo",
  "Rosario",
  "Caraballo",
  "Aponte",
  "Delgado",
  "Alvarado",
  "López",
  "Matos",
  "Ayala",
  "Pacheco",
  "Meléndez",
  "Quiles",
  "Reyes",
  "Mendoza",
  "Agosto",
  "Labrador",
  "Cardona",
  "Valentín",
  "Fernández",
  "Roldán",
  "Serrano",
  "Feliciano",
  "Carrión",
  "Marrero",
  "Oquendo",
  "Calderón",
  "Zayas",
];

const clusterHierarchy = [
  {
    name: "costas",
    subclusters: [
      { name: "playas", microclusters: ["limpieza", "erosion costera", "turismo costero"] },
      { name: "pesca", microclusters: ["veda", "infraestructura portuaria", "seguridad maritima"] },
      { name: "clima marino", microclusters: ["oleaje", "marejadas", "alertas costeras"] },
    ],
  },
  {
    name: "infraestructura",
    subclusters: [
      { name: "carreteras", microclusters: ["baches", "puentes", "semaforos"] },
      { name: "agua y energia", microclusters: ["acueductos", "microapagones", "planta solar"] },
      { name: "obras publicas", microclusters: ["vivienda", "hospitales", "escuelas"] },
    ],
  },
  {
    name: "inversion",
    subclusters: [
      { name: "desarrollo", microclusters: ["incentivos", "capital privado", "alianzas publicas"] },
      { name: "empresas", microclusters: ["startups", "manufactura", "pymes"] },
      { name: "turismo", microclusters: ["hoteles", "eventos", "gastronomia"] },
    ],
  },
  {
    name: "emergencias",
    subclusters: [
      { name: "clima", microclusters: ["huracanes", "inundaciones", "alertas calor"] },
      { name: "salud publica", microclusters: ["brotes", "hospitales", "vacunacion"] },
      { name: "seguridad civil", microclusters: ["simulacros", "refugios", "rescate"] },
    ],
  },
  {
    name: "comunidad",
    subclusters: [
      { name: "participacion", microclusters: ["voluntariado", "asambleas", "donaciones"] },
      { name: "educacion", microclusters: ["becas", "escuelas tecnicas", "alfabetizacion digital"] },
      { name: "servicios", microclusters: ["transporte publico", "vivienda accesible", "salud comunitaria"] },
    ],
  },
  {
    name: "innovacion",
    subclusters: [
      { name: "tecnologia civica", microclusters: ["apps ciudadanas", "sensores", "datos abiertos"] },
      { name: "energia limpia", microclusters: ["placas solares", "microredes", "eficiencia"] },
      { name: "agrotech", microclusters: ["agricultura vertical", "riego inteligente", "automatizacion"] },
    ],
  },
  {
    name: "transporte",
    subclusters: [
      { name: "movilidad", microclusters: ["congestion", "rutas", "seguridad vial"] },
      { name: "logistica", microclusters: ["puertos", "carga", "cadena suministro"] },
      { name: "aviacion", microclusters: ["rutas aereas", "aeropuerto", "conectividad"] },
    ],
  },
  {
    name: "seguridad",
    subclusters: [
      { name: "policia", microclusters: ["operativos", "denuncias", "patrullaje"] },
      { name: "eventos", microclusters: ["festivales", "multitudes", "control acceso"] },
      { name: "prevencion", microclusters: ["iluminacion", "camaras", "comunidad"] },
    ],
  },
  {
    name: "talento",
    subclusters: [
      { name: "empleo", microclusters: ["ferias empleo", "reconversion", "salarios"] },
      { name: "formacion", microclusters: ["bootcamps", "certificaciones", "universidades"] },
      { name: "retencion", microclusters: ["migracion", "beneficios", "liderazgo"] },
    ],
  },
];


const mediaTypes: SocialPost["mediaType"][] = ["texto", "video", "audio", "imagen"];

const pseudoRand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const pick = <T,>(list: T[], seed: number) => {
  const idx = Math.floor(pseudoRand(seed) * list.length);
  return list[idx % list.length];
};

const LEGACY_COUNT = 1000;
const LEGACY_RANGE = {
  start: "2025-09-01T00:00:00Z",
  end: "2025-12-31T23:59:59Z",
};
const JAN_RANGE = {
  start: "2026-01-01T00:00:00Z",
  end: "2026-01-20T23:59:59Z",
};

const buildTimestamp = (index: number, range: { start: string; end: string }, seedOffset = 0) => {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  const span = end - start;
  const offset = Math.floor(pseudoRand(index * 7.3 + seedOffset) * span);
  const ts = new Date(start + offset);
  // distribuir horas de manera más realista (picos en tarde/noche)
  const hourBias = Math.floor(pseudoRand(index * 11.1 + seedOffset) * 18) + 6; // 6am-24h
  ts.setUTCHours(hourBias, Math.floor(pseudoRand(index * 13.7 + seedOffset) * 60));
  return ts.toISOString();
};

const buildAuthor = (seed: number) => {
  const first = pick(firstNames, seed * 1.1);
  const last = pick(lastNames, seed * 1.7);
  return `${first} ${last}`;
};

export const generateMockPosts = (count = 2000): SocialPost[] => {
  const posts: SocialPost[] = [];

  const legacyCount = Math.min(count, LEGACY_COUNT);
  const extraCount = Math.max(0, count - legacyCount);

  const pickClusterPath = (seed: number) => {
    const cluster = pick(clusterHierarchy, seed * 1.7);
    const subcluster = pick(cluster.subclusters, seed * 2.3);
    const microcluster = pick(subcluster.microclusters, seed * 3.1);
    return {
      cluster: cluster.name,
      subcluster: subcluster.name,
      microcluster,
    };
  };

  const buildPost = (
    index: number,
    range: { start: string; end: string },
    seedOffset: number
  ) => {
    const seed = index + seedOffset;
    const muni = municipalities[index % municipalities.length];
    const topic = pick(topics, seed * 1.3);
    const sentiment = pick(sentiments, seed * 2.1);
    const platform = pick(platforms, seed * 0.9);
    const clusterPath = pickClusterPath(seed);
    const content = `${pick(sampleContent, seed)}. ${
      seed % 4 === 0
        ? "IA sugiere seguimiento y respuesta coordinada."
        : "Ciudadanía mantiene la conversación activa."
    }`;

    posts.push({
      id: `pr-${index + 1}`,
      author: buildAuthor(seed + 3),
      handle: `@${buildAuthor(seed * 2.3)
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .slice(0, 10)}_${(seed % 87) + 13}`,
      platform,
      content: `${content} Tema: ${topic}.`,
      sentiment,
      topic,
      location: { ...muni },
      timestamp: buildTimestamp(index, range, seedOffset),
      reach: Math.floor(500 + pseudoRand(seed * 3.2) * 9500),
      engagement: Math.floor(30 + pseudoRand(seed * 5.1) * 1200),
      mediaType: pick(mediaTypes, seed * 4.4),
      cluster: clusterPath.cluster,
      subcluster: clusterPath.subcluster,
      microcluster: clusterPath.microcluster,
    });
  };

  for (let i = 0; i < legacyCount; i += 1) {
    buildPost(i, LEGACY_RANGE, 0);
  }

  for (let i = 0; i < extraCount; i += 1) {
    buildPost(legacyCount + i, JAN_RANGE, 900);
  }

  return posts;
};

export const localPosts: SocialPost[] = generateMockPosts(2000);
