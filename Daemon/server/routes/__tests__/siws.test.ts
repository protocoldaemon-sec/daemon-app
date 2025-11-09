import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createServer } from "../../index";

// Mock crypto.getRandomValues
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

describe("SIWS (Sign In With Solana) API Routes", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/siws/create", () => {
    it("should create sign-in data successfully", async () => {
      const mockRequest = {
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
      };

      // Mock predictable random values for testing
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(0x42); // Fill with predictable value
        return array;
      });

      const response = await request(app)
        .post("/api/siws/create")
        .send(mockRequest)
        .expect(200);

      expect(response.body).toHaveProperty("input");
      expect(response.body.input).toMatchObject({
        domain: expect.any(String),
        statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
        uri: expect.stringContaining("http"),
        version: "1",
        nonce: expect.any(String),
        chainId: "mainnet",
        issuedAt: expect.any(String),
        expirationTime: expect.any(String),
        address: mockRequest.address
      });

      // Verify nonce format (should be hex string)
      expect(response.body.input.nonce).toMatch(/^[a-f0-9]+$/i);
      expect(response.body.input.nonce.length).toBe(32); // 16 bytes * 2 hex chars

      // Verify date formats
      expect(response.body.input.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(response.body.input.expirationTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should create sign-in data without address", async () => {
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(0x43);
        return array;
      });

      const response = await request(app)
        .post("/api/siws/create")
        .send({})
        .expect(200);

      expect(response.body.input).not.toHaveProperty("address");
      expect(response.body.input).toHaveProperty("domain");
      expect(response.body.input).toHaveProperty("nonce");
    });

    it("should handle custom host headers", async () => {
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(0x44);
        return array;
      });

      const response = await request(app)
        .post("/api/siws/create")
        .set("Host", "custom.example.com")
        .set("x-forwarded-proto", "https")
        .send({})
        .expect(200);

      expect(response.body.input.domain).toBe("custom.example.com");
      expect(response.body.input.uri).toBe("https://custom.example.com");
    });

    it("should use default protocol when x-forwarded-proto is missing", async () => {
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(0x45);
        return array;
      });

      const response = await request(app)
        .post("/api/siws/create")
        .set("Host", "test.example.com")
        .send({})
        .expect(200);

      expect(response.body.input.uri).toBe("https://test.example.com");
    });

    it("should generate unique nonces for different requests", async () => {
      // Generate different random values for each call
      let callCount = 0;
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(callCount * 10);
        callCount++;
        return array;
      });

      const response1 = await request(app)
        .post("/api/siws/create")
        .send({})
        .expect(200);

      const response2 = await request(app)
        .post("/api/siws/create")
        .send({})
        .expect(200);

      expect(response1.body.input.nonce).not.toBe(response2.body.input.nonce);
    });

    it("should verify expiration time is 5 minutes from now", async () => {
      const beforeCall = new Date();

      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        array.fill(0x46);
        return array;
      });

      const response = await request(app)
        .post("/api/siws/create")
        .send({})
        .expect(200);

      const afterCall = new Date();

      const issuedAt = new Date(response.body.input.issuedAt);
      const expirationTime = new Date(response.body.input.expirationTime);

      // Verify issuedAt is within reasonable time range
      expect(issuedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000);
      expect(issuedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);

      // Verify expiration is approximately 5 minutes after issuedAt
      const diff = expirationTime.getTime() - issuedAt.getTime();
      expect(diff).toBe(5 * 60 * 1000); // Exactly 5 minutes in milliseconds
    });

    it("should handle errors gracefully", async () => {
      // Mock crypto to throw an error
      mockCrypto.getRandomValues.mockImplementation(() => {
        throw new Error("Random generation failed");
      });

      const response = await request(app)
        .post("/api/siws/create")
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty("input");
      expect(response.body.input).toEqual({});
    });
  });

  describe("POST /api/siws/verify", () => {
    // Mock valid SIWS data
    const createMockSIWSData = () => {
      const input = {
        domain: "localhost:3000",
        statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
        uri: "http://localhost:3000",
        version: "1",
        nonce: "abcdef1234567890",
        chainId: "mainnet",
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      };

      const output = {
        account: {
          address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          publicKey: new Uint8Array([1, 2, 3, 4, 5])
        },
        signature: new Uint8Array([10, 20, 30, 40, 50]),
        signedMessage: new Uint8Array([100, 110, 120, 130, 140])
      };

      return { input, output };
    };

    it("should reject requests missing input and output", async () => {
      const response = await request(app)
        .post("/api/siws/verify")
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Missing input or output in request body"
      });
    });

    it("should reject requests missing only input", async () => {
      const { output } = createMockSIWSData();

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ output })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Missing input or output in request body"
      });
    });

    it("should reject requests missing only output", async () => {
      const { input } = createMockSIWSData();

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ input })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Missing input or output in request body"
      });
    });

    it("should handle array-converted Uint8Arrays correctly", async () => {
      const { input, output } = createMockSIWSData();

      // Convert Uint8Arrays to arrays (as would happen in JSON serialization)
      const arrayOutput = {
        account: {
          ...output.account,
          publicKey: Array.from(output.publicKey)
        },
        signature: Array.from(output.signature),
        signedMessage: Array.from(output.signedMessage)
      };

      // Mock successful verification
      vi.doMock("@solana/wallet-standard-util", () => ({
        verifySignIn: vi.fn().mockReturnValue(true)
      }));

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ input, output: arrayOutput })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Sign-in verification successful"
      });
    });

    it("should handle already-converted Uint8Arrays", async () => {
      const { input, output } = createMockSIWSData();

      // Mock failed verification
      vi.doMock("@solana/wallet-standard-util", () => ({
        verifySignIn: vi.fn().mockReturnValue(false)
      }));

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ input, output })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Sign-in verification failed"
      });
    });

    it("should handle verification errors", async () => {
      const { input, output } = createMockSIWSData();

      // Mock verification to throw an error
      vi.doMock("@solana/wallet-standard-util", () => ({
        verifySignIn: vi.fn().mockImplementation(() => {
          throw new Error("Verification error");
        })
      }));

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ input, output })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Verification error"
      });
    });

    it("should handle mixed array/Uint8Array inputs", async () => {
      const { input, output } = createMockSIWSData();

      // Mix different types
      const mixedOutput = {
        account: {
          ...output.account,
          publicKey: Array.from(output.publicKey) // Array
        },
        signature: output.signature, // Uint8Array
        signedMessage: new Uint8Array(Array.from(output.signedMessage)) // Uint8Array created from array
      };

      vi.doMock("@solana/wallet-standard-util", () => ({
        verifySignIn: vi.fn().mockReturnValue(true)
      }));

      const response = await request(app)
        .post("/api/siws/verify")
        .send({ input, output: mixedOutput })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Request Validation", () => {
    it("should reject invalid JSON", async () => {
      await request(app)
        .post("/api/siws/create")
        .set("Content-Type", "application/json")
        .send("invalid json")
        .expect(400);
    });

    it("should reject empty request", async () => {
      await request(app)
        .post("/api/siws/create")
        .expect(400);
    });
  });
});