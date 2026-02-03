# Brandwatch Consumer Research API (Consumer Insights) — Documentación consolidada

Fecha de consolidación: 2026-02-02

Esta guía unifica la documentación pública de la API de Brandwatch Consumer Research (a.k.a. Consumer Insights) en un solo archivo. Está escrita en español y resume/estructura la información técnica sin copiar textos completos del sitio original.

---

## 1) Base URL y formato

- Base URL: `https://api.brandwatch.com`
- Todas las peticiones deben ir por HTTPS y con TLS 1.2+.
- Formato de intercambio: JSON.
- Solo se garantiza soporte para endpoints publicados en la documentación oficial.

## 2) Autenticación

### Obtener token

- Endpoint: `POST /oauth/token`
- Parámetros (URL encoded):
  - `username`: correo del usuario API
  - `password`: contraseña del usuario API
  - `grant_type`: `api-password`
  - `client_id`: `brandwatch-api-client`

Ejemplo (cURL):

```bash
curl -X POST --data-urlencode 'password=TU_PASSWORD' \
  'https://api.brandwatch.com/oauth/token?username=TU_USUARIO&grant_type=api-password&client_id=brandwatch-api-client'
```

Respuesta (campos principales):
- `access_token`
- `token_type` (normalmente `bearer`)
- `expires_in` (segundos; para usuarios API suele ser ~1 año)
- `scope`

### Usar token

- Header recomendado: `Authorization: Bearer <TOKEN>`
- Alternativa (menos segura): parámetro `access_token` en la URL

> Requisito de permisos: solo usuarios “Regular” o “Admin” tienen acceso a la API.

## 3) Rate limiting

- Límite por cliente: 30 requests cada 10 minutos (ventana móvil).
- Exceder el límite devuelve `HTTP 429`.
- Headers informativos:
  - `x-rate-limit`: formato `<limite>/<periodo>m` (ej. `30/10m`)
  - `x-rate-limit-used`: cantidad de llamadas en la ventana

## 4) Conceptos clave

- **Project**: contenedor lógico para queries, reglas, tags, categorías y dashboards; permite compartir con usuarios.
- **Query**: búsqueda booleana de menciones en fuentes sociales y web abiertas.
- **Channel**: consulta ligada a una cuenta/canal (X, Facebook, Instagram) con tipo específico.
- **Group (Query Group)**: agrupación de queries/channels para análisis conjunto.
- **Mention**: pieza individual de contenido (post, tweet, noticia, etc.) con metadatos.
- **Tag**: etiqueta simple aplicada a menciones.
- **Category**: etiqueta jerárquica (categoría + subcategorías) aplicada a menciones.
- **Rule**: automatiza acciones (tag, categoría, workflow) según filtros y búsquedas.

## 5) Convenciones generales

### Fechas y zonas horarias

- Formato: `YYYY-MM-DD'T'HH:mm:ss.SSS+ZZZZ`
- El `+` en la zona horaria debe ir URL-encoded como `%2B`.

### Paginación

- `pageSize`: 1–5000
- `page`: índice base 0
- Para menciones hay un límite de 10,000 registros con `page/pageSize`. Para más datos usa `cursor`.

### Ordenamiento

- `orderBy`: campo
- `orderDirection`: `asc` o `desc`

### Filtros

- Se pasan como query params.
- Muchos filtros aceptan múltiples valores repitiendo el parámetro.
- Prefijo `x` excluye (ej. `author` incluye; `xauthor` excluye).

### Buenas prácticas

- Usa únicamente endpoints documentados.
- Ajusta la frecuencia de polling al tipo de vista (streams más frecuentes, dashboards menos).
- Si tu caso de uso supera los límites, coordina con tu CSM/Account Manager.

---

## 6) Usuarios y clientes

### GET `/user`
Devuelve el usuario actual con metadatos (id, username, clientId, nombres, roles UI/API, flags de seguridad, productos, tags, etc.).

### GET `/client`
Devuelve el cliente actual (entidad de facturación). Incluye datos de contrato, límites y tags internos.

### GET `/me`
Respuesta combinada de usuario + cliente, más enlaces útiles.

---

## 7) Proyectos

### GET `/projects/summary`
Lista resumida de proyectos accesibles.

### GET `/projects`
Lista detallada de proyectos.

### GET `/projects/{projectId}`
Detalle de un proyecto específico.

Campos comunes en proyectos: `id`, `name`, `description`, `timezone`, `billableClientId`, `billableClientName`, `billableClientIsPitch`.

---

## 8) Queries (consultas)

### Tipos de Query
- `monitor`: consulta booleana estándar
- `twitter`: canal X (Twitter)
- `publicfacebook`: canal Facebook
- `instagram`: canal Instagram

### GET `/projects/{projectId}/queries/summary`
Lista resumida (ids, nombres, tipo, fechas, contentSources, etc.).

### GET `/projects/{projectId}/queries`
Lista detallada (incluye `booleanQuery`, `highlightTerms`, `startDate`, etc.).

### GET `/projects/{projectId}/queries?type=...`
Filtra por tipo de query.

### POST `/query-validation`
Valida una query y sus filtros antes de crearla. Responde con `errors` y `issues` si hay problemas (posiciones en el boolean).

### POST `/projects/{projectId}/queries/`
Crea una query nueva.

**Campos obligatorios**
- `name` (único en el proyecto)
- `booleanQuery`

**Campos opcionales (principales)**
- `contentSources`: lista de fuentes (si se envía vacía, se seleccionan todas)
- `description`
- `exclusionSnippets`: ids desde `/exclusionsnippets`
- `imageFilter`:
  - `imageAnalysisType`: `images-or-keywords` o `images-and-keywords`
  - `logoIds`: ids de logos
  - `objectIds`: ids de objetos/acciones
- `languages`: lista de códigos (vacía = language agnostic)
- `locationFilter`: `includedLocations` / `excludedLocations`
- `lockedQuery`: boolean
- `startDate`: fecha inicial

### PATCH/PUT `/projects/{projectId}/queries/{queryId}`
Edita una query existente.

- **PATCH**: actualiza campos específicos. Requiere al menos un campo opcional.
  - `name`, `displayName`, `removeDisplayName`, `state`
  - `state`: solo permite transición de `draft` → `active`
  - no mezclar `displayName` y `removeDisplayName` en la misma request

- **PUT**: reemplazo completo.
  - Requiere `id`, `name`, `booleanQuery`
  - Opcionales: `displayName`, `description`, `languages`, `state`

### DELETE `/projects/{projectId}/queries/{queryId}`
Elimina una query.

---

## 9) Query Groups

### GET `/projects/{projectId}/querygroups`
Lista grupos con sus queries y usuarios. Campos típicos: `id`, `name`, `shared`, `sharedProjectIds`, `queries`, `users`.

### DELETE `/projects/{projectId}/querygroups/{groupId}`
Elimina un grupo.

---

## 10) Tags

### GET `/projects/{projectId}/ruletags`
Lista tags del proyecto.

### POST `/projects/{projectId}/ruletags`
Crea un tag.

- Manual: `{ "name": "Mi Tag" }`
- Automático: incluye `rules` con `filter` (misma estructura de filtros de menciones).

### POST `/projects/{projectId}/bulkactions/ruletags/{tagId}?earliest=YYYY-MM-DD`
Aplica el tag de forma histórica a menciones existentes (backfill desde `earliest`).

### DELETE `/projects/{projectId}/ruletags/{tagId}`
Elimina un tag.

Campos comunes de Tag: `id`, `name`, `displayName`, `queryIds`, `queries`, `rules`, `matchingType`.

---

## 11) Categorías

### GET `/projects/{projectId}/rulecategories`
Lista categorías y subcategorías.

### POST `/projects/{projectId}/rulecategories`
Crea categoría con `children` (subcategorías). Puede incluir `rules` para categorización automática.

### POST `/projects/{projectId}/bulkactions/rulecategories/{categoryId}?earliest=YYYY-MM-DD`
Aplica categorización histórica (backfill) desde `earliest`.

### DELETE `/projects/{projectId}/rulecategories/{categoryId}`
Elimina una categoría.

Campos comunes de Categoría: `id`, `name`, `displayName`, `multiple`, `children` (subcategorías), `matchingType`.

---

## 12) Rules

### GET `/projects/{projectId}/rules`
Lista reglas con `filter`, `scope`, `enabled`, `ruleAction`, etc.

### GET `/projects/{projectId}/rules/{ruleId}`
Detalle de una regla específica.

### DELETE `/projects/{projectId}/rules/{ruleId}`
Elimina una regla.

---

## 13) Lists (Author / Location / Site)

### Author Lists
- **POST** `/projects/{projectId}/group/author/`
  - Body: `name`, `authors`, `shared`, `sharedProjectIds`
- **GET** `/projects/{projectId}/group/author/summary`
- **DELETE** `/projects/{projectId}/group/author/{listId}`

### Location Lists
- **POST** `/projects/{projectId}/group/location/`
  - Body: `name`, `locations` (ids), `shared`, `sharedProjectIds`
- **GET** `/projects/{projectId}/group/location/summary`
- **DELETE** `/projects/{projectId}/group/location/{listId}`

### Site Lists
- **POST** `/projects/{projectId}/group/site/`
  - Body: `name`, `domains`, `shared`, `sharedProjectIds`
- **GET** `/projects/{projectId}/group/site/summary`
- **DELETE** `/projects/{projectId}/group/site/{listId}`

---

## 14) Workflow

### GET `/projects/{projectId}/workflow`
Devuelve la configuración de workflow (Assignment, Priority, Checked, Status) y sus valores. Los nombres se usan como filtros o dimensiones en análisis.

---

## 15) Custom Alerts

> `queryId` y `queryName` están deprecados. La documentación indica que se retiraron **a partir del 12 de enero de 2026**. A partir de esa fecha usa `queryIds`.

### GET `/projects/{projectId}/alerts`
Lista alerts con filtros opcionales `search`, `enabled`, `owned` (siempre junto con paginación).

### GET `/projects/{projectId}/alerts/{alertId}`
Detalle de un alert.

### POST `/projects/{projectId}/alerts`
Crea un alert. Campos requeridos:
- `name`
- `queryIds` (array)
- `frequency` (minutos: 5, 15, 30, 60, 720, 1440, 10080)
- `alertTypes` (`threshold`, `scheduled` o ambos)
- `repeatOnHourOfDay` (0–23; requerido para `thresholdVolume`)
- `thresholdVolume` **o** `thresholdPercentage` (obligatorio si `threshold`)
- `additionalRecipients` (array; puede estar vacío)
- `filter` (objeto de filtros; puede estar vacío)

Campos opcionales:
- `mentionsPerAlert` (0–50; default 5)
- `repeatOnDayOfWeek` (1–7; 1=Lunes)

### PUT `/projects/{projectId}/alerts/{alertId}`
Actualiza alert. Requiere `id` y los mismos campos base que creación. Permite modificar `enabled`, `mentionsPerAlert`, `repeatOnDayOfWeek`, `repeatOnHourOfDay`, `thresholdVolume`, `thresholdPercentage`.

### DELETE `/projects/{projectId}/alerts/{alertId}`
Elimina alert.

---

## 16) Mentions

### GET `/projects/{projectId}/data/mentions`
Parámetros obligatorios:
- `queryId` o `queryGroupId` (puede repetirse)
- `startDate`
- `endDate`

Paginación:
- `pageSize` (1–5000)
- `page` (0+)

Ordenamiento:
- `orderBy`
- `orderDirection`

### GET `/projects/{projectId}/data/mentions/fulltext`
Devuelve texto completo cuando la fuente lo permite. Ver restricciones más abajo.

### Filtros
Todos los filtros documentados aplican a menciones (ver sección de filtros).

### Edición de menciones
- **POST** `/projects/{projectId}/data/mentions`
- Permite actualizar metadatos en lote. Se envía un array de objetos con `resourceId`, `queryId` y opcionalmente `date` (recomendado para performance).
- Campos editables principales (valores entre paréntesis):
  - `sentiment` (`positive`, `neutral`, `negative`)
  - `addTag` / `removeTag` (lista de nombres de tags)
  - `addCategories` / `removeCategories` (ids de categoría)
  - `priority` / `removePriority` (`high`, `medium`, `low`)
  - `status` / `removeStatus` (`open`, `pending`, `closed`)
  - `assignment` / `removeAssignment` (email de usuario)
  - `checked` (boolean)
  - `starred` (boolean)
  - `location` (formato `Country.Region.City`)
  - `publicationName` (solo blogs/broadcasts/forums/news/reviews)
  - `author` (solo blogs/broadcasts/forums/news/reviews)
  - `addClassifications` / `removeClassifications` (ej. `emotions:Anger`)
  - `addCategoryMetrics` / `updateCategoryMetrics` / `removeCategoryMetrics`

Nota: en el futuro, `date` podría ser obligatorio.

---

## 17) Restricciones de datos

Algunas fuentes tienen restricciones de cumplimiento/licenciamiento:

- **X (Twitter)**: metadatos completos no disponibles. Se conserva un subconjunto (ids, fechas, ubicación general, sentimiento, tags/categorías, etc.). Para texto completo, usar el id `guid` y consultar la API de X.
- **Online News**: solo se entrega snippet de ~256 caracteres.
- **LinkedIn**: sin snippet ni full text.
- **Reddit**: solo URL.

---

## 18) Data Retrieval (agregaciones y analítica)

### Total Mentions
- **GET** `/projects/{projectId}/data/mentions/count`
- Requiere `queryId`/`queryGroupId`, `startDate`, `endDate`.
- Respuesta: `mentionsCount`.

### Topics (clásico)
- **GET** `/projects/{projectId}/data/volume/topics/queries`
- Requiere `queryId`/`queryGroupId`, `startDate`, `endDate`.
- Opcionales: `orderBy` (`volume` / `burst`), `limit`, `excludeCategories`, `excludeTags`.

### Topics (nuevo Word Cloud)
- **GET** `/projects/{projectId}/data/topics`
- Requiere `extract` (`emojis`, `entities`, `words`, `phrases`, `hashtags`, `people`, `places`, `organisations`) + fechas + query.
- Opcionales: `metrics` (`volume`, `percentageVolume`, `sentiment`, `gender`, `trending`, `timeSeries`), `orderBy`, `limit`.
- Soporta filtros adicionales (ej. `sentiment=positive`).

### Charts (básico)
- **GET** `/projects/{projectId}/data/{aggregate}/{dimension1}/{dimension2}`
- Requiere `queryId`/`queryGroupId`, `startDate`, `endDate`.
- Dimensiones admiten `dim1Args`, `dim2Args` y `dimXLimit` según el tipo.

### Charts (multi-aggregate)
- **GET** `/projects/{projectId}/data/multiAggregate/{dimension1}/{dimension2}?aggregate=a,b,c`
- Máximo 10 aggregates por llamada.

### X Insights (Twitter)
Todos los endpoints aceptan los mismos filtros de menciones.
- **GET** `/projects/{projectId}/data/hashtags`
- **GET** `/projects/{projectId}/data/emoticons`
- **GET** `/projects/{projectId}/data/urls`
- **GET** `/projects/{projectId}/data/mentionedauthors`

### Top Sites / Top Authors / Top X Authors
- **GET** `/projects/{projectId}/data/volume/topsites/queries`
- **GET** `/projects/{projectId}/data/volume/topauthors/queries`
- **GET** `/projects/{projectId}/data/volume/toptweeters/queries`

Parámetros comunes: `queryId`/`queryGroupId`, `startDate`, `endDate`, `limit` (máx 1000; default 10).

### Top Shared Sites / URLs
- **GET** `/projects/{projectId}/data/sharedsites`
- **GET** `/projects/{projectId}/data/urls`

Opcionales: `limit`, `orderBy` (por volumen).

---

## 19) Agregados y dimensiones (charts)

### Dimensiones (resumen)
- Generales: `queries`, `queryGroups`, `sentiment`, `authors`, `languages`
- Workflow: `categories`, `parentCategories`, `mixedCategories`, `tags`, `assignment`, `checked`, `priority`, `status`
- Ubicación: `continents`, `countries`, `regions`, `cities`
- Tiempo: `months`, `weeks`, `days`, `hours`, `minutes`, `hourOfDay`, `dayOfWeek`
- Demográficos (X): `accountTypes`, `gender`, `interest`, `profession`
- Sitio: `pageTypes`, `domains`

### Aggregates (resumen)
- Generales: `volume`, `authors`, `domains`, `impressions`, `netSentiment`, `reachEstimate`, `twitterFollowers`, `twitterLikeCount`, `engagementScore`
- Algunos aggregates heredados/legacy están marcados como deprecated en la doc original.

---

## 20) Filtros y catálogos

### 20.1 Lista completa de filtros

### GET `/filters`
Devuelve el catálogo de filtros disponibles. La lista completa (nombres de parámetros) es:

- `accountType`
- `anyTag`
- `assigned`
- `author`
- `authorGroup`
- `authorVerifiedType`
- `category`
- `checked`
- `classifications`
- `dayOfWeek`
- `domain`
- `endDate`
- `exactAuthor`
- `exclusiveLocation`
- `facebookAuthorId`
- `facebookCommentsMax`
- `facebookCommentsMin`
- `facebookLikesMax`
- `facebookLikesMin`
- `facebookRole`
- `facebookSharesMax`
- `facebookSharesMin`
- `facebookSubtype`
- `gender`
- `geolocated`
- `hourOfDay`
- `impactMax`
- `impactMin`
- `impressionsMax`
- `impressionsMin`
- `insightsEmoji`
- `insightsEmoticon`
- `insightsHashtag`
- `insightsMentioned`
- `insightsSharedSite`
- `insightsUrl`
- `instagramCommentsMax`
- `instagramCommentsMin`
- `instagramFollowersMax`
- `instagramFollowersMin`
- `instagramFollowingMax`
- `instagramFollowingMin`
- `instagramInteractionsMax`
- `instagramInteractionsMin`
- `instagramLikesMax`
- `instagramLikesMin`
- `instagramPostsMax`
- `instagramPostsMin`
- `interest`
- `language`
- `latitudeMax`
- `latitudeMin`
- `location`
- `locationGroup`
- `logoImagesGroupId`
- `logoVersions`
- `longitudeMax`
- `longitudeMin`
- `monthlyVisitorsMax`
- `monthlyVisitorsMin`
- `pageType`
- `parentCategory`
- `postByAuthor`
- `priority`
- `profession`
- `projectId`
- `queryGroupId`
- `queryId`
- `reachEstimateMax`
- `reachEstimateMin`
- `replyToAuthor`
- `resourceType`
- `search`
- `sentiment`
- `shareOfAuthor`
- `sinceAssignmentUpdated`
- `siteGroup`
- `starred`
- `startDate`
- `status`
- `subtype`
- `tag`
- `threadAuthor`
- `threadEntryType`
- `threadId`
- `timezone`
- `twitterAuthorId`
- `twitterFollowersMax`
- `twitterFollowersMin`
- `twitterFollowingMax`
- `twitterFollowingMin`
- `twitterLikeCountMax`
- `twitterLikeCountMin`
- `twitterPostCountMax`
- `twitterPostCountMin`
- `twitterReplyTo`
- `twitterRetweetOf`
- `twitterRetweetsMax`
- `twitterRetweetsMin`
- `twitterRole`
- `twitterVerified`
- `untilAssignmentUpdated`
- `xaccountType`
- `xassigned`
- `xauthor`
- `xauthorGroup`
- `xauthorVerifiedType`
- `xcategory`
- `xclassifications`
- `xdomain`
- `xexactAuthor`
- `xfacebookAuthorId`
- `xfacebookRole`
- `xfacebookSubtype`
- `xinsightsEmoji`
- `xinsightsEmoticon`
- `xinsightsHashtag`
- `xinsightsMentioned`
- `xinsightsSharedSite`
- `xinsightsUrl`
- `xinterest`
- `xlanguage`
- `xlocation`
- `xlocationGroup`
- `xlogoVersions`
- `xpageType`
- `xparentCategory`
- `xpostByAuthor`
- `xpriority`
- `xprofession`
- `xreplyToAuthor`
- `xresourceType`
- `xshareOfAuthor`
- `xsiteGroup`
- `xstatus`
- `xsubtype`
- `xtag`
- `xthreadAuthor`
- `xthreadEntryType`
- `xthreadId`
- `xtwitterAuthorId`
- `xtwitterReplyTo`
- `xtwitterRetweetOf`

> Nota: los filtros con prefijo `x` son exclusiones (ej. `author` incluye, `xauthor` excluye).

### 20.2 Filtros para polling

- `sinceAdded`: devuelve menciones añadidas después de una fecha
- `sinceUpdated`: menciones actualizadas después de una fecha
- `sourceType=new`: solo menciones nuevas (excluye backfill)

### 20.3 Presets globales

- **GET** `/metrics` devuelve valores permitidos para presets globales (sentiment, accountTypes, genders, contentSources, etc.).

---

## 21) Catálogo de idiomas

La API soporta los siguientes códigos de idioma:

| Código | Idioma |
| --- | --- |
| `aa` | Afar |
| `ab` | Abkhazian |
| `af` | Afrikaans |
| `ak` | Akan |
| `am` | Amharic |
| `ar` | Arabic |
| `as` | Assamese |
| `ay` | Aymara |
| `az` | Azerbaijani |
| `ba` | Bashkir |
| `be` | Belarusian |
| `bg` | Bulgarian |
| `bh` | Bihari languages |
| `bi` | Bislama |
| `bn` | Bengali |
| `bo` | Tibetan |
| `br` | Breton |
| `bs` | Bosnian |
| `ca` | Catalan |
| `ceb` | Cebuano |
| `chr` | Cherokee |
| `co` | Corsican |
| `crs` | Seychellois |
| `cs` | Czech |
| `cy` | Welsh |
| `da` | Danish |
| `de` | German |
| `dv` | Divehi |
| `dz` | Dzongkha |
| `ee` | Ewe |
| `el` | Greek |
| `en` | English |
| `eo` | Esperanto |
| `es` | Spanish |
| `et` | Estonian |
| `eu` | Basque |
| `fa` | Persian |
| `fi` | Finnish |
| `fj` | Fijian |
| `fo` | Faroese |
| `fr` | French |
| `fy` | Western Frisian |
| `ga` | Irish |
| `gaa` | Ga |
| `gd` | Gaelic |
| `gl` | Galician |
| `gn` | Guarani |
| `gu` | Gujarati |
| `gv` | Manx |
| `ha` | Hausa |
| `haw` | Hawaiin |
| `he` | Hebrew |
| `hi` | Hindi |
| `hmn` | Hmong |
| `hr` | Croatian |
| `ht` | Haitian |
| `hu` | Hungarian |
| `hy` | Armenian |
| `ia` | Interlingua |
| `id` | Indonesian |
| `ie` | Interlingue, Occidental |
| `ig` | Igbo |
| `ik` | Inupiaq |
| `is` | Icelandic |
| `it` | Italian |
| `iu` | Inuktitut |
| `ja` | Japenese |
| `jv` | Javanese |
| `ka` | Georgian |
| `kha` | Khasi |
| `kk` | Kazakh |
| `kl` | Kalaallisut |
| `km` | Central Khmer |
| `kn` | Kannada |
| `ko` | Korean |
| `kri` | Krio |
| `ks` | Kashmiri |
| `ku` | Kurdish |
| `ky` | Kyrgyz |
| `la` | Latin |
| `lb` | Luxembourgish |
| `lg` | Ganda |
| `lif` | Limbu |
| `ln` | Lingala |
| `lo` | Lao |
| `loz` | Lozi |
| `lt` | Lithuanian |
| `lua` | Luba-Kasai |
| `luo` | Luo |
| `lv` | Latvian |
| `mfe` | Mauritian |
| `mg` | Malagasy |
| `mi` | Maori |
| `mk` | Macedonian |
| `ml` | Malayalam |
| `mn` | Mongolian |
| `mr` | Marathi |
| `ms` | Malay |
| `mt` | Maltese |
| `my` | Burmese |
| `na` | Nauru |
| `ne` | Nepali |
| `new` | Newar |
| `nl` | Dutch |
| `nn` | Norwegian Nynorsk |
| `no` | Norwegian |
| `nr` | South Ndebele |
| `nso` | Northern Sotho |
| `ny` | Chewa |
| `oc` | Occitan |
| `om` | Oromo |
| `or` | Oriya |
| `os` | Ossetic |
| `pa` | Panjabi |
| `pam` | Kapampangan |
| `pl` | Polish |
| `ps` | Pashto |
| `pt` | Portuguese |
| `qu` | Quechua |
| `raj` | Rajasthani |
| `rm` | Romansh |
| `rn` | Rundi |
| `ro` | Romanian |
| `ru` | Russian |
| `rw` | Kinyarwanda |
| `sa` | Sanskrit |
| `sco` | Scots |
| `sd` | Sindhi |
| `sg` | Sango |
| `si` | Sinhala |
| `sk` | Slovak |
| `sl` | Slovenian |
| `sm` | Samoan |
| `sn` | Shona |
| `so` | Somali |
| `sq` | Albanian |
| `sr` | Serbian |
| `sr-ME` | Montenegrin |
| `ss` | Swati |
| `st` | Southern Sotho |
| `su` | Sundanese |
| `sv` | Swedish |
| `sw` | Swahili |
| `syr` | Syriac |
| `ta` | Tamil |
| `te` | Telugu |
| `tg` | Tajik |
| `th` | Thai |
| `ti` | Tigrinya |
| `tk` | Turkmen |
| `tl` | Tagalog |
| `tn` | Tswana |
| `to` | Tonga |
| `tr` | Turkish |
| `ts` | Tsonga |
| `tt` | Tatar |
| `tum` | Tumbuka |
| `tw` | Twi |
| `ug` | Uighur |
| `uk` | Ukrainian |
| `un` | Unknown |
| `ur` | Urdu |
| `uz` | Uzbek |
| `ve` | Venda |
| `vi` | Vietnamese |
| `vo` | Volapük |
| `war` | Waray |
| `wo` | Wolof |
| `xh` | Xhosa |
| `yi` | Yiddish |
| `yo` | Yoruba |
| `za` | Zhuang |
| `zh` | Chinese |
| `zh-Hant` | Chinese Traditional |
| `zu` | Zulu |

---

## 22) Ubicaciones

### GET `/locations`
Parámetros:
- `type`: `city`, `region`, `country`, `continent`
- `prefix`: texto inicial para búsqueda (ej. `usa`)

Respuesta: lista con `id`, `name`, `type`, `fullName`, `qualifiedName`.

---

## 23) Objects & Logos (image analysis)

### GET `/projects/{projectId}/images/objects`
- Parámetros: `pageSize` (1–5000), `page` (0+)
- Filtro opcional: `objectIds` (lista separada por coma)

### GET `/projects/{projectId}/images/logos`
- Parámetros: `pageSize` (1–5000), `page` (0+)
- Filtro opcional: `logoIds` (lista separada por coma)

Los `id` se usan en `imageFilter` al crear/editar queries.

---

## 24) Exclusions

### GET `/exclusionsnippets?language=xx`
Devuelve catálogos de exclusión por idioma para usar en `exclusionSnippets` al crear queries.

---

## 25) Sorting (orderBy en menciones)

Valores aceptados para `orderBy`:
`accounttype`, `added`, `assignment`, `author`, `authorVerifiedType`, `checked`, `date`, `facebookcomments`, `facebooklikes`, `facebookrole`, `facebookshares`, `gender`, `impact`, `impressions`, `instagramcommentcount`, `instagramfollowercount`, `instagramfollowingcount`, `instagraminteractionscount`, `instagramlikecount`, `instagrampostcount`, `lastassignmentdate`, `linkedinComments`, `linkedinEngagement`, `linkedinImpressions`, `linkedinLikes`, `linkedinShares`, `linkedinVideoViews`, `md5`, `monthlyvisitors`, `priority`, `publicationname`, `reachestimate`, `resourcetype`, `status`, `subtype`, `threadentrytype`, `title`, `twitterfollowers`, `twitterfollowing`, `twitterLikeCount`, `twitterpostcount`, `twitterreplycount`, `twitterretweets`, `twitterrole`, `twitterverified`, `updated`.

---

## 26) Campos de Mention

Los campos disponibles se agrupan por tipo/fuente. Los campos específicos de plataforma suelen ser `null` o `0` si la mención no proviene de esa plataforma.

#### general

`accountType`, `added`, `assignment`, `author`, `authorVerifiedType`, `avatarUrl`, `blogName`, `categories`, `categoryDetails`, `checked`, `city`, `cityCode`, `classifications`, `contentSource`, `contentSourceName`, `continent`, `continentCode`, `copyright`, `country`, `countryCode`, `custom`, `dailyVisitors`, `date`, `displayUrls`, `domain`, `engagementType`, `entityInfo`, `expandedUrls`, `fullname`, `gender`, `guid`, `imageInfo`, `impact`, `importanceAmplification`, `importanceReach`, `impressions`, `insightsHashtag`, `insightsMentioned`, `interest`, `itemReview`, `language`, `lastAssignmentDate`, `latitude`, `locationName`, `longitude`, `matchPositions`, `mediaFilter`, `mediaUrls`, `monthlyVisitors`, `originalUrl`, `pageType`, `pageTypeName`, `parentBlogName`, `parentPostId`, `priority`, `professions`, `pubType`, `publisherSubType`, `queryId`, `queryName`, `rating`, `rawMetadata`, `reachEstimate`, `region`, `regionCode`, `replyTo`, `resourceId`, `resourceType`, `retweetOf`, `rootBlogName`, `rootPostId`, `sentiment`, `shortUrls`, `snippet`, `starred`, `status`, `subtype`, `tags`, `threadAuthor`, `threadCreated`, `threadEntryType`, `threadId`, `threadURL`, `title`, `updated`, `url`, `weblogTitle`

#### twitter

`twitterAuthorId`, `twitterFollowers`, `twitterFollowing`, `twitterLikeCount`, `twitterPostCount`, `twitterReplyCount`, `twitterRetweets`, `twitterRole`, `twitterVerified`

#### facebook

`facebookAuthorId`, `facebookComments`, `facebookLikes`, `facebookRole`, `facebookShares`, `facebookSubtype`

#### instagram

`instagramCommentCount`, `instagramFollowerCount`, `instagramFollowingCount`, `instagramInteractionsCount`, `instagramLikeCount`, `instagramPostCount`

#### linkedin

`linkedinComments`, `linkedinEngagement`, `linkedinImpressions`, `linkedinLikes`, `linkedinShares`, `linkedinSponsored`, `linkedinVideoViews`

#### tiktok

`tiktokComments`, `tiktokLikes`, `tiktokShares`

#### bluesky

`blueskyAuthorId`, `blueskyFollowers`, `blueskyFollowing`, `blueskyLikes`, `blueskyPosts`, `blueskyQuotes`, `blueskyReplies`, `blueskyReposts`


---

## 27) Tutoriales

### 27.1 Paginación histórica (cursor)
- Primer request con `orderBy=date`, `orderDirection=asc`, `pageSize` alto.
- Usar `nextCursor` del response para la siguiente página.
- Repetir hasta que no haya más resultados.

### 27.2 Polling de menciones nuevas
- Usar `orderBy=added`, `orderDirection=desc` y `sinceAdded`.
- Alternativa: `sourceType=new` para excluir backfill.

### 27.3 Construcción de menús de filtros
- Usar `/filters` para lista de filtros disponibles.
- Usar `/metrics` para valores permitidos (sentiment, accountTypes, genders, contentSources, etc.).

---

## 28) Notas operativas

- Si hay discrepancias entre UI y API, revisar restricciones por data packs.
- Para X, LinkedIn o Reddit considerar las limitaciones de texto completo.
- Para métricas de topics/charts, solicitar solo lo necesario para reducir latencia.
