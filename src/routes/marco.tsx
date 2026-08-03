import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AeternumLogo } from "@/components/AeternumLogo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { clearRole, getRole } from "@/lib/storage";
import { LogOut } from "lucide-react";
import { MarcoTab } from "./admin";

export const Route = createFileRoute("/marco")({
  ssr: false,
  component: MarcoPanel,
});

function MarcoPanel() {
  const navigate = useNavigate();
  useEffect(() => {
    if (getRole() !== "marco") navigate({ to: "/" });
  }, [navigate]);

  const logout = () => { clearRole(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen dna-pattern pb-20">
      <Toaster theme="dark" />

      <header className="border-b border-primary/20 bg-background/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AeternumLogo size={48} glow={false} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ÆTERNUM Peptides</p>
              <h1 className="text-lg font-serif font-bold gold-text">Painel Marco Túlio</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="border-primary/40">
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <MarcoTab />
      </main>
    </div>
  );
}
