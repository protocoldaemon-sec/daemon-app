import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createServer } from "../../index";

// Mock fetch to prevent actual external API calls
global.fetch = vi.fn();

describe("Agent API Routes", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/agent/system-prompts", () => {
    it("should return system prompts successfully", async () => {
      const mockResponse = {
        prompts: [
          {
            id: "security_analysis",
            name: "Security Analysis",
            description: "Analyze blockchain security vulnerabilities"
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" })
      });

      const response = await request(app)
        .get("/api/agent/system-prompts")
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/chat-daemon/system-prompts",
        {
          headers: { accept: "application/json" }
        }
      );
    });

    it("should handle fetch errors gracefully", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const response = await request(app)
        .get("/api/agent/system-prompts")
        .expect(500);

      expect(response.body).toEqual({ error: "failed_to_fetch_system_prompts" });
    });
  });

  describe("POST /api/agent/chat", () => {
    it("should handle chat requests with JSON response", async () => {
      const mockChatRequest = {
        message: "Hello daemon",
        user: "test-user"
      };

      const mockResponse = {
        reply: "Hello! How can I help you with security analysis?",
        timestamp: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" })
      });

      const response = await request(app)
        .post("/api/agent/chat")
        .send(mockChatRequest)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/chat-daemon",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(mockChatRequest)
        }
      );
    });

    it("should handle chat requests with text response", async () => {
      const mockChatRequest = {
        message: "Explain this vulnerability"
      };

      const mockTextResponse = "This is a text-based explanation";

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockTextResponse,
        headers: new Headers({ "content-type": "text/plain" })
      });

      const response = await request(app)
        .post("/api/agent/chat")
        .send(mockChatRequest)
        .expect(200);

      expect(response.text).toBe(mockTextResponse);
    });

    it("should handle empty request body", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: "Response" }),
        headers: new Headers({ "content-type": "application/json" })
      });

      const response = await request(app)
        .post("/api/agent/chat")
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/chat-daemon",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({})
        }
      );
    });

    it("should handle fetch errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Chat API error"));

      const response = await request(app)
        .post("/api/agent/chat")
        .send({ message: "test" })
        .expect(500);

      expect(response.body).toEqual({ error: "failed_to_post_chat" });
    });
  });

  describe("POST /api/agent/chat-stream", () => {
    it("should handle streaming chat requests", async () => {
      const mockStreamData = ["data: chunk1\n\n", "data: chunk2\n\n"];
      const mockStream = new ReadableStream({
        start(controller) {
          mockStreamData.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        }
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers({ "content-type": "text/event-stream" })
      });

      const response = await request(app)
        .post("/api/agent/chat-stream")
        .send({ message: "streaming test" });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("text/event-stream");
    });

    it("should handle empty body response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
        headers: new Headers({ "content-type": "text/event-stream" })
      });

      const response = await request(app)
        .post("/api/agent/chat-stream")
        .send({ message: "test" });

      expect(response.status).toBe(200);
    });

    it("should handle streaming errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Stream error"));

      const response = await request(app)
        .post("/api/agent/chat-stream")
        .send({ message: "test" })
        .expect(500);

      expect(response.text).toBe("stream_error");
    });
  });

  describe("POST /api/agent/analyze", () => {
    it("should handle analysis streaming requests", async () => {
      const mockAnalysisRequest = {
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        depth: "deep"
      };

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: analysis chunk\n\n"));
          controller.close();
        }
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers({ "content-type": "text/event-stream" })
      });

      const response = await request(app)
        .post("/api/agent/analyze")
        .send(mockAnalysisRequest);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("text/event-stream");
    });

    it("should handle analysis errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Analysis error"));

      const response = await request(app)
        .post("/api/agent/analyze")
        .send({ address: "test-address" })
        .expect(500);

      expect(response.text).toBe("stream_error");
    });
  });

  describe("GET /api/agent/analyze/:address", () => {
    it("should handle address analysis streaming", async () => {
      const testAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: address analysis\n\n"));
          controller.close();
        }
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers({ "content-type": "text/event-stream" })
      });

      const response = await request(app)
        .get(`/api/agent/analyze/${testAddress}`);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://agent.daemonprotocol.com/analyze/${encodeURIComponent(testAddress)}`,
        {
          method: "GET",
          headers: { accept: "text/event-stream" }
        }
      );
    });

    it("should handle special characters in address", async () => {
      const testAddress = "test/address/with/slashes";

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream({ start(controller) { controller.close(); } }),
        headers: new Headers({ "content-type": "text/event-stream" })
      });

      await request(app)
        .get(`/api/agent/analyze/${testAddress}`)
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://agent.daemonprotocol.com/analyze/${encodeURIComponent(testAddress)}`,
        {
          method: "GET",
          headers: { accept: "text/event-stream" }
        }
      );
    });

    it("should handle analysis errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Address analysis error"));

      const response = await request(app)
        .get("/api/agent/analyze/invalid-address")
        .expect(500);

      expect(response.text).toBe("stream_error");
    });
  });
});