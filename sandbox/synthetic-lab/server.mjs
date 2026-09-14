import http from "node:http";
import fs from "node:fs/promises";

const PORT = 8080;
const server = http.createServer(async (req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.url === "/health") {
    res.end(JSON.stringify({ status: "ok", mode: "synthetic", network: "internal-only" }));
    return;
  }
  if (req.url === "/evidence/summary") {
    const summary = await fs.readFile("/opt/lab/evidence/summary.json", "utf8");
    res.end(summary);
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "synthetic endpoint not found" }));
});
server.listen(PORT, "0.0.0.0");
