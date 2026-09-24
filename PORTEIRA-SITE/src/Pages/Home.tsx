// src/Pages/Home.tsx
// Página inicial (landing page), servida na rota "/" (definida em App.tsx).
// Mostra a logo, frases de efeito e um botão que leva ao cardápio. Ao abrir, já começa a
// carregar o cardápio em segundo plano (prefetchCardapio) para ele abrir instantâneo.
// Estilos em src/styles/home.css.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PromocoesLandingToast from '../components/PromocoesLandingToast'
import { prefetchCardapio } from '../services/produtoService'
import '../styles/home.css'

// Frases de efeito que se revezam abaixo do título (uma a cada 3,5 segundos).
const FRASES = [
  'Massa artesanal, feita todo dia 🍕',
  'Cada fatia, um pedacinho de felicidade',
  'Quentinha do forno até a sua porta 🛵',
  'O sabor que conquista de primeira',
  'Bateu a fome? A gente resolve! 😋',
]

// Componente da página. "export default" permite que App.tsx importe com qualquer nome.
export default function Home() {
  // Índice da frase exibida agora; o setInterval avança para a próxima em ciclo.
  const [indiceFrase, setIndiceFrase] = useState(0)

  // Ao abrir a landing page, adianta o carregamento do cardápio (enquanto o cliente lê e clica).
  useEffect(() => {
    prefetchCardapio()
  }, [])

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceFrase((atual) => (atual + 1) % FRASES.length)
    }, 3500)
    // Limpeza: para o relógio ao sair da página
    return () => clearInterval(intervalo)
  }, [])

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

        {/* TÍTULO E FRASE DE EFEITO (a `key` faz a frase reanimar o fade a cada troca) */}
        <h1 className="home__titulo">O sabor que vem da porteira</h1>
        <p key={indiceFrase} className="home__frase">
          {FRASES[indiceFrase]}
        </p>

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
