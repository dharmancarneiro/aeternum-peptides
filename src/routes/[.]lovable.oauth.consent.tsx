import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";

type OAuthResult = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_id?: string; redirect_uris?: string[] };
  scope?: string;
  scopes?: string[];
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Identificar sua conta",
  email: "Ver seu endereço de e-mail",
  profile: "Ver seu perfil básico",
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center px-4 text-center">
      <p className="max-w-md text-sm text-destructive">
        Não foi possível carregar esta solicitação de autorização:{" "}
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "aplicativo externo";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(" ") : []);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <AeternumLogo size={56} />
          <h1 className="text-lg font-semibold text-foreground">
            Conectar {clientName} à Aeternum Management Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Isso permite que {clientName} use este aplicativo como você.
          </p>
        </div>

        {details?.client?.redirect_uris?.[0] && (
          <p className="text-xs text-muted-foreground break-all">
            Redireciona para: {details.client.redirect_uris[0]}
          </p>
        )}

        {scopes.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground">
            {scopes.map((s: string) => (
              <li key={s}>• {SCOPE_LABELS[s] ?? `Permissão adicional solicitada: ${s}`}</li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Isso não ignora as permissões deste aplicativo nem as regras de acesso do banco de dados.
        </p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? "Aguarde…" : "Aprovar"}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancelar conexão
          </Button>
        </div>
      </div>
    </main>
  );
}
