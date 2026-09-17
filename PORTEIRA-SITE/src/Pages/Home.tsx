// src/Pages/Home.tsx - LANDING PAGE
import { Link } from 'react-router-dom'
import PromocoesLandingToast from '../components/PromocoesLandingToast'
import '../styles/home.css'

export default function Home() {
  return (
    <main className="home">
      <PromocoesLandingToast />

      {/* OVERLAY ESCURO */}
      <div className="home__overlay" />

      {/* CONTEÚDO */}
      <div className="home__conteudo">
        {/* LOGO */}
        <img
          src="/logo.jpeg"
          alt="Logo Pizzaria Porteira"
          className="home__logo"
        />

        {/* BOTÃO COM LINK DO REACT ROUTER */}
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
