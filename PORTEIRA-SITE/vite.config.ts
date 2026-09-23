// vite.config.ts
// Configuração do Vite, a ferramenta que roda o servidor de desenvolvimento (npm run dev)
// e gera a versão final do site (npm run build).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Plugin que ensina o Vite a entender React/JSX
  plugins: [react()],
  server: {
    // 5173 cai numa faixa de portas reservada pelo Windows (Hyper-V/WSL) em algumas máquinas,
    // causando EACCES. 5273 fica fora dessas faixas reservadas.
    port: 5273,
    // Se a porta estiver ocupada, falha em vez de escolher outra (o site sempre abre em localhost:5273)
    strictPort: true,
  },
})
