"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { getSiteUrl, hasSupabaseBrowserEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { GlassPanel } from "@/components/ui/glass-panel";

export function LoginPanel() {
  if (!hasSupabaseBrowserEnv()) {
    return (
      <GlassPanel className="p-5">
        <div className="flex gap-3 text-sm text-zinc-700">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-zinc-500" />
          <div>
            <p className="font-semibold text-zinc-950">Supabase keys needed</p>
            <p className="mt-1 leading-6">
              Fill `web/.env.local` with the deployed Supabase project URL and
              anon key to enable Apple, Google, and email sign-in.
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  }

  return <ConfiguredLoginPanel />;
}

function ConfiguredLoginPanel() {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = "/home";
      }
    });
  }, [supabase.auth]);

  return (
    <GlassPanel className="p-4">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#18181b",
                brandAccent: "#3f3f46",
              },
              radii: {
                borderRadiusButton: "999px",
                inputBorderRadius: "16px",
              },
            },
          },
        }}
        localization={{
          variables: {
            sign_in: {
              email_label: "Email",
              password_label: "Password",
              button_label: "Sign in",
            },
          },
        }}
        providers={["google"]}
        redirectTo={`${getSiteUrl()}/auth/callback?next=/onboarding`}
        view="sign_in"
      />
    </GlassPanel>
  );
}
