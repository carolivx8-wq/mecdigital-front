# ARCHITECTURE — MecDigital Front

**Fonte:** análise direta do código
**Data:** 2026-07-18

Next.js App Router estático com rotas `/`, `/admin` e `/acessibilidade`. Componentes client-side consomem somente a API HTTP; Supabase JS é usado apenas para sessão do administrador. Estado permanece local. Gates: `npm test`, `npm run typecheck`, `npm run build` e `npm audit`.
