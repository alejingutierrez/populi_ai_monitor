# Network Connections — Esquema Visual (baja fidelidad)

## Layout general (desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header global (search + filtros + CTA IA)                                     │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar       │ 1) Network Pulse (KPI de conectividad)                        │
│ navegación    ├──────────────────────────────────────────────────────────────┤
│               │ 2) Network Graph (2/3)    │ 3) Insight Rail (1/3)             │
│               │ - grafo por nivel         │ - insights IA / alertas          │
│               │ - clusters/sub/micro      │ - ranking de nodos               │
│               │ - controles de layout     │ - métricas de enlace             │
│               ├────────────────────────────┴────────────────────────────────┤
│               │ 4) Connection Matrix (full width)                             │
│               │ - tabla de co-ocurrencia                                       │
│               │ - top enlaces / comunidades                                   │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

## Layout mobile (stack)
```
Header
Network Pulse
Network Graph
Insight Rail
Connection Matrix
```

## Componentes y contenido
1) Network Pulse (arriba)
- KPIs (4): Nodos activos, Enlaces, Densidad, Polarización de temas.
- Micro‑estado: “Red estable” / “Convergencia alta” según delta vs ventana previa.

2) Network Graph (principal)
- Grafo interactivo por nivel: Clusters / Subclusters / Microclusters.
- Layouts: Force, Circular, Community (toggle).
- Controles: peso por volumen/reach, filtro por sentimiento dominante.
- Leyenda: tamaño = volumen, color = sentimiento, grosor enlace = co‑ocurrencia.
- Slider de umbral: reduce enlaces con peso bajo para evitar saturación.

3) Insight Rail (columna lateral)
- Top nodos por centralidad (grado y grado ponderado).
- Enlaces críticos (crecimiento acelerado o negatividad alta).
- Comunidades detectadas (2‑3 grupos conectados con etiquetas).
- Resumen IA de narrativas dominantes.

4) Connection Matrix (full width)
- Tabla de pares con: nodo A / nodo B / co‑ocurrencia / delta / sentimiento neto.
- Orden por: volumen, variación, riesgo.
- Clic en fila resalta el enlace en el grafo.

## Modelo de grafo (nodos y enlaces)
Nodos (por nivel):
- Cluster: `post.cluster`
- Subcluster: `post.subcluster`
- Microcluster: `post.microcluster`

Atributos de nodo:
- `volume`: # de posts en ventana
- `reach`: suma de `post.reach`
- `sentimentIndex`: ponderado por reach
- `riskScore`: heurística (negativo/neutral/positivo ponderado)
- `topTopics`: top 3 temas dominantes

Enlaces (co‑ocurrencia):
- `weight`: cuántas veces 2 nodos co‑ocurren en una misma “unidad”
- `delta`: cambio vs ventana previa
- `edgeSentiment`: promedio ponderado de sentimiento

## Lógica de co‑ocurrencia (propuesta)
Se define una unidad de co‑ocurrencia para construir enlaces:
- **Unidad primaria (recomendada):** `author + día`
  - Si un autor publica sobre varios nodos en el mismo día, se crea enlace entre esos nodos.
- **Unidad secundaria (fallback):** `city + día`
  - Si en un municipio aparecen varios nodos en el mismo día, se crea enlace.

Peso del enlace:
- Por cada unidad, formar el set único de nodos y sumar 1 por par.
- Alternativa ponderada: sumar `min(volumeA, volumeB)` dentro de la unidad.

Delta vs ventana previa:
- comparar `weight_current` vs `weight_prev` con porcentaje (mismo método que Feed Stream).

## Métricas de centralidad (MVP)
- `degree`: cantidad de conexiones por nodo.
- `weightedDegree`: suma de pesos de enlaces.
- `centralityScore`: normalizar `weightedDegree` en escala 0-100.

## Interacciones clave
- Toggle de nivel (cluster/sub/micro) re‑construye grafo.
- Hover resalta vecinos; click fija selección y actualiza panel lateral.
- Filtros globales (Header) afectan nodos y enlaces.
- Selección en tabla centra el grafo y marca enlace.
- Click en nodo puede filtrar Feed Stream (opcional en fase 2).

## Estados y densidad visual
- Sin datos: panel “Sin conexiones” con tips de filtros.
- Alta densidad: aplicar umbral automático (p25 o p50) y mostrar badge “umbral aplicado”.
- Lista de top enlaces limitada a 10 para evitar saturación.

## Datos principales (Neon / mock)
- `posts` con `cluster`, `subcluster`, `microcluster`, `sentiment`, `author`, `location.city`, `timestamp`.
- `clusters`, `subclusters`, `microclusters` para etiquetas.
- `post_classifications` para co‑ocurrencias si existe.
- `insight_snapshots` para métricas de centralidad (futuro).
