import { describe, expect, it } from "vitest";
import { createInquiryMailto } from "./inquiry";

describe("Studio inquiry email", () => {
  it("preserves international text and query punctuation in a single email body", () => {
    const mailto = new URL(createInquiryMailto({
      topic: "Blue Current",
      organization: "海風 & Co + Partners",
      message: "Explore wind & storage?\nLet’s build together: 風力 + 儲能 #Japan",
    }));
    expect(mailto.protocol).toBe("mailto:");
    expect(mailto.pathname).toBe("hello@carbadia.io");
    expect(mailto.searchParams.get("subject")).toBe("Carbadia Studio | Blue Current");
    expect(mailto.searchParams.get("body")).toBe("Hello Carbadia,\n\nI’d like to discuss: Blue Current\nOrganization: 海風 & Co + Partners\n\nExplore wind & storage?\nLet’s build together: 風力 + 儲能 #Japan");
    expect([...mailto.searchParams.keys()]).toEqual(["subject", "body"]);
  });

  it("rejects a whitespace-only brief instead of generating an empty inquiry", () => {
    expect(() => createInquiryMailto({ topic: "Partnership", organization: "", message: " \n\t " })).toThrow("Add a short project brief.");
  });

  it("leaves out an empty organization and trims the visitor’s brief", () => {
    const mailto = new URL(createInquiryMailto({ topic: "  New project  ", organization: "  ", message: "  A solar project. \n" }));
    expect(mailto.searchParams.get("body")).toBe("Hello Carbadia,\n\nI’d like to discuss: New project\n\nA solar project.");
  });

  it("keeps header-like text out of email headers and normalizes the subject to one line", () => {
    const mailto = new URL(createInquiryMailto({ topic: "Energy\r\nBcc: nobody@example.test", organization: "Company &bcc=nobody@example.test", message: "An idea?subject=changed" }));
    expect(mailto.searchParams.get("subject")).toBe("Carbadia Studio | Energy Bcc: nobody@example.test");
    expect(mailto.searchParams.has("bcc")).toBe(false);
    expect(mailto.searchParams.getAll("subject")).toHaveLength(1);
  });
});
