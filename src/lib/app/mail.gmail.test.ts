import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendMail } from "@/lib/app/mail";

vi.mock("server-only", () => ({}));

const sendMailMock = vi.fn(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

describe("sendMail gmail", () => {
  beforeEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({});
  });

  it("valid addresses accepted", async () => {
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    for (const a of ["user@example.com", "User1@Example.com", "a.b+c@sub.example.co.uk"]) {
      expect(await sendMail(a, "s", "<p/>" )).toBe(true);
    }
  });

  it("rejected without send", async () => {
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    const bad = ["a@b.com,c@d.com", "Name <a@b.com>", "a@b.com\r\nBcc: x@y.com", "a".repeat(255) + "@b.com", "no-at-sign", "a@b"];
    for (const b of bad) {
      expect(await sendMail(b, "s", "<p/>" )).toBe(false);
      expect(sendMailMock).not.toHaveBeenCalled();
      sendMailMock.mockClear();
    }
  });

  it("gmail used when only gmail vars set", async () => {
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    expect(await sendMail("x@y.com", "s", "<p/>" )).toBe(true);
    expect(sendMailMock).toHaveBeenCalled();
  });

  it("brevo wins when configured", async () => {
    process.env.BREVO_API_KEY = "bk";
    process.env.EMAIL_FROM = "f@x.com";
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendMail("x@y.com", "s", "<p/>" )).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("resend wins over gmail", async () => {
    process.env.RESEND_API_KEY = "rk";
    process.env.EMAIL_FROM = "f@x.com";
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendMail("x@y.com", "s", "<p/>" )).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("throwing transport returns false", async () => {
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "pass";
    sendMailMock.mockRejectedValue(new Error("boom"));
    expect(await sendMail("x@y.com", "s", "<p/>" )).toBe(false);
  });

  it("no console receives password", async () => {
    process.env.GMAIL_USER = "u@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "SECRETPW";
    sendMailMock.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendMail("x@y.com", "s", "<p/>" );
    for (const c of spy.mock.calls) {
      expect(JSON.stringify(c)).not.toContain("SECRETPW");
    }
    spy.mockRestore();
  });

  it("nothing configured returns false and logs all three", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendMail("x@y.com", "s", "<p/>" )).toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("GMAIL_USER and GMAIL_APP_PASSWORD"));
    spy.mockRestore();
  });
});
