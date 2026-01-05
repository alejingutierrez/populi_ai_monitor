import { generateMockPosts } from "../mock-api/mockData.js";

const allowCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const parseCount = (value) => {
  if (Array.isArray(value)) {
    return parseCount(value[0]);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 400;
  return Math.min(parsed, 2000);
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
  const posts = generateMockPosts(count);
  res.status(200).json(posts);
}
