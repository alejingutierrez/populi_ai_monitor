# Historias de Usuario

Mantén las historias organizadas por área. Añade una nueva historia por solicitud y marca el progreso en `STATUS.md`.

## Frontend
- US-2026-01-23-002 — Como analista, quiero una página de Feed Stream con visión completa del feed, análisis con IA, tendencias y sub-conversaciones, para investigar y actuar sobre los hilos más relevantes.
  - Criterios: propuesta de 4 componentes (propósito, datos, interacciones); mapeo con esquema Neon; plan de implementación sin ejecutar; esquema visual en `FEED_STREAM_VISUAL_SCHEMA.md`.
- US-2026-01-23-003 — Como operador de monitoreo, quiero la construcción completa de la página Feed Stream con sus cuatro componentes (Pulse, Feed, Trend Radar, Sub-conversaciones) para operar el feed en tiempo real.
  - Criterios: nueva vista navegable desde el sidebar; componentes implementados con datos actuales; layout responsive consistente con Overview.
- US-2026-01-23-006 — Como operador, quiero mejoras de UX en Feed Stream (filtros rápidos, densidad, alertas y resúmenes) para acelerar la revisión diaria.
  - Criterios: mejoras aplicadas solo en componentes existentes; sin nuevos componentes.
- US-2026-01-23-007 — Como desarrollador, quiero corregir el error de build en TrendRadar para restaurar el deploy en Vercel.
  - Criterios: build sin error TS1127/TS1381; deploy vuelve a Ready.
- US-2026-01-23-008 — Como operador, quiero reemplazar el bloque Pulso operativo por las tarjetas de métricas del overview en Feed Stream.
  - Criterios: se elimina Pulso operativo y se usan las cards de `SummaryGrid` en Feed Stream.
- US-2026-01-23-009 — Como operador, quiero enriquecer y mejorar el responsive del Pulso operativo para tener mas contexto y analisis en Feed Stream.
  - Criterios: Pulso operativo actualizado con mas informacion y layout responsive mejorado.
- US-2026-01-23-010 — Como operador, quiero reemplazar Pulso operativo por las cards de métricas del overview en Feed Stream.
  - Criterios: Feed Stream muestra SummaryGrid en lugar de Pulso operativo.
- US-2026-01-23-011 — Como analista, quiero un Trend Radar más inteligente, con más métricas y responsive para análisis útil en Feed Stream.
  - Criterios: radar incluye métricas comparativas (volumen, alcance, engagement, riesgo), señales IA, mix de canales/formatos, hotspots y autores; layout responsive mejorado.
- US-2026-01-23-005 — Como desarrollador, quiero corregir el tipado de navegación para evitar fallos de build en Vercel.
  - Criterios: tipos alineados entre Sidebar y App; build sin error de TS2322.

## Backend/API
- _Sin historias activas._

## Data/DB
- _Sin historias activas._

## Infra/Deploy
- _Sin historias activas._

## Docs/Proceso
- US-2026-01-23-001 — Como mantenedor, quiero ampliar la guía de contribución y el README con el flujo de historias/estado, verificación de deploy en Vercel y contexto de Neon, para asegurar consistencia del proyecto.
  - Criterios: AGENTS.md actualizado; README.md actualizado; `USER_STORIES.md` y `STATUS.md` creados.
- US-2026-01-23-004 — Como mantenedor, quiero que AGENTS.md exija revisar siempre los logs de Vercel para evitar deploys fallidos sin seguimiento.
  - Criterios: instrucción explícita en AGENTS.md.
