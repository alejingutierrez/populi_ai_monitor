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
- US-2026-01-23-012 — Como operador, quiero simplificar Trend Radar para que sea legible y no esté saturado.
  - Criterios: menos bloques, métricas esenciales, mayor aire visual y cálculos ajustados.
  - Criterios: tarjetas KPI en grid 2x2 para evitar saturación.
- US-2026-01-23-013 — Como analista, quiero una página Geo Tagging enfocada en mapas y geolocalización para entender cobertura territorial y hotspots.
  - Criterios: layout dedicado con mapa principal, paneles de insights territoriales y resumen operativo; esquema visual en `GEO_TAGGING_VISUAL_SCHEMA.md`.
- US-2026-01-23-014 — Como analista, quiero una página Network Connections con grafos entre clusters, subclusters y microclusters para entender relaciones entre temas.
  - Criterios: vista con grafos por nivel, filtros y panel de insights; esquema visual en `NETWORK_CONNECTIONS_VISUAL_SCHEMA.md`.
  - Criterios: definir lógica de co-ocurrencia y métricas de centralidad para nodos/enlaces.
- US-2026-01-24-015 — Como analista, quiero refactorizar el grafo de Network Connections para que sea más profesional y legible sin usar librerías externas.
  - Criterios: layout de fuerza mejorado (colisiones y estabilidad), rendering con curvas/halos, mejor legibilidad y responsividad.
- US-2026-01-25-016 — Como analista, quiero definir la sección Alerts (visión de producto + plan técnico) para alinear el backend y frontend antes de construirla.
  - Criterios: propuesta de layout y módulos UI; esquema visual en `ALERTS_VISUAL_SCHEMA.md`; modelo de datos y reglas de alertas; endpoints/APIs sugeridos; integración con filtros globales y acciones sobre posts.
- US-2026-01-25-017 — Como operador, quiero la sección Alerts implementada con vista, módulos y acciones para gestionar alertas críticas.
  - Criterios: nueva vista Alerts navegable; módulos Pulse/Stream/Intel/Timeline; acciones rápidas (ack/snooze/escalar/resolver); integración con filtros globales.
- US-2026-01-23-005 — Como desarrollador, quiero corregir el tipado de navegación para evitar fallos de build en Vercel.
  - Criterios: tipos alineados entre Sidebar y App; build sin error de TS2322.
- US-2026-02-03-023 — Como analista, quiero un paquete de 40 mejoras inteligentes para la página de Alerts (front/back + datos) para priorizar la siguiente iteración.
  - Criterios: 40 mejoras concretas con referencias a componentes/servicios; incluye ajustes de modelo de datos, reglas y UX.
  - Criterios: mejoras agrupadas en paquetes y distribuidas en US-2026-02-03-024 a US-2026-02-03-027.
- US-2026-02-03-027 — Como operador, quiero un paquete de UX de triage e inteligencia en Alerts para acelerar decisiones y ejecutar acciones en lote.
  - Incluye: (M34) corregir delta de “En investigación” con `prevAlerts` en `src/pages/AlertsPage.tsx`.
  - Incluye: (M35) multiselección + acciones bulk (ack/snooze/resolver) y atajos de teclado en `src/components/AlertsStream.tsx`.
  - Incluye: (M36) tabs por estado con conteos y vistas guardadas para triage rápido.
  - Incluye: (M37) mostrar edad/SLA por alerta y resaltar breaches.
  - Incluye: (M38) mini sparklines de volumen/negatividad por alerta.
  - Incluye: (M39) sección “Por qué disparó” (reglas, valores, umbrales, confidence) en `src/components/AlertIntel.tsx`.
  - Incluye: (M40) evidencia expandible con chips de sentimiento, link a Feed Stream y CTA de aplicar filtros.
  - Progreso: tabs de triage, bulk + atajos, SLA/sparklines en stream y panel Intel con reglas/evidencia/CTA.

## Backend/API
- US-2026-01-25-018 — Como desarrollador, quiero endpoints de Alerts con cálculo de reglas para abastecer el frontend.
  - Criterios: `/api/alerts` (GET) con filtros; `/api/alerts/[id]` (GET); `/api/alerts/[id]/actions` (POST) stub; mock-api equivalente.
- US-2026-02-03-025 — Como analista, quiero un motor de alertas más inteligente para detectar señales complejas y priorizar riesgos reales.
  - Incluye: (M11) baseline rolling con z-score para spikes.
  - Incluye: (M12) `minVolume` por scope basado en histórico local (mediana).
  - Incluye: (M13) impacto basado en mediana/percentiles para reducir outliers.
  - Incluye: (M14) señal de “sentiment shift” (delta) además de nivel absoluto.
  - Incluye: (M15) señal de “topic novelty” vs baseline.
  - Incluye: (M16) señal “cross-platform spike”.
  - Incluye: (M17) señal de coordinación por similitud de contenido/autores.
  - Incluye: (M18) señal de expansión geográfica.
  - Incluye: (M19) severidad por score compuesto (volumen + negatividad + riesgo + impacto).
  - Incluye: (M20) deduplicación jerárquica parent/child entre scopes.
  - Incluye: (M23) ranking de evidencia con negatividad + engagement.
  - Incluye: (M24) evidencia diversificada (1 por autor).
  - Incluye: (M25) `explanations` con regla/valor/umbral por alerta.
- US-2026-02-03-026 — Como operador, quiero un paquete de API de Alerts con filtros avanzados, payloads enriquecidos y acciones persistentes.
  - Incluye: (M26) `GET /api/alerts` con `severity`, `status`, `sort`, `limit`, `cursor`.
  - Incluye: (M27) payload con `pulseStats`, `timeline`, `rules` precomputados.
  - Incluye: (M28) `window`, `prevWindow`, `baseline` en respuesta para deltas consistentes.
  - Incluye: (M29) `GET /api/alerts/:id` con `history` y `relatedAlerts`.
  - Incluye: (M30) `POST /api/alerts/:id/actions` persistente (`actor`, `note`, `snoozeUntil`) y retorno actualizado.
  - Incluye: (M07) `baselineStats` en payload para evitar recomputos en `AlertsPage`.
  - Progreso: API y mock con filtros/metrics avanzados, acciones persistentes con snapshot y `AlertsPage` consumiendo métricas remotas.
- US-2026-02-02-021 — Como analista, quiero definir la estrategia de ingesta diaria y backfill de menciones de Brandwatch para dimensionar volumen y límites.
  - Criterios: guía de factibilidad con límites, paginación/cursor, y plan de ejecución para 30k/día y 500k histórico, con estimaciones de tiempo por rate limit.

## Data/DB
- US-2026-02-03-024 — Como analista, quiero un paquete de datos/lifecycle de Alerts para trazabilidad, scoring y persistencia temporal.
  - Incluye: (M01) campos `firstSeenAt`, `lastStatusAt`, `ackAt`, `resolvedAt`, `snoozeUntil`.
  - Incluye: (M02) `occurrences` y `activeWindowCount` para persistencia real.
  - Incluye: (M03) `confidence` por tamaño de muestra y consistencia de señales.
  - Incluye: (M04) `priority` separado de `severity`.
  - Incluye: (M05) `owner`/`team`/`assignee`.
  - Incluye: (M06) `ruleIds` y `ruleValues` (explainability).
  - Incluye: (M08) `uniqueAuthors` y `newAuthorsPct`.
  - Incluye: (M09) `geoSpread` (número de municipios).
  - Incluye: (M10) `topEntities`/`keywords`.
  - Incluye: (M21) IDs estables por hash `scopeType+scopeId+rule+bucket`.
  - Incluye: (M22) separación `alert` vs `alert_instance`.
  - Incluye: (M31) tabla `alert_actions` para auditoría.
  - Incluye: (M32) tabla `alert_metrics` time-series.
  - Incluye: (M33) tabla `alert_rules` con thresholds y overrides.

## Infra/Deploy
- US-2026-02-03-028 — Como mantenedor, quiero diagnosticar y corregir el auto-deploy de Vercel tras `git push` para garantizar despliegues automáticos.
  - Criterios: identificar causa raíz; restaurar integración Git->Vercel o documentar workaround; logs de Vercel revisados.
  - Criterios: si el webhook Git falla, activar fallback con webhook GitHub -> `api/github-deploy-hook` (Vercel API) usando `VERCEL_TOKEN` y `GITHUB_WEBHOOK_SECRET`.
- US-2026-02-03-030 — Como mantenedor, quiero evitar deploys duplicados cuando están activos Git integration y el webhook.
  - Criterios: el webhook solo dispara si `ENABLE_GITHUB_DEPLOY_HOOK=true`; AGENTS documenta el ajuste para evitar dobles despliegues.

## Docs/Proceso
- US-2026-01-23-001 — Como mantenedor, quiero ampliar la guía de contribución y el README con el flujo de historias/estado, verificación de deploy en Vercel y contexto de Neon, para asegurar consistencia del proyecto.
  - Criterios: AGENTS.md actualizado; README.md actualizado; `USER_STORIES.md` y `STATUS.md` creados.
- US-2026-01-23-004 — Como mantenedor, quiero que AGENTS.md exija revisar siempre los logs de Vercel para evitar deploys fallidos sin seguimiento.
  - Criterios: instrucción explícita en AGENTS.md.
- US-2026-01-25-019 — Como mantenedor, quiero estandarizar AGENTS.md con la intención del proyecto y mapa de componentes frontend para facilitar el onboarding del equipo.
  - Criterios: AGENTS.md incluye intención del producto, arquitectura frontend, mapa de páginas/componentes, flujos de datos y estilos/tokens base.
- US-2026-02-02-020 — Como analista, quiero consolidar la documentación de la API de Brandwatch Consumer Insights en `CONSUMER_API.md` para tener una referencia única y completa.
  - Criterios: documento único con endpoints, parámetros, filtros, restricciones y tutoriales principales en español.
- US-2026-02-03-022 — Como mantenedor, quiero habilitar `collab` y suprimir el warning de features inestables en la config de Codex para mantener el entorno limpio.
  - Criterios: `collab = true` en `/Users/agutie04/.codex/config.toml`; `suppress_unstable_features_warning = true` configurado.
- US-2026-02-03-029 — Como mantenedor, quiero documentar en `AGENTS.md` el diagnóstico y checklist de auto-deploy en Vercel para evitar loops futuros.
  - Criterios: sección con pasos de verificación (build logs, Git link, webhook, SSO, alias de producción).
- US-2026-02-03-031 — Como mantenedor, quiero que `CONSUMER_API.md` esté versionado y disponible en git.
  - Criterios: archivo trackeado y en el repo principal.
