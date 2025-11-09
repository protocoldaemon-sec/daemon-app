import type { RequestHandler } from "express";

const AGENT_BASE = "https://agent.daemonprotocol.com";

export const getSystemPrompts: RequestHandler = async (_req, res) => {
  try {
    const r = await fetch(`${AGENT_BASE}/chat-daemon/system-prompts`, {
      headers: { accept: "application/json" },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "failed_to_fetch_system_prompts" });
  }
};

export const postChat: RequestHandler = async (req, res) => {
  try {
    const r = await fetch(`${AGENT_BASE}/chat-daemon`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(req.body ?? {}),
    });
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await r.json();
      res.status(r.status).json(data);
    } else {
      const text = await r.text();
      res.status(r.status).send(text);
    }
  } catch (e) {
    res.status(500).json({ error: "failed_to_post_chat" });
  }
};

// Optional: naive stream passthrough (text based)
export const postChatStream: RequestHandler = async (req, res) => {
  try {
    const r = await fetch(`${AGENT_BASE}/chat-daemon-stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    res.status(r.status);
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "text/plain; charset=utf-8",
    );
    if (!r.body) return res.end();
    for await (const chunk of r.body as any) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    res.status(500).end("stream_error");
  }
};

export const postAnalyze: RequestHandler = async (req, res) => {
  try {
    const r = await fetch(`${AGENT_BASE}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    res.status(r.status);
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "text/event-stream; charset=utf-8",
    );
    if (!r.body) return res.end();
    for await (const chunk of r.body as any) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    res.status(500).end("stream_error");
  }
};

export const getAnalyze: RequestHandler = async (req, res) => {
  try {
    const address = encodeURIComponent(String(req.params.address || ""));
    const r = await fetch(`${AGENT_BASE}/analyze/${address}`, {
      method: "GET",
      headers: { accept: "text/event-stream" },
    });
    res.status(r.status);
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "text/event-stream; charset=utf-8",
    );
    if (!r.body) return res.end();
    for await (const chunk of r.body as any) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    res.status(500).end("stream_error");
  }
};
