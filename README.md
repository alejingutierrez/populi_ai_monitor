# Populi AI Monitor (Puerto Rico)

Dashboard prototipo para monitorear conversaciones sociales y noticias de Puerto Rico con IA, mapa en vivo y núcleos de temas.

## Características
- Layout profesional en React + TypeScript + Tailwind, colores bandera PR y acentos IA.
- 2000 posts de ejemplo (1000 Sep–Dic 2025 + 1000 Ene 1–20, 2026) con coordenadas en Puerto Rico, sentimiento, tema, plataforma y estructura de cluster/subcluster/microcluster.
- MapLibre con puntos en tiempo real y densidad geográfica.
- Filtros rápidos (sentimiento, plataforma, tema, horizonte temporal, cluster/subcluster/microcluster).
- Paneles: métricas, timeline, feed priorizado, treemap jerárquico y tendencias de conversación.
- Mock API separada (Express) y frontend dockerizados en contenedores independientes.

## Requisitos
- Node 20+ y npm 10+ (para desarrollo local)
- Docker + docker-compose (para la opción contenedores)

## Uso rápido (local)
1) Instalar frontend y levantar Vite:
```bash
npm install
npm run dev
```
2) En otra terminal, levantar la API mock:
```bash
npm install --prefix mock-api
npm start --prefix mock-api
```
3) Si `DATABASE_URL` está presente en `.env`, la API usará Neon; si no, sirve datos mock.
4) Navega a `http://localhost:5173` (frontend) y `http://localhost:4000/posts` (API).

Variable: `VITE_API_BASE_URL` (por defecto `http://localhost:4000`). Copia `.env.example` a `.env` si quieres modificarla.

## Deploy en Vercel
- Frontend Vite con salida en `dist/`.
- Funciones serverless en `api/` (`/api/posts` y `/api/health`) con conexión a Neon vía `DATABASE_URL`.
- En producción el frontend usa `/api` por defecto; configura `VITE_API_BASE_URL` si apuntas a otro backend.

## Con contenedores
```bash
docker-compose up --build
```
- Frontend: http://localhost:4173
- API host: http://localhost:4001/posts (mapea al contenedor en 4000)

## Estructura
- `src/` componentes del dashboard (sidebar, header, filtros, mapa, gráficos).
- `src/data/localPosts.ts` datos mock (2000 posts) con generador determinista.
- `mock-api/` mock API Express con el mismo generador de posts.
- `api/` funciones serverless para Vercel.
- `Dockerfile` (frontend) y `mock-api/Dockerfile` (API); `docker-compose.yml` para orquestar.

## Notas de diseño
- MapLibre usa estilo público Carto Voyager; los colores siguen la bandera (azul PR, rojo, blanco).
- Animaciones ligeras con Framer Motion y gráficos con Recharts.
- Para producción: puedes dividir más el bundle con `manualChunks` de Vite si el tamaño es un issue.
- Deploy check: 2026-01-20.

## Base de datos (Neon/Postgres)
Estructura y seed en SQL dentro de `db/`:
1) Crear esquema:
```bash
psql "$DATABASE_URL" -f db/schema.sql
```
2) Generar seed desde los datos mock (opcional si ya está generado):
```bash
node scripts/generate-seed.mjs
```
3) Cargar datos:
```bash
psql "$DATABASE_URL" -f db/seed.sql
```

## Puertos en Docker (conflictos)
Si tienes algo usando `4000`, el compose mapea la API en el host `4001`→`4000` del contenedor. Frontend queda en `4173`.
