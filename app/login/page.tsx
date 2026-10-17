"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Wordmark, Hairline } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ln-bg)] px-6">
      <div className="w-full max-w-md">
        <p className="ln-overline">Sign in</p>
        <div className="mt-1.5">
          <Wordmark text="ClawbackMD" />
        </div>
        <p className="ln-body-sec mt-2 text-[var(--ln-text-secondary)]">
          Magic link access. Or set{" "}
          <code className="ln-mono-tiny text-[var(--ln-primary)]">DEMO_MODE=true</code>{" "}
          to skip login.
        </p>
        <Hairline className="my-5" />
        {sent ? (
          <p className="rounded-[var(--ln-pill-radius)] bg-[var(--ln-container)] px-4 py-3 ln-body-sec text-[var(--ln-primary)]">
            Check your email for a magic link.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block ln-caption text-[var(--ln-text-secondary)]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ln-field"
              />
            </label>
            {error && (
              <p className="ln-caption text-[var(--ln-rec)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="ln-btn ln-btn-primary w-full"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
