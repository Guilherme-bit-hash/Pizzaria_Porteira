import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 cai numa faixa de portas reservada pelo Windows (Hyper-V/WSL) em algumas máquinas,
    // causando EACCES. 5273 fica fora dessas faixas reservadas.
    port: 5273,
    strictPort: true,
  },
})