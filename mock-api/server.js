import cors from "cors";
import express from "express";
import { generateMockPosts } from "./mockData.js";

const app = express();
app.use(cors());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/posts", (_req, res) => {
  const posts = generateMockPosts(400);
  res.json(posts);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Mock API lista en puerto ${port}`);
});
