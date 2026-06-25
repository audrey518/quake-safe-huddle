import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeoSafeLogo } from "@/components/geosafe-logo";
import { selectOnFocus } from "@/components/safeground/ui";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — GeoSafe AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery hash and creates a session.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Reset link is invalid or expired. Request a new one.");
        router.navigate({ to: "/auth", replace: true });
      } else {
        setReady(true);
      }
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      router.navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <GeoSafeLogo />
          <div className="font-display font-semibold tracking-tight">GeoSafe AI</div>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose something you haven't used before.</p>

        <form onFocusCapture={selectOnFocus} className="mt-6 space-y-3" onSubmit={onSubmit}>
          <Input icon={<Lock className="h-4 w-4" />} placeholder="New password" value={password} onChange={setPassword} />
          <Input icon={<Lock className="h-4 w-4" />} placeholder="Confirm new password" value={confirm} onChange={setConfirm} />
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ icon, placeholder, value, onChange }: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={6}
        className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
