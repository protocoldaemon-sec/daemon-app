import type { RequestHandler } from "express";

const AGENT_BASE = "https://agent.daemonprotocol.com";

export const proxyDaemon: RequestHandler = async (req, res) => {
  try {
    const path = req.originalUrl.replace(/^\/?api\/daemon/, "");
    const url = `${AGENT_BASE}${path}`;
    const init: RequestInit = {
      method: req.method,
      headers: { ...req.headers, host: undefined as any } as any,
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = JSON.stringify(req.body ?? {});
      (init.headers as any)["content-type"] =
        (req.headers["content-type"] as string) || "application/json";
    }
    const r = await fetch(url, init);
    res.status(r.status);
    const ct = r.headers.get("content-type") || "";
    res.setHeader("Content-Type", ct || "application/json; charset=utf-8");
    if (!r.body) return res.end();
    // Stream passthrough for SSE/text
    for await (const chunk of r.body as any) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    res.status(500).json({ error: "daemon_proxy_error" });
  }
};
