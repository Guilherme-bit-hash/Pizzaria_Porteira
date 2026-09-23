// src/vite-env.d.ts
// Arquivo de "declaração de tipos" (.d.ts): não gera código, só ensina o TypeScript
// sobre o que o Vite injeta em import.meta.env. Sem isso, o TypeScript reclamaria das variáveis abaixo.
/// <reference types="vite/client" />

// Variáveis de ambiente do frontend (definidas no arquivo .env; o Vite só expõe as que começam com VITE_).
interface ImportMetaEnv {
  // URL base do backend, usada por todos os arquivos de src/services (ex.: http://localhost:3001/api)
  readonly VITE_API_URL: string
  // Número de WhatsApp da pizzaria, lido em src/config/whatsapp.ts
  readonly VITE_WHATSAPP_NUMBER: string
}

// Diz que import.meta.env tem o formato descrito acima.
interface ImportMeta {
  readonly env: ImportMetaEnv
}
