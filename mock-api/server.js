import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { generateMockPosts } from "./mockData.js";
import { query } from "./db.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.use(cors());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/posts", async (req, res) => {
  const count = Math.min(Number.parseInt(req.query?.count ?? "1400", 10) || 1400, 2000);
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    const posts = generateMockPosts(1400).slice(0, count);
    res.json(posts);
    return;
  }

  try {
    const sql = `
      select
        p.id,
        p.author,
        p.handle,
        coalesce(pl.display_name, p.platform_id) as platform,
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
        l.city,
        l.lat,
        l.lng
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
    const result = await query(sql, [count]);
    const posts = result.rows.map((row) => ({
      id: row.id,
      author: row.author,
      handle: row.handle,
      platform: row.platform,
      content: row.content,
      sentiment: row.sentiment,
      topic: row.topic,
      timestamp: row.timestamp,
      reach: row.reach,
      engagement: row.engagement,
      mediaType: row.mediaType,
      cluster: row.cluster,
      subcluster: row.subcluster,
      microcluster: row.microcluster,
      location: {
        city: row.city,
        lat: Number(row.lat),
        lng: Number(row.lng),
      },
    }));
    res.json(posts);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Mock API lista en puerto ${port}`);
});
