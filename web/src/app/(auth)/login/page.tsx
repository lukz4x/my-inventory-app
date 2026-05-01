import { LoginPanel } from "@/features/auth/login-panel";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#7BA88655,transparent_32%),radial-gradient(circle_at_bottom_right,#7B9AA855,transparent_28%),#f4f1ec] px-4 py-8 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center gap-6">
        <div>
          <p className="text-sm font-semibold text-zinc-600">MyInventoryApp</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Find anything you own in seconds.
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-700">
            Sign in to start building your household map of spaces, photos, and
            items.
          </p>
        </div>
        <LoginPanel />
      </div>
    </main>
  );
}
