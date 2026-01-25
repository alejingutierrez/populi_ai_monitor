# Alerts — Esquema Visual (baja fidelidad)

## Layout general (desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header global (search + filtros + CTA IA)                                     │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar       │ 1) Alerts Pulse (KPIs + estado operativo)                     │
│ navegación    ├──────────────────────────────────────────────────────────────┤
│               │ 2) Alerts Stream (2/3)      │ 3) Alert Intel (1/3)            │
│               │ - lista priorizada          │ - detalle seleccionado          │
│               │ - quick actions             │ - posts evidencia + señales     │
│               │ - etiquetas por severidad   │ - mix sentimiento + geo         │
│               ├─────────────────────────────┴────────────────────────────────┤
│               │ 4) Alert Timeline & Rules (full width)                       │
│               │ - activaciones por día       - salud de reglas               │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

## Layout mobile (stack)
```
Header
Alerts Pulse
Alerts Stream
Alert Intel
Alert Timeline & Rules
```

## Componentes y contenido
1) Alerts Pulse (arriba)
- KPIs (4): Alertas abiertas, Críticas, En investigación, SLA promedio.
- Micro-estado: “Riesgo estable” / “Aumento de alertas” según delta vs ventana previa.
- Resumen de ventana activa (24h/72h/7d) + última detección.

2) Alerts Stream (columna principal)
- Tarjetas por alerta: severidad, tipo, scope (cluster/subcluster/micro/ciudad/plataforma).
- Métricas rápidas: delta de volumen, negatividad, reach, tiempo activo.
- Quick actions: Acknowledge, Snooze, Escalar, Resolver.
- CTA contextual: “Abrir en Feed / Geo / Network”.

3) Alert Intel (columna lateral)
- Resumen IA (1-3 bullets).
- Señales: riesgo reputacional, viralidad, polarización.
- Mix sentimiento + top temas/clusters.
- Posts evidencia (top 5) con score e impacto.
- Mini mapa si el scope es territorial.

4) Alert Timeline & Rules (ancho completo)
- Timeline de alertas por día (barras con severidad).
- Lista de reglas: estado (on/off), umbral, ventana, tasa de activación.
- Indicadores de salud: falsos positivos, sensibilidad ajustada.

## Interacciones clave
- Selección de alerta aplica filtros globales (Header) y actualiza panel Intel.
- Acciones rápidas registran eventos en `alert_actions`.
- “Pedir insight” abre modal con contexto precargado (scope + ventana).
- Clic en “Abrir en Feed/Geo/Network” navega y aplica filtros.
- Toggle de severidad/estado en stream para aislar alertas críticas.

## Estados y densidad visual
- Sin alertas: panel “Sin alertas críticas” + tips de ajuste de filtros.
- Alta densidad: agrupar por tipo y mostrar badge “agrupado”.
- Alertas repetidas: mostrar conteo y última detección.

## Datos principales (Neon / mock)
- Base actual: `posts`, `platforms`, `topics`, `clusters`, `subclusters`, `microclusters`, `locations`.
- Acciones existentes: `post_actions` (para log de acciones).
- Insights: `insight_requests`, `insight_snapshots` (para resúmenes IA y métricas).
- Propuesto: `alert_rules`, `alerts`, `alert_events`, `alert_posts`, `alert_actions`.
