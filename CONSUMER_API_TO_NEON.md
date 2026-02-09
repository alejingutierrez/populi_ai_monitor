# Brandwatch Consumer API -> Neon (Populi AI Monitor) Mapping

Este documento complementa `CONSUMER_API.md` con decisiones de modelado para que la ingesta/backfill desde Brandwatch (Consumer Insights) alimente Neon sin romper el frontend.

## Decisiones Clave

- **Unidad de datos:** Brandwatch llama a cada ítem una *Mention*. En este repo la representamos como un registro en `posts`.
- **ID estable:** cuando la fuente sea Brandwatch, usamos `posts.id = mention.resourceId`. Para datos locales/mock, se mantienen ids tipo `pr-123`.
- **Una mention puede pertenecer a múltiples queries:** la relación se guarda en `post_query_matches` (`post_id`, `query_id`).
- **Compatibilidad UI:** el frontend consume `SocialPost`. Para permitir la migración, `platform`/`topic` son strings dinámicos y `location.lat/lng` pueden ser `null`. Los módulos geo ignoran posts sin coordenadas.
- **Sentiment:** Brandwatch usa `positive|neutral|negative`. El UI actual usa `positivo|neutral|negativo`. La API interna (`api/` + `mock-api/`) normaliza ambos formatos a los valores del UI.

## Esquema Neon (tablas nuevas)

- `consumer_projects`: catálogo de proyectos de Brandwatch (`/projects`).
- `consumer_queries`: catálogo de queries por proyecto (`/projects/{projectId}/queries`).
- `consumer_query_groups` y `consumer_query_group_queries`: query groups.
- `consumer_ruletags`: tags (`/projects/{projectId}/ruletags`).
- `consumer_rulecategories`: categorías jerárquicas (`/projects/{projectId}/rulecategories`).
- `post_query_matches`: join table para `posts` x `consumer_queries`.

## Mapping de Mention -> `posts`

Campos principales:

- `resourceId` -> `posts.id`
- `date` -> `posts.timestamp`
- `author` -> `posts.author`
- `sentiment` -> `posts.sentiment` (normalizado a `positivo|neutral|negativo`)
- `snippet` (o fulltext si aplica) -> `posts.content`
- `contentSourceName` (o `contentSource`) -> `posts.platform_id` (o dejar `null` y usar `content_source_name`)
- `reachEstimate`/`impressions`/`impact` -> `posts.reach` (normalizado)
- Interacciones de plataforma (likes/comments/shares/etc.) -> `posts.engagement` (normalizado)

Campos opcionales ya listos en `posts` (según sección “Campos de Mention” en `CONSUMER_API.md`):

- `guid` -> `posts.consumer_guid`
- `added` -> `posts.consumer_added_at`
- `updated` -> `posts.consumer_updated_at`
- `url` -> `posts.url`
- `originalUrl` -> `posts.original_url`
- `threadURL` -> `posts.thread_url`
- `title` -> `posts.title`
- `domain` -> `posts.domain`
- `language` -> `posts.language`
- `contentSource` -> `posts.content_source`
- `contentSourceName` -> `posts.content_source_name`
- `pageType` -> `posts.page_type`
- `pubType` -> `posts.pub_type`
- `subtype` -> `posts.subtype`
- `resourceType` -> `posts.resource_type`
- `publisherSubType` -> `posts.publisher_sub_type`
- `country`/`region`/`city` -> `posts.country`/`posts.region`/`posts.city`
- `latitude`/`longitude` -> `posts.latitude`/`posts.longitude`
- `locationName` -> `posts.location_name`
- workflow (`assignment`, `priority`, `status`, `checked`, `starred`) -> `posts.workflow_*`
- `tags`/`categories`/`classifications` -> `posts.tags`/`posts.categories`/`posts.classifications`
- `rawMetadata`/`custom` -> `posts.raw_metadata`/`posts.custom`

## Campos UI/IA (no vienen de Brandwatch)

Estos campos existen para señales internas/derivadas y pueden quedar `null` hasta que se implemente clasificación:

- `topic_id` (temas del producto)
- `cluster_id`, `subcluster_id`, `microcluster_id` (taxonomía / clustering)
- `media_type` (heurística local; Brandwatch no entrega un enum equivalente 1:1)

## Nota de compatibilidad (geo)

Brandwatch no garantiza geolocalización por mention. Por eso:

- `location_id` es opcional.
- si no hay coords (`latitude/longitude` o join a `locations`), el frontend mantiene `location.city` pero deja `lat/lng = null` y el mapa no usa esa mention.

