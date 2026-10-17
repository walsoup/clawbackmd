import { describe, expect, it } from "vitest";
import { computePrivacyStatus, isLocalUrl } from "@/lib/privacy";

describe("isLocalUrl", () => {
  it("accepts localhost and loopback", () => {
    expect(isLocalUrl("http://localhost:11434/v1")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:54321")).toBe(true);
  });

  it("accepts private ranges", () => {
    expect(isLocalUrl("http://10.0.0.5:8000")).toBe(true);
    expect(isLocalUrl("http://172.16.1.1:8000")).toBe(true);
    expect(isLocalUrl("http://192.168.1.10:8000")).toBe(true);
  });

  it("rejects public cloud hosts", () => {
    expect(isLocalUrl("https://api.openai.com/v1")).toBe(false);
    expect(isLocalUrl("https://xyz.supabase.co")).toBe(false);
  });
});

describe("computePrivacyStatus", () => {
  it("green only when both local", () => {
    const both = computePrivacyStatus(
      "http://localhost:11434/v1",
      "http://127.0.0.1:54321",
    );
    expect(both.local).toBe(true);
    expect(both.label).toContain("LOCAL");

    const cloudLlm = computePrivacyStatus(
      "https://api.openai.com/v1",
      "http://127.0.0.1:54321",
    );
    expect(cloudLlm.local).toBe(false);
    expect(cloudLlm.label).toContain("CLOUD");
  });
});
