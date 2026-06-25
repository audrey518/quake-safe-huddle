import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, User, ShieldCheck, Briefcase, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeoSafeLogo } from "@/components/geosafe-logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sign in — GeoSafe AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"local" | "professional">("local");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox.");
        setMode("signin");
      } else if (mode === "signup") {
        if (role === "professional" && !licenseNumber.trim()) {
          toast.error("Engineering professional licence number is required");
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName.trim() || cleanEmail.split("@")[0],
              role,
              license_number: role === "professional" ? licenseNumber.trim() : "",
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          if (signInError) throw signInError;
        }
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
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
          <GeoSafeLogo />
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight text-lg">GeoSafe AI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Geo-risk awareness</div>
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
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Join GeoSafe AI" : "Reset your password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to monitor your community."
              : mode === "signup"
              ? "Create your account, then sign in with the same email and password."
              : "Enter your email and we'll send you a link to set a new password."}
          </p>

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {mode === "signup" && (
              <Input icon={<User className="h-4 w-4" />} placeholder="Display name" value={displayName} onChange={setDisplayName} />
            )}
            <Input icon={<Mail className="h-4 w-4" />} type="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
            {mode !== "forgot" && (
              <Input icon={<Lock className="h-4 w-4" />} type="password" placeholder="Password (min 6 chars)" value={password} onChange={setPassword} required minLength={6} />
            )}

            {mode === "signup" && (
              <>
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
                {role === "professional" && (
                  <Input
                    icon={<IdCard className="h-4 w-4" />}
                    placeholder="Engineering licence number *"
                    value={licenseNumber}
                    onChange={setLicenseNumber}
                    required
                  />
                )}
              </>
            )}

            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                ? "Create account"
                : "Send reset link"}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            )}
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
