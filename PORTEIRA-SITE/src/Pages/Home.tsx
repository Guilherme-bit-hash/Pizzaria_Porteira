// src/Pages/Home.tsx
// Página inicial (landing page), servida na rota "/" (definida em App.tsx).
// Só mostra a logo e um botão que leva ao cardápio; não usa estado nem chama o backend.
// Estilos em src/styles/home.css.
import { Link } from 'react-router-dom'
import PromocoesLandingToast from '../components/PromocoesLandingToast'
import '../styles/home.css'

// Componente da página. "export default" permite que App.tsx importe com qualquer nome.
export default function Home() {
  return (
    <main className="home">
      {/* Aviso flutuante com as promoções da semana */}
      <PromocoesLandingToast />

      {/* OVERLAY ESCURO (camada sobre a imagem de fundo, para dar contraste ao texto) */}
      <div className="home__overlay" />

      {/* CONTEÚDO */}
      <div className="home__conteudo">
        {/* LOGO (arquivo em PORTEIRA-SITE/public/logo.jpeg) */}
        <img
          src="/logo.jpeg"
          alt="Logo Pizzaria Porteira"
          className="home__logo"
        />

        {/* BOTÃO COM LINK DO REACT ROUTER (navega para /cardapio sem recarregar a página) */}
        <Link to="/cardapio" className="home__botao">
          Ver Cardápio
        </Link>

        {/* TEXTO PULSANTE */}
        <div className="home__dica">
          ↓ Clique para explorar nosso cardápio ↓
        </div>
      </div>
    </main>
  )
}
