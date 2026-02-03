import crypto from "crypto";

const allowCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-GitHub-Event,X-Hub-Signature-256");
};

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const normalizeSignature = (signature) =>
  Array.isArray(signature) ? signature[0] : signature;

const isSignatureValid = (rawBody, signature, secret) => {
  const normalized = normalizeSignature(signature);
  if (!normalized || !secret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const sigBuffer = Buffer.from(normalized);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
};

const getTeamId = () =>
  process.env.VERCEL_TEAM_ID ||
  process.env.VERCEL_ORG_ID ||
  "team_GEudrG1hM2OstdVOLSsJbj4G";

const getProjectName = () => process.env.VERCEL_PROJECT_NAME || "populi-ai-monitor";

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const rawBody = await readRawBody(req);
  const event = req.headers["x-github-event"];

  if (event !== "push") {
    res.status(202).json({ ok: true, ignored: true, reason: "event" });
    return;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers["x-hub-signature-256"];
    const fallbackBody =
      rawBody.length > 0
        ? rawBody
        : Buffer.from(
            typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
          );
    if (!isSignatureValid(fallbackBody, signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  let payload = {};
  try {
    payload = JSON.parse(rawBody.toString("utf8") || "{}");
  } catch (error) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  if (payload.ref !== "refs/heads/main") {
    res.status(202).json({ ok: true, ignored: true, reason: "branch" });
    return;
  }

  const repo = payload?.repository?.name;
  const org = payload?.repository?.owner?.login || payload?.repository?.owner?.name;
  const sha = payload?.after;
  const token = process.env.VERCEL_TOKEN;

  if (!token || !repo || !org || !sha) {
    res.status(500).json({ error: "Missing deployment configuration" });
    return;
  }

  const teamId = getTeamId();
  const projectName = getProjectName();

  const body = {
    name: projectName,
    project: projectName,
    target: "production",
    gitSource: {
      type: "github",
      org,
      repo,
      ref: "main",
      sha,
    },
  };

  const url = `https://api.vercel.com/v13/deployments?teamId=${teamId}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    res.status(response.status).json({ error: "Vercel deployment failed", detail: data });
    return;
  }

  res.status(200).json({
    ok: true,
    deploymentId: data.id || data.uid,
    url: data.url,
    state: data.readyState,
  });
}
