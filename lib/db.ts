import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * In-memory demo store is the default. No Docker / Supabase required.
 * Set USE_MEMORY_STORE=false and provide SUPABASE_* to use Postgres.
 */
export function useMemoryStore(): boolean {
  if ((process.env.USE_MEMORY_STORE ?? "true").toLowerCase() === "false") {
    return false;
  }
  return true;
}

/**
 * Server-only Supabase client (optional). Never expose to the browser.
 */
export function getServiceDb(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is optional. Leave USE_MEMORY_STORE=true (default), or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export type DbClaim = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number;
  payer_name: string;
  plan_type?: string;
  carc_code: string;
  rarc_code: string | null;
  denial_reason: string;
  denied_at: string;
  status: string;
  policy_id: string;
};

export type DbPolicy = {
  id: string;
  payer: string;
  policy_code: string;
  title: string;
  body: string;
};

export type DbNote = {
  id: string;
  claim_id: string;
  note_type: string;
  authored_at: string;
  text: string;
};

export type DbAppeal = {
  id: string;
  claim_id: string;
  analysis: Record<string, unknown>;
  letter: Record<string, unknown>;
  p2p: Record<string, unknown>;
  model: string;
  latency_ms: number;
  created_at: string;
  is_cached: boolean;
  is_active: boolean;
};
