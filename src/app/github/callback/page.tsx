"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Saving integration details...");

  useEffect(() => {
    const installationId = searchParams.get("installation_id");

    if (!installationId) {
      toast.error("No installation ID received from GitHub App.");
      router.replace("/dashboard");
      return;
    }

    const saveDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be signed in to save the integration.");
          router.replace("/");
          return;
        }

        // Update user metadata in Supabase
        const { error } = await supabase.auth.updateUser({
          data: {
            github_installation_id: installationId,
          },
        });

        if (error) throw error;

        toast.success("GitHub App installed successfully!");
        
        // Redirect to dashboard
        router.replace("/dashboard");
        
        // Force a page refresh to make sure AuthContext state is fully re-synchronized
        setTimeout(() => {
          window.location.reload();
        }, 150);
      } catch (err: any) {
        console.error("Error saving GitHub App installation:", err);
        toast.error(err.message || "Failed to save GitHub App installation.");
        router.replace("/dashboard");
      }
    };

    void saveDetails();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center space-y-4 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <p className="text-sm font-medium">{status}</p>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-medium">Loading callback...</p>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
