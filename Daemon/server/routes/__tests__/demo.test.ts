import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createServer } from "../../index";

describe("Demo API Routes", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createServer();
  });

  describe("GET /api/demo", () => {
    it("should return demo response successfully", async () => {
      const response = await request(app)
        .get("/api/demo")
        .expect(200);

      expect(response.body).toEqual({
        message: "Hello from Express server"
      });
    });

    it("should return correct content-type header", async () => {
      const response = await request(app)
        .get("/api/demo")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle GET requests to demo endpoint", async () => {
      const response = await request(app)
        .get("/api/demo")
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
      expect(response.body.message).toBe("Hello from Express server");
    });

    it("should return consistent response on multiple calls", async () => {
      const response1 = await request(app).get("/api/demo");
      const response2 = await request(app).get("/api/demo");

      expect(response1.body).toEqual(response2.body);
      expect(response1.status).toBe(response2.status);
    });
  });

  describe("Response Validation", () => {
    it("should match DemoResponse interface structure", async () => {
      const response = await request(app)
        .get("/api/demo")
        .expect(200);

      // Verify the response has the expected structure
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe("string");

      // Verify no extra unexpected properties
      const keys = Object.keys(response.body);
      expect(keys).toEqual(["message"]);
    });

    it("should return valid JSON", async () => {
      const response = await request(app)
        .get("/api/demo")
        .expect(200);

      // Should be able to parse response without errors
      expect(() => JSON.parse(response.text)).not.toThrow();
      expect(JSON.parse(response.text)).toEqual(response.body);
    });
  });

  describe("Error Handling", () => {
    it("should handle HEAD requests appropriately", async () => {
      // HEAD requests should work if GET works
      await request(app)
        .head("/api/demo")
        .expect(200);
    });

    it("should reject POST requests", async () => {
      await request(app)
        .post("/api/demo")
        .send({ data: "test" })
        .expect(404); // Express default for unsupported method
    });

    it("should reject PUT requests", async () => {
      await request(app)
        .put("/api/demo")
        .send({ data: "test" })
        .expect(404);
    });

    it("should reject DELETE requests", async () => {
      await request(app)
        .delete("/api/demo")
        .expect(404);
    });
  });

  describe("Performance", () => {
    it("should respond quickly", async () => {
      const start = Date.now();
      await request(app)
        .get("/api/demo")
        .expect(200);
      const duration = Date.now() - start;

      // Should respond within 100ms (generous for test environment)
      expect(duration).toBeLessThan(100);
    });

    it("should handle concurrent requests", async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get("/api/demo")
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: "Hello from Express server"
        });
      });
    });
  });
});