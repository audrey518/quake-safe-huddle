import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layers, Mail, Lock, User, ShieldCheck, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sign in — SafeGround" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"local" | "professional">("local");
  const [busy, setBusy] = useState(false);

  // Listen for sign-in then redirect
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0], role },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-primary/15 via-accent/30 to-background p-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight text-lg">SafeGround</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Disaster awareness</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Understand the ground beneath your community.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Live earthquake feeds, neighborhood hazard reports, well water levels and soil
            information — together in one calm, minimalist dashboard.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> USGS real-time monitoring</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Community hazard reporting</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Groundwater + soil layers</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Community awareness — not engineering advice.</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1 text-xs">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full transition ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Join SafeGround"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to monitor your community." : "Pick your role to get started."}
          </p>

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {mode === "signup" && (
              <Input icon={<User className="h-4 w-4" />} placeholder="Display name" value={displayName} onChange={setDisplayName} />
            )}
            <Input icon={<Mail className="h-4 w-4" />} type="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
            <Input icon={<Lock className="h-4 w-4" />} type="password" placeholder="Password (min 6 chars)" value={password} onChange={setPassword} required minLength={6} />

            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <RoleCard
                  active={role === "local"}
                  onClick={() => setRole("local")}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Local resident"
                  hint="View, report, register wells"
                />
                <RoleCard
                  active={role === "professional"}
                  onClick={() => setRole("professional")}
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Professional"
                  hint="Submit soil assessments"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({ icon, type = "text", placeholder, value, onChange, required, minLength }: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function RoleCard({ active, onClick, icon, label, hint }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-md border p-3 transition ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
      }`}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {icon} {label}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </button>
  );
}
