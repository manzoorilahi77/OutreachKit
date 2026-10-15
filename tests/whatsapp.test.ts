import { describe, expect, it } from "vitest";
import { normalizeWhatsapp, whatsappHref } from "@/lib/leads/whatsapp";

describe("normalizeWhatsapp", () => {
  it("reduces a wa.me or api.whatsapp.com link to the number's digits", () => {
    expect(normalizeWhatsapp("https://wa.me/12145550147")).toBe("12145550147");
    expect(normalizeWhatsapp("https://wa.me/+1 214 555 0147?text=hi")).toBe("12145550147");
    expect(normalizeWhatsapp("https://api.whatsapp.com/send?phone=12145550147&text=hi")).toBe("12145550147");
    expect(normalizeWhatsapp("https://web.whatsapp.com/send?phone=971501234567")).toBe("971501234567");
  });
  it("keeps a link that carries no number (a wa.me/message link)", () => {
    expect(normalizeWhatsapp("https://wa.me/message/ABCDEF123")).toBe("https://wa.me/message/ABCDEF123");
  });
  it("accepts a typed number in any common format", () => {
    expect(normalizeWhatsapp("+1 (214) 555-0147")).toBe("12145550147");
    expect(normalizeWhatsapp("0097150 123 4567")).toBe("971501234567");
  });
  it("refuses anything else", () => {
    expect(normalizeWhatsapp("")).toBe("");
    expect(normalizeWhatsapp("call me")).toBe("");
    expect(normalizeWhatsapp("12345")).toBe("");
    expect(normalizeWhatsapp("javascript:alert(1)")).toBe("");
    expect(normalizeWhatsapp("https://evil.example/12145550147")).toBe("");
  });
});

describe("whatsappHref", () => {
  it("builds the chat link", () => {
    expect(whatsappHref("12145550147")).toBe("https://wa.me/12145550147");
    expect(whatsappHref("https://wa.me/message/ABC")).toBe("https://wa.me/message/ABC");
    expect(whatsappHref("")).toBe("");
    expect(whatsappHref(undefined)).toBe("");
  });
});
