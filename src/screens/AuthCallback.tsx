"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { persistUserFromAccessToken } from "@/app/actions/authActions";
import { forkAndConfigureRepo } from "@/app/actions/githubActions";

type SetupStatus =
  | "authenticating"
  | "persisting"
  | "forking"
  | "done"
  | "error";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus>("authenticating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forkWarning, setForkWarning] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const finalizeOAuth = async () => {
      try {
        // ── Step 1: Exchange code for session ──────────────────────────────
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("No active session");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const accessToken = session?.access_token ?? null;

        if (!accessToken) {
          throw new Error("No access token found after authentication");
        }

        // ── Step 2: Persist user in public.users ───────────────────────────
        if (mounted) setStatus("persisting");
        const user = await persistUserFromAccessToken(accessToken);

        // ── Step 3: Fork repo + inject secrets ────────────────────────────
        if (mounted) setStatus("forking");

        // provider_token is the raw GitHub OAuth token (not the Supabase JWT)
        const providerToken = session?.provider_token ?? null;

        if (providerToken) {
          const result = await forkAndConfigureRepo(providerToken, user.id);
          if (!result.ok && mounted) {
            // Non-blocking: warn but don't block the user
            setForkWarning(result.error);
          }
        } else {
          // provider_token missing (e.g. token was not persisted by Supabase)
          setForkWarning(
            "GitHub provider token unavailable — repo setup skipped. Please sign out and sign in again.",
          );
        }

        if (mounted) {
          setStatus("done");
          // Small delay so the user sees the "done" state briefly
          await new Promise((r) => setTimeout(r, 800));
          router.replace("/dashboard");
        }
      } catch (error) {
        if (mounted) {
          setStatus("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Authentication failed",
          );
        }
      }
    };

    finalizeOAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ── Status label map ──────────────────────────────────────────────────────
  const statusLabel: Record<SetupStatus, string> = {
    authenticating: "Authenticating with GitHub…",
    persisting: "Saving your account…",
    forking: "Setting up your workspace…",
    done: "All done! Redirecting…",
    error: "Something went wrong",
  };

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      {status === "done" ? (
        <CheckCircle2 className="h-6 w-6 text-green-500" />
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      )}

      <p className="text-sm text-muted-foreground">{statusLabel[status]}</p>

      {forkWarning && (
        <div className="flex max-w-sm items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Repo setup warning: {forkWarning}</span>
        </div>
      )}
    </div>
  );
}
