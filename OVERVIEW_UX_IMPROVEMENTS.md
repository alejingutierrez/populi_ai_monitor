# Overview UX Improvements (US-2026-02-09-040)

Objetivo: convertir `Overview` en un **workspace de análisis** (no una grilla plana de cards), manteniendo los componentes existentes pero agregando **jerarquía, contexto, vínculos entre módulos** y **management del layout**.

## Diagnóstico (por qué hoy se siente "plano")
- Los módulos están “uno al lado del otro”, pero no hay un **flujo analítico** claro (scan → detectar cambios → localizar → explicar → evidenciar).
- Hay **poca conexión** entre visualizaciones: mapa, clusters, timeline y feed no se “hablan”.
- Falta **contexto confiable** sobre la ventana temporal y comparativos (qué rango exacto, vs. qué).
- No existe **management del workspace**: foco por módulo, colapsar, reordenar, guardar vistas.
- Los headers de algunos módulos en Overview heredan labels de otras páginas, lo que aumenta la fricción mental.

## 20 mejoras propuestas (sin borrar componentes)

1. **[P0] Barra de contexto (Scope Bar)**: mostrar rango activo (fechas exactas), timezone, `n` posts filtrados, filtros activos como chips y “limpiar” por chip.
2. **[P0] Unificar headers en Overview**: cuando `MapView`/`TopicPanel` se usen en Overview, rotular como “Mapa”/“Clusters” en vez de “Geo Tagging”/“Network Connections”.
3. **[P0] Ventana temporal única y consistente**: derivar `analysisWindow` y `prevWindow` desde `Filters` (timeframe o dateFrom/dateTo) y usarlo en SummaryGrid deltas + TimelineChart + ConversationTrends.
4. **[P0] Jerarquía visual del layout**: introducir un “panel primario” (Map o Feed) con más área, y secundarios; reduce sensación de collage.
5. **[P0] Controles del mapa en Overview**: habilitar una versión ligera de `showControls` (capas + leyenda) sin saturar el canvas.
6. **[P1] Clic para filtrar desde el mapa**: seleccionar un municipio aplica `search` o un chip “Ciudad: X”; el resto de módulos se sincroniza.
7. **[P1] Clic para filtrar desde el treemap**: single-click selecciona cluster/subcluster (sin drill), doble clic mantiene el drilldown actual; CTA “Aplicar a filtros”.
8. **[P1] Selección de rango desde TimelineChart**: brush/drag para setear `dateFrom/dateTo`; clic en un día para saltar el feed a ese corte.
9. **[P1] Cross-highlighting**: hover/selección de ciudad o cluster resalta elementos relacionados en los otros módulos (reduce el cambio de contexto).
10. **[P1] “Drivers” de cambio**: debajo de SummaryGrid, explicar *por qué* subió/bajó un KPI (top 3 topics/cities/platforms que más contribuyen).
11. **[P1] Controles analíticos del feed**: ordenar por recencia/alcance/engagement/IA-score; toggles rápidos (solo críticos, solo al alza, etc.).
12. **[P1] Workflow del feed (review/pin/hide)**: estados por usuario (local) con contadores “pendientes vs revisados”; atajos de teclado.
13. **[P1] Watchlist**: poder “pinear” clusters/cities/topics/authors y verlos como chips (con jump/apply).
14. **[P1] ConversationTrends por dimensión**: alternar breakdown (Topics/Clusters/Cities/Platforms) + vista “fastest growing” vs “top volume”.
15. **[P1] Señales de cobertura/calidad**: % posts con geo, concentración por plataforma, n bajo para el rango (warning de muestra pequeña).
16. **[P2] Presets de análisis**: botones “Analyst / Ops / Geo / Comms” que ajustan layout + defaults (métrica timeline, capa mapa).
17. **[P2] Management del layout**: colapsar/expandir módulos, reordenar (drag), hide/show, con persistencia (localStorage).
18. **[P2] Focus mode por módulo**: expandir Timeline/Mapa/Clusters/Feed a vista amplia con retorno (sin perder contexto/filtros).
19. **[P2] Reporte rápido**: “Copiar resumen” genera texto con KPIs+deltas+driver principal y link a vista guardada.
20. **[P2] Export/Share**: export CSV/JSON de `filteredPosts`, snapshot de visuales (PNG) y URL con query params (filtros + layout).

## Roadmap sugerido
- **Fase 1 (P0, 0.5–1 día):** 1–5 (contexto, headers, ventana temporal consistente, jerarquía, controles de mapa).
- **Fase 2 (P1, 1–2 días):** 6–15 (cross-filter, brush, drivers, controles del feed, breakdowns, señales de calidad).
- **Fase 3 (P2, 2–4 días):** 16–20 (presets, management del layout, focus mode, reporte y export/share).

## Archivos donde caería el trabajo (cuando se implemente)
- `src/App.tsx`: ventana temporal consistente, estado de selección (ciudad/cluster/rango), persistencia de vistas/layout.
- `src/pages/OverviewPage.tsx`: jerarquía del layout, wrapper de módulos, modo foco.
- `src/components/Header.tsx`, `src/components/FilterBar.tsx`: Scope Bar, chips, presets.
- `src/components/TimelineChart.tsx`: brush + eventos para setear rango.
- `src/components/MapView.tsx`: controles livianos + selección de ciudad.
- `src/components/TopicPanel.tsx`: selección (single click) + CTA aplicar.
- `src/components/PostFeed.tsx`: sort, workflow states (review/pin/hide), atajos.
- `src/components/ConversationTrends.tsx`: breakdown por dimensión + “fastest growing”.
