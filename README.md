# MecDigital Front

Aplicação Next.js com consulta pública em `/` e painel em `/admin`.

## Local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Configure a URL da API e as duas variáveis públicas do Supabase. A anon key é pública por definição; nunca use a service role aqui.

## Verificação

```powershell
npm test
npm run typecheck
npm run build
npm audit
```

