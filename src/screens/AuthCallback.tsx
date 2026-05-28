"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Github, Database, Key } from "lucide-react";
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

  // ── Status details map ────────────────────────────────────────────────────
  const statusDetails: Record<SetupStatus, { title: string; subtitle: string; icon: React.ReactNode }> = {
    authenticating: {
      title: "Authenticating",
      subtitle: "Connecting to your GitHub account...",
      icon: <Github className="h-12 w-12 text-primary animate-pulse" />
    },
    persisting: {
      title: "Saving Account",
      subtitle: "Creating your profile securely...",
      icon: <Database className="h-12 w-12 text-primary animate-pulse" />
    },
    forking: {
      title: "Setting Up Workspace",
      subtitle: "Forking repository and securely configuring your secrets. This may take a few seconds...",
      icon: <Key className="h-12 w-12 text-primary animate-bounce" />
    },
    done: {
      title: "All Set!",
      subtitle: "Taking you to your dashboard...",
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />
    },
    error: {
      title: "Authentication Failed",
      subtitle: errorMessage || "Something went wrong",
      icon: <AlertTriangle className="h-12 w-12 text-destructive" />
    },
  };

  const currentStatus = statusDetails[status];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-2xl transition-all duration-500 ease-in-out transform scale-100">
        <div className="mb-8 flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            {currentStatus.icon}
            {status !== "done" && status !== "error" && (
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            )}
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-card-foreground">
          {currentStatus.title}
        </h1>
        
        <p className="mb-8 text-sm text-muted-foreground">
          {currentStatus.subtitle}
        </p>

        {status !== "done" && status !== "error" && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all duration-500 ease-in-out animate-pulse" style={{ width: status === 'authenticating' ? '33%' : status === 'persisting' ? '66%' : '100%' }} />
          </div>
        )}

        {forkWarning && (
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-left text-sm text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span><strong>Repo setup warning:</strong> {forkWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
}
