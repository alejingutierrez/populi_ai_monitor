import { query } from "./db.js";

const allowCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
};

const parseCount = (value) => {
  if (Array.isArray(value)) {
    return parseCount(value[0]);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7000;
  return Math.min(parsed, 10000);
};

const normalizeSentiment = (value) => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "positive" || raw === "positivo") return "positivo";
  if (raw === "negative" || raw === "negativo") return "negativo";
  return "neutral";
};

export default function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const count = parseCount(req.query?.count);
  const sql = `
    select
      p.id,
      p.author,
      p.handle,
      coalesce(pl.display_name, p.platform_id, p.content_source_name, p.content_source) as platform,
      p.content,
      p.sentiment,
      coalesce(t.display_name, p.topic_id) as topic,
      p.timestamp,
      p.reach,
      p.engagement,
      p.media_type as "mediaType",
      coalesce(c.display_name, p.cluster_id) as cluster,
      coalesce(sc.display_name, p.subcluster_id) as subcluster,
      coalesce(mc.display_name, p.microcluster_id) as microcluster,
      coalesce(l.city, p.city, p.location_name) as city,
      coalesce(l.lat, p.latitude) as lat,
      coalesce(l.lng, p.longitude) as lng,
      p.url,
      p.domain,
      p.language
    from posts p
    left join platforms pl on pl.id = p.platform_id
    left join topics t on t.id = p.topic_id
    left join clusters c on c.id = p.cluster_id
    left join subclusters sc on sc.id = p.subcluster_id
    left join microclusters mc on mc.id = p.microcluster_id
    left join locations l on l.id = p.location_id
    order by p.timestamp desc
    limit $1
  `;

  query(sql, [count])
    .then((result) => {
      const posts = result.rows.map((row) => ({
        id: row.id,
        author: row.author ?? "Sin autor",
        handle: row.handle ?? "",
        platform: row.platform ?? "Sin plataforma",
        content: row.content ?? "",
        sentiment: normalizeSentiment(row.sentiment),
        topic: row.topic ?? "Sin tema",
        timestamp: row.timestamp,
        reach: row.reach ?? 0,
        engagement: row.engagement ?? 0,
        mediaType: row.mediaType ?? "texto",
        cluster: row.cluster ?? "Sin cluster",
        subcluster: row.subcluster ?? "Sin subcluster",
        microcluster: row.microcluster ?? "Sin microcluster",
        location: {
          city: row.city ?? "Sin ubicación",
          lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
          lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
        },
        url: row.url ?? undefined,
        domain: row.domain ?? undefined,
        language: row.language ?? undefined,
      }));
      res.status(200).json(posts);
    })
    .catch((error) => {
      console.error("DB error:", error);
      res.status(500).json({ error: "Database query failed" });
    });
}
