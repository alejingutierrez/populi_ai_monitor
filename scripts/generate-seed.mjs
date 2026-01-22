import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMockPosts } from "../mock-api/mockData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "db", "seed.sql");

const posts = generateMockPosts(2000);

const escapeSql = (value) => String(value).replace(/'/g, "''");
const sqlString = (value) => `'${escapeSql(value)}'`;
const sqlNumber = (value) => (Number.isFinite(value) ? value : 0);

const insertRows = (table, columns, rows) => {
  if (!rows.length) return "";
  const values = rows
    .map((row) => `(${row.map((cell) => cell).join(", ")})`)
    .join(",\n");
  return `insert into ${table} (${columns.join(", ")}) values\n${values};\n`;
};

const platforms = new Set();
const topics = new Set();
const clusters = new Set();
const subclusters = new Map();
const microclusters = new Map();
const locations = new Map();

const subclusterId = (cluster, subcluster) => `${cluster}::${subcluster}`;
const microclusterId = (cluster, subcluster, microcluster) =>
  `${cluster}::${subcluster}::${microcluster}`;

posts.forEach((post) => {
  platforms.add(post.platform);
  topics.add(post.topic);
  clusters.add(post.cluster);

  const subId = subclusterId(post.cluster, post.subcluster);
  const microId = microclusterId(post.cluster, post.subcluster, post.microcluster);

  subclusters.set(subId, { id: subId, cluster: post.cluster, name: post.subcluster });
  microclusters.set(microId, { id: microId, subcluster: subId, name: post.microcluster });

  if (!locations.has(post.location.city)) {
    locations.set(post.location.city, {
      id: post.location.city,
      city: post.location.city,
      lat: post.location.lat,
      lng: post.location.lng,
    });
  }
});

const platformRows = Array.from(platforms).map((platform) => [
  sqlString(platform),
  sqlString(platform),
]);

const topicRows = Array.from(topics).map((topic) => [sqlString(topic), sqlString(topic)]);

const clusterRows = Array.from(clusters).map((cluster) => [
  sqlString(cluster),
  sqlString(cluster),
  "null",
]);

const subclusterRows = Array.from(subclusters.values()).map((subcluster) => [
  sqlString(subcluster.id),
  sqlString(subcluster.cluster),
  sqlString(subcluster.name),
]);

const microclusterRows = Array.from(microclusters.values()).map((microcluster) => [
  sqlString(microcluster.id),
  sqlString(microcluster.subcluster),
  sqlString(microcluster.name),
]);

const locationRows = Array.from(locations.values()).map((loc) => [
  sqlString(loc.id),
  sqlString(loc.city),
  sqlNumber(loc.lat),
  sqlNumber(loc.lng),
]);

const postRows = posts.map((post) => [
  sqlString(post.id),
  sqlString(post.author),
  sqlString(post.handle),
  sqlString(post.platform),
  sqlString(post.content),
  sqlString(post.sentiment),
  sqlString(post.topic),
  sqlString(post.location.city),
  sqlString(post.timestamp),
  sqlNumber(post.reach),
  sqlNumber(post.engagement),
  sqlString(post.mediaType),
  sqlString(post.cluster),
  sqlString(subclusterId(post.cluster, post.subcluster)),
  sqlString(microclusterId(post.cluster, post.subcluster, post.microcluster)),
]);

const seedSql = `-- Auto-generated seed for Neon/Postgres
begin;

delete from post_actions;
delete from post_classifications;
delete from classification_labels;
delete from insight_snapshots;
delete from insight_requests;
delete from posts;
delete from microclusters;
delete from subclusters;
delete from clusters;
delete from topics;
delete from platforms;
delete from locations;

${insertRows("platforms", ["id", "display_name"], platformRows)}
${insertRows("topics", ["id", "display_name"], topicRows)}
${insertRows("clusters", ["id", "display_name", "description"], clusterRows)}
${insertRows("subclusters", ["id", "cluster_id", "display_name"], subclusterRows)}
${insertRows("microclusters", ["id", "subcluster_id", "display_name"], microclusterRows)}
${insertRows("locations", ["id", "city", "lat", "lng"], locationRows)}
${insertRows(
  "posts",
  [
    "id",
    "author",
    "handle",
    "platform_id",
    "content",
    "sentiment",
    "topic_id",
    "location_id",
    "timestamp",
    "reach",
    "engagement",
    "media_type",
    "cluster_id",
    "subcluster_id",
    "microcluster_id",
  ],
  postRows
)}

commit;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, seedSql, "utf8");

console.log(`Seed written to ${outputPath}`);
