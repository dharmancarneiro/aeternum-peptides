import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function sanitizeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: sanitizeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Acesso à conta | ÆTERNUM Peptides" },
      {
        name: "description",
        content:
          "Entre com sua conta ÆTERNUM Peptides para autorizar integrações de agentes e assistentes de IA.",
      },
      { property: "og:title", content: "Acesso à conta | ÆTERNUM Peptides" },
      {
        property: "og:description",
        content: "Autenticação da suíte de gestão ÆTERNUM Peptides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) {
        return setInfo("Conta criada. Confirme o e-mail enviado para concluir o acesso.");
      }
      await supabase.rpc("claim_mcp_access");
      window.location.replace(next);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) return setError(error.message);
    await supabase.rpc("claim_mcp_access");
    window.location.replace(next);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <AeternumLogo size={56} />
          <h1 className="text-xl font-semibold text-foreground">
            {mode === "signin" ? "Entrar na conta" : "Criar conta"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Necessário para autorizar integrações de agentes (MCP).
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            className="text-muted-foreground underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin" ? "Criar uma conta" : "Já tenho conta"}
          </button>
          <button
            type="button"
            className="text-muted-foreground underline"
            onClick={() => navigate({ to: "/" })}
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    </main>
  );
}
