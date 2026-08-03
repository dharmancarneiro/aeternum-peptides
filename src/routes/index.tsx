import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AeternumLogo } from "@/components/AeternumLogo";
import { setRole } from "@/lib/storage";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ÆTERNUM Peptides — Acesso" },
      { name: "description", content: "Sistema de gestão de peptídeos ÆTERNUM." },
    ],
  }),
  component: Login,
});

function Login() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pass = password.trim();
    if (pass === "AeternumPeps$") {
      setRole("admin");
      toast.success("Acesso administrativo concedido");
      navigate({ to: "/admin" });
    } else if (pass === "DharmanPeps$") {
      setRole("user");
      toast.success("Bem-vindo, Dharman");
      navigate({ to: "/user" });
    } else if (pass === "MarcoPeps$") {
      setRole("marco");
      toast.success("Bem-vindo, Marco");
      navigate({ to: "/marco" });
    } else {
      toast.error("Senha incorreta");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 dna-pattern">
      <Toaster theme="dark" />
      <div className="glass-card rounded-2xl p-10 w-full max-w-md flex flex-col items-center gap-6">
        <AeternumLogo size={140} />
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold gold-text tracking-wider">ÆTERNUM</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Peptides</p>
        </div>
        <form onSubmit={submit} className="w-full space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              type="password"
              placeholder="Senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-input border-primary/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full h-12 gold-gradient font-semibold tracking-wide hover:gold-glow transition-all">
            ENTRAR
          </Button>
        </form>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Sistema Privado · Acesso Restrito
        </p>
      </div>
    </div>
  );
}
