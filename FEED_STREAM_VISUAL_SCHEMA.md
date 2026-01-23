# Feed Stream — Esquema Visual (baja fidelidad)

## Layout general (desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header global (search + filtros + CTA IA)                                     │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar       │ 1) Stream Pulse (cards métricas + estado IA + alertas)        │
│ navegación    ├──────────────────────────────────────────────────────────────┤
│               │ 2) Full Feed Stream (2/3)   │ 3) Trend Radar (1/3)            │
│               │ - lista completa            │ - series tiempo                │
│               │ - acciones por post         │ - top temas/clusters           │
│               │ - highlights IA             │ - picos recientes              │
│               ├─────────────────────────────┴────────────────────────────────┤
│               │ 4) Sub‑conversation Explorer (full width)                    │
│               │ - árbol/treemap clusters→sub→micro                           │
│               │ - ejemplos + resumen IA                                       │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

## Layout mobile (stack)
```
Header
Stream Pulse
Trend Radar
Full Feed Stream
Sub‑conversation Explorer
```

## Componentes y contenido
1) Stream Pulse (arriba)
- Cards: Total posts, Alcance, Engagement, Sentimiento, Riesgo, Última actividad.
- Micro‑estado: “IA en vivo” + alerta si spike > umbral.

2) Full Feed Stream (columna principal)
- Tarjetas con contenido completo, score IA, etiquetas, cluster/subcluster.
- Barra secundaria: orden (recencia/impacto), filtro rápido por sentimiento.

3) Trend Radar (columna lateral)
- Gráfico de línea/área: volumen + sentimiento por día.
- Lista de “tendencias activas” (delta % + tópico/cluster).

4) Sub‑conversation Explorer (ancho completo)
- Treemap/árbol con tamaño=volumen y color=sentimiento.
- Panel lateral con resumen IA y “posts ejemplo” al seleccionar nodo.

## Interacciones clave
- Clic en tendencia, cluster o etiqueta aplica filtro global al feed.
- Selección en treemap abre detalle con sub‑conversaciones y resumen IA.
- Acciones por post registran en `post_actions`.

## Datos principales (Neon)
- `posts`, `platforms`, `topics`, `clusters`, `subclusters`, `microclusters`, `locations`.
- `classification_labels`, `post_classifications`, `post_actions`.
- `insight_snapshots`, `insight_requests` para métricas y resúmenes.
