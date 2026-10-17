/**
 * Classify inference and database endpoints as local/private vs cloud.
 */

function parseHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function isPrivateIpv4(host: string): boolean {
  const n = ipv4ToInt(host);
  if (n === null) return false;
  // Bitwise ops in JS are signed 32-bit — normalize with >>> 0
  const u = n >>> 0;
  // 127.0.0.0/8
  if ((u & 0xff000000) >>> 0 === 0x7f000000) return true;
  // 10.0.0.0/8
  if ((u & 0xff000000) >>> 0 === 0x0a000000) return true;
  // 172.16.0.0/12
  if ((u & 0xfff00000) >>> 0 === 0xac100000) return true;
  // 192.168.0.0/16
  if ((u & 0xffff0000) >>> 0 === 0xc0a80000) return true;
  return false;
}

export function isLocalUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const host = parseHost(url);
  if (!host) return false;
  if (host === "localhost" || host === "::1") return true;
  if (host.endsWith(".local")) return true;
  if (isPrivateIpv4(host)) return true;
  return false;
}

export type PrivacyStatus = {
  local: boolean;
  label: string;
  llmLocal: boolean;
  dbLocal: boolean;
};

export function computePrivacyStatus(
  llmBaseUrl: string | undefined,
  supabaseUrl: string | undefined,
): PrivacyStatus {
  const llmLocal = isLocalUrl(llmBaseUrl);
  const dbLocal = isLocalUrl(supabaseUrl);
  const local = llmLocal && dbLocal;
  return {
    local,
    llmLocal,
    dbLocal,
    label: local
      ? "LOCAL INFERENCE + LOCAL DB"
      : "CLOUD ENDPOINT — SYNTHETIC DATA ONLY",
  };
}
