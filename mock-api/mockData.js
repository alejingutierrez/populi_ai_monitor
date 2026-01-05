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
  { city: "Culebra", lat: 18.312, lng: -65.3 },
  { city: "Vieques", lat: 18.1263, lng: -65.4413 },
];

const topics = [
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

const sentiments = ["positivo", "neutral", "negativo"];
const platforms = ["X/Twitter", "Facebook", "Instagram", "YouTube", "TikTok", "Reddit"];
const clusters = [
  "costas",
  "infraestructura",
  "inversion",
  "emergencias",
  "comunidad",
  "innovacion",
  "transporte",
  "seguridad",
  "talento",
];
const mediaTypes = ["texto", "video", "audio", "imagen"];

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

const pseudoRand = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const pick = (list, seed) => {
  const idx = Math.floor(pseudoRand(seed) * list.length);
  return list[idx % list.length];
};

const buildTimestamp = (index) => {
  const start = new Date("2025-09-01T00:00:00Z").getTime();
  const end = new Date("2025-12-31T23:59:59Z").getTime();
  const span = end - start;
  const offset = Math.floor(pseudoRand(index * 7.3) * span);
  const ts = new Date(start + offset);
  const hourBias = Math.floor(pseudoRand(index * 11.1) * 18) + 6;
  ts.setUTCHours(hourBias, Math.floor(pseudoRand(index * 13.7) * 60));
  return ts.toISOString();
};

const buildAuthor = (seed) => {
  const first = pick(firstNames, seed * 1.1);
  const last = pick(lastNames, seed * 1.7);
  return `${first} ${last}`;
};

export const generateMockPosts = (count = 400) => {
  const posts = [];

  for (let i = 0; i < count; i += 1) {
    const muni = municipalities[i % municipalities.length];
    const topic = pick(topics, i * 1.3);
    const sentiment = pick(sentiments, i * 2.1);
    const platform = pick(platforms, i * 0.9);
    const cluster = pick(clusters, i * 1.7);
    const content = `${pick(sampleContent, i)}. ${i % 4 === 0 ? "IA sugiere seguimiento y respuesta coordinada." : "Ciudadanía mantiene la conversación activa."}`;

    posts.push({
      id: `pr-${i + 1}`,
      author: buildAuthor(i + 3),
      handle: `@${buildAuthor(i * 2.3)
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .slice(0, 10)}_${(i % 87) + 13}`,
      platform,
      content: `${content} Tema: ${topic}.`,
      sentiment,
      topic,
      location: { ...muni },
      timestamp: buildTimestamp(i),
      reach: Math.floor(500 + pseudoRand(i * 3.2) * 9500),
      engagement: Math.floor(30 + pseudoRand(i * 5.1) * 1200),
      mediaType: pick(mediaTypes, i * 4.4),
      cluster,
    });
  }

  return posts;
};
