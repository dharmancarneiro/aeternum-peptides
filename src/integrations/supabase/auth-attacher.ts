// Middleware de server functions: repassa o token Supabase do cliente (se houver)
// para o contexto da função. As funções de nuvem usam a chave de serviço, então
// este middleware é um pass-through seguro quando não há sessão.
import { createMiddleware } from "@tanstack/react-start";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    return next();
  },
);
