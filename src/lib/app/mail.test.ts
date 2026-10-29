import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendMail } from "@/lib/app/mail";

vi.mock("server-only", () => ({}));

describe("sendMail", () => {
  const html = `<p>Test email</p>`;

  beforeEach(() => {
    // Clear all email-related env vars before each test
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("uses Brevo when BREVO_API_KEY and EMAIL_FROM are set", async () => {
    process.env.BREVO_API_KEY = "test-brevo-key";
    process.env.EMAIL_FROM = "test@example.com";

    // Mock fetch for Brevo API
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "success" }), {
          status: 200,
        })
      )
    );

    await sendMail("user@example.com", "Test Subject", html);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.spyOn>).mock
      .calls[0];
    expect(fetchCall[0]).toBe("https://api.brevo.com/v3/smtp/email");
    expect(fetchCall[1].headers).toEqual(
      expect.objectContaining({
        "api-key": "test-brevo-key",
        "Content-Type": "application/json",
      })
    );
    expect(fetchCall[1].body).toEqual(
      expect.stringContaining('"sender"')
    );
    expect(fetchCall[1].body).toEqual(
      expect.stringContaining('"htmlContent"')
    );

    fetchMock.mockRestore();
  });

  it("uses Resend when only RESEND_API_KEY and EMAIL_FROM are set", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "test@example.com";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "success" }), {
          status: 200,
        })
      )
    );

    await sendMail("user@example.com", "Test Subject", html);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.spyOn>).mock
      .calls[0];
    expect(fetchCall[0]).toBe("https://api.resend.com/emails");
    expect(fetchCall[1].headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-resend-key",
        "Content-Type": "application/json",
      })
    );
    expect(fetchCall[1].body).toEqual(
      expect.stringContaining('"from"')
    );
    expect(fetchCall[1].body).toEqual(
      expect.stringContaining('"to"')
    );

    fetchMock.mockRestore();
  });

  it("logs error and does not throw when neither provider is configured", async () => {
    // Neither BREVO_API_KEY nor RESEND_API_KEY nor EMAIL_FROM are set (cleared in beforeEach)

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendMail("user@example.com", "Test Subject", html);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[mail] email not configured: set BREVO_API_KEY and EMAIL_FROM, or RESEND_API_KEY and EMAIL_FROM"
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns successfully (no throw) when neither provider is configured", async () => {
    // Should not throw, just log error

    await expect(sendMail("user@example.com", "Test Subject", html)).resolves.toBeUndefined();
  });
});