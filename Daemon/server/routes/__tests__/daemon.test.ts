import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createServer } from "../../index";

// Mock fetch to prevent actual external API calls
global.fetch = vi.fn();

describe("Daemon Proxy API Routes", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/daemon/*", () => {
    it("should proxy GET requests successfully", async () => {
      const mockResponse = {
        data: "proxy response",
        timestamp: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(mockResponse)));
            controller.close();
          }
        })
      });

      const response = await request(app)
        .get("/api/daemon/test-endpoint")
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/test-endpoint",
        {
          method: "GET",
          headers: expect.objectContaining({
            host: undefined
          })
        }
      );
    });

    it("should handle GET requests with query parameters", async () => {
      const mockResponse = { results: [] };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(mockResponse)));
            controller.close();
          }
        })
      });

      await request(app)
        .get("/api/daemon/search")
        .query({ q: "test", limit: "10" })
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=test&limit=10"),
        expect.any(Object)
      );
    });

    it("should handle empty response body", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
        headers: new Headers()
      });

      const response = await request(app)
        .get("/api/daemon/empty")
        .expect(200);
    });
  });

  describe("POST /api/daemon/*", () => {
    it("should proxy POST requests with JSON body", async () => {
      const requestBody = {
        message: "test message",
        user: "test-user"
      };

      const mockResponse = {
        success: true,
        id: "response-123"
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(mockResponse)));
            controller.close();
          }
        })
      });

      await request(app)
        .post("/api/daemon/chat")
        .send(requestBody)
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/chat",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "content-type": "application/json"
          }),
          body: JSON.stringify(requestBody)
        })
      );
    });

    it("should proxy POST requests with custom content-type", async () => {
      const requestBody = "plain text data";

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("response"));
            controller.close();
          }
        })
      });

      await request(app)
        .post("/api/daemon/submit")
        .set("Content-Type", "text/plain")
        .send(requestBody)
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/submit",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "content-type": "text/plain"
          }),
          body: JSON.stringify({})
        })
      );
    });

    it("should handle empty POST request body", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{}"));
            controller.close();
          }
        })
      });

      await request(app)
        .post("/api/daemon/empty")
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/empty",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({})
        })
      );
    });
  });

  describe("PUT /api/daemon/*", () => {
    it("should proxy PUT requests", async () => {
      const requestBody = { data: "updated" };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ success: true })));
            controller.close();
          }
        })
      });

      await request(app)
        .put("/api/daemon/resource/123")
        .send(requestBody)
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/resource/123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(requestBody)
        })
      );
    });
  });

  describe("DELETE /api/daemon/*", () => {
    it("should proxy DELETE requests", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        body: new ReadableStream({
          start(controller) {
            controller.close();
          }
        })
      });

      await request(app)
        .delete("/api/daemon/resource/123")
        .expect(204);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/resource/123",
        expect.objectContaining({
          method: "DELETE"
        })
      );
    });
  });

  describe("Response Headers", () => {
    it("should forward content-type header", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/xml" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("<xml>data</xml>"));
            controller.close();
          }
        })
      });

      const response = await request(app)
        .get("/api/daemon/xml-data")
        .expect(200);

      expect(response.headers["content-type"]).toBe("application/xml");
    });

    it("should use default content-type when not provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("response"));
            controller.close();
          }
        })
      });

      const response = await request(app)
        .get("/api/daemon/no-content-type")
        .expect(200);

      expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const response = await request(app)
        .get("/api/daemon/error-endpoint")
        .expect(500);

      expect(response.body).toEqual({ error: "daemon_proxy_error" });
    });

    it("should handle HTTP error responses", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ error: "Not found" })));
            controller.close();
          }
        })
      });

      await request(app)
        .get("/api/daemon/not-found")
        .expect(404);
    });

    it("should handle timeout errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("timeout"));

      const response = await request(app)
        .get("/api/daemon/timeout")
        .expect(500);

      expect(response.body).toEqual({ error: "daemon_proxy_error" });
    });
  });

  describe("Path Extraction", () => {
    it("should correctly extract path with nested endpoints", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{}"));
            controller.close();
          }
        })
      });

      await request(app)
        .get("/api/daemon/v1/users/123/profile")
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com/v1/users/123/profile",
        expect.any(Object)
      );
    });

    it("should handle root daemon path", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{}"));
            controller.close();
          }
        })
      });

      await request(app)
        .get("/api/daemon")
        .expect(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://agent.daemonprotocol.com",
        expect.any(Object)
      );
    });
  });
});