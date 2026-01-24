# Geo Tagging — Esquema Visual (baja fidelidad)

## Layout general (desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header global (search + filtros + CTA IA)                                    │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar       │ 1) Geo Pulse (cards KPI territoriales)                       │
│ navegación    ├──────────────────────────────────────────────────────────────┤
│               │ 2) Geo Map Canvas (2/3)    │ 3) Territory Intel (1/3)        │
│               │ - heatmap / clusters       │ - hotspots y alertas            │
│               │ - toggles de capas         │ - mix de sentimiento            │
│               │ - leyenda + escala         │ - top temas por zona            │
│               ├────────────────────────────┴──────────────────────────── ────┤
│               │ 4) Geo Drilldown (full width)                                │
│               │ - tabla de municipios                                        │
│               │ - tendencia 7d por zona                                      │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

## Layout mobile (stack)

```
Header
Geo Pulse
Geo Map Canvas
Territory Intel
Geo Drilldown
```

## Componentes y contenido

1. Geo Pulse (arriba)

- KPI cards (4): Municipios activos, Menciones geolocalizadas, Reach territorial, Riesgo geo.
- Micro‑estado: “Cobertura estable” o “Alza territorial” según delta vs ventana previa.

2. Geo Map Canvas (principal)

- Mapa base + heatmap/cluster/puntos por sentimiento.
- Toggles: Heatmap / Clusters / Sentimiento.
- Leyenda: intensidad + distribución sentimiento.
- Tooltip/insight al hover/click de punto o cluster.

3. Territory Intel (columna lateral)

- Hotspots: top municipios con % del volumen y delta.
- Alertas territoriales: “negatividad alta”, “crecimiento acelerado”, “pico de riesgo”.
- Mix de sentimiento por zona (top 3 zonas).
- Top temas por zona (3 temas dominantes).

4. Geo Drilldown (full width)

- Tabla de municipios con: volumen, sentimiento neto, reach, delta 7d.
- Selector de “zona foco”: al seleccionar, se centra el mapa y se filtra panel lateral.
- Mini‑sparkline por municipio (opcional).

## Interacciones clave

- Toggle de capas cambia estilo del mapa sin perder selección.
- Click en cluster hace zoom + abre panel de insights.
- Selección de municipio aplica filtro global (Header) y actualiza paneles.
- Hover muestra tooltip enriquecido con tendencia diaria y top temas.

## Datos principales (Neon / mock)

- `posts` (timestamp, sentiment, reach, engagement).
- `locations` (city, lat, lng) + `posts.location`.
- `topics`, `clusters`, `subclusters` para etiquetas locales.
- `insight_snapshots` (futuro) para KPIs territoriales precalculados.
