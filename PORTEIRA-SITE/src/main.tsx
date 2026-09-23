// src/main.tsx
// PONTO DE ENTRADA do frontend. É o primeiro arquivo TypeScript executado no navegador:
// o index.html (na raiz de PORTEIRA-SITE) tem um <div id="root"> e carrega este arquivo.
// Aqui o React é "plugado" nessa div e passa a desenhar todo o site a partir do componente App.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// createRoot cria a raiz do React dentro da div #root; render() desenha o App nela.
// O "!" avisa ao TypeScript que a div existe com certeza.
// StrictMode é um modo de desenvolvimento que ajuda a achar bugs (ex.: executa effects duas vezes).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
