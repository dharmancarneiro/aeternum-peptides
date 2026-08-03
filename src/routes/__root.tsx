import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-card p-8 rounded-2xl">
        <h1 className="text-6xl font-serif gold-text">404</h1>
        <p className="mt-4 text-muted-foreground">Página não encontrada</p>
        <a href="/" className="mt-6 inline-block gold-gradient px-5 py-2 rounded-md font-semibold">Voltar</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card p-8 rounded-2xl max-w-md text-center">
        <h1 className="font-serif text-xl gold-text">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 gold-gradient px-5 py-2 rounded-md font-semibold">Tentar novamente</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ÆTERNUM Peptides" },
      { name: "description", content: "Sistema privado de gestão ÆTERNUM Peptides." },
      { property: "og:title", content: "ÆTERNUM Peptides" },
      { name: "twitter:title", content: "ÆTERNUM Peptides" },
      { property: "og:description", content: "Sistema privado de gestão ÆTERNUM Peptides." },
      { name: "twitter:description", content: "Sistema privado de gestão ÆTERNUM Peptides." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4f6f7e70-4fd7-4dc9-9520-40175261c136/id-preview-02c26868--09ee89bb-f60f-4e95-87c1-e46d2b9a839a.lovable.app-1779758766070.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4f6f7e70-4fd7-4dc9-9520-40175261c136/id-preview-02c26868--09ee89bb-f60f-4e95-87c1-e46d2b9a839a.lovable.app-1779758766070.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}
