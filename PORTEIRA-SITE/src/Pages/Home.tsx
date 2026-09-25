// src/Pages/Home.tsx
// Página inicial (landing page), servida na rota "/" (definida em App.tsx).
// Mostra a logo, frases de efeito e um botão que leva ao cardápio. Também dá para "abrir a
// porteira" deslizando/arrastando para cima, girando o mouse ou apertando a seta para baixo:
// a porteira sobe cobrindo a tela (PorteiraTransicao) e continua subindo no cardápio.
// Ao abrir, já começa a carregar o cardápio em segundo plano (prefetchCardapio).
// Estilos em src/styles/home.css.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PromocoesLandingToast from '../components/PromocoesLandingToast'
import PorteiraTransicao from '../components/PorteiraTransicao'
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
  const navigate = useNavigate()

  // "abrindo" = as portas estão se fechando antes de ir ao cardápio. O ref evita disparar
  // duas vezes (o gesto de rolar/deslizar gera vários eventos seguidos).
  const [abrindo, setAbrindo] = useState(false)
  const jaAbrindoRef = useRef(false)

  const abrirPorteira = useCallback(() => {
    if (jaAbrindoRef.current) return
    jaAbrindoRef.current = true
    // Quem pede menos movimento no sistema vai direto, sem a animação das portas.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/cardapio')
      return
    }
    setAbrindo(true)
  }, [navigate])

  // Quando a porteira termina de cobrir a tela, vai ao cardápio (onde ela continua subindo e sai).
  const irParaCardapio = useCallback(() => {
    navigate('/cardapio', { state: { abrirPorteira: true } })
  }, [navigate])

  // Gestos para abrir a porteira: deslizar/arrastar para cima, girar o mouse para baixo ou
  // apertar a seta para baixo. O botão "Ver Cardápio" continua sendo o caminho garantido.
  useEffect(() => {
    const DISTANCIA_MINIMA = 60
    let inicioY: number | null = null

    const aoTocar = (e: TouchEvent) => { inicioY = e.touches[0].clientY }
    const aoSoltarToque = (e: TouchEvent) => {
      if (inicioY !== null && inicioY - e.changedTouches[0].clientY > DISTANCIA_MINIMA) abrirPorteira()
      inicioY = null
    }
    const aoPressionarMouse = (e: MouseEvent) => { inicioY = e.clientY }
    const aoSoltarMouse = (e: MouseEvent) => {
      if (inicioY !== null && inicioY - e.clientY > DISTANCIA_MINIMA) abrirPorteira()
      inicioY = null
    }
    const aoRolar = (e: WheelEvent) => { if (e.deltaY > 20) abrirPorteira() }
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'PageDown') abrirPorteira() }
    // Sem isso, arrastar a partir de um link ou da imagem inicia o "arrastar e soltar" nativo do
    // navegador, que cancela o gesto (o mouseup nunca chega).
    const aoIniciarArrasto = (e: DragEvent) => e.preventDefault()

    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchend', aoSoltarToque, { passive: true })
    window.addEventListener('mousedown', aoPressionarMouse)
    window.addEventListener('mouseup', aoSoltarMouse)
    window.addEventListener('wheel', aoRolar, { passive: true })
    window.addEventListener('keydown', aoTeclar)
    window.addEventListener('dragstart', aoIniciarArrasto)
    return () => {
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchend', aoSoltarToque)
      window.removeEventListener('mousedown', aoPressionarMouse)
      window.removeEventListener('mouseup', aoSoltarMouse)
      window.removeEventListener('wheel', aoRolar)
      window.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('dragstart', aoIniciarArrasto)
    }
  }, [abrirPorteira])

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
    <main className={`home${abrindo ? ' home--abrindo' : ''}`}>
      {/* Aviso flutuante com as promoções da semana */}
      <PromocoesLandingToast />

      {/* PORTEIRA: aparece só durante a transição para o cardápio */}
      {abrindo && <PorteiraTransicao modo="fechar" onFim={irParaCardapio} />}

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
        <h1 className="home__titulo">Abriu a porteira, o aroma espalhou…</h1>
        <p className="home__subtitulo">Quem sentiu o cheirinho, na Porteira ficou!</p>
        <p key={indiceFrase} className="home__frase">
          {FRASES[indiceFrase]}
        </p>

        {/* BOTÃO COM LINK DO REACT ROUTER (navega para /cardapio sem recarregar a página) */}
        <Link
          to="/cardapio"
          className="home__botao"
          onClick={(e) => {
            // Clique normal: anima a porteira. Ctrl/Cmd/Shift ou botão do meio: comportamento padrão do link.
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
            e.preventDefault()
            abrirPorteira()
          }}
        >
          Ver Cardápio
        </Link>

        {/* TEXTO PULSANTE */}
        <div className="home__dica">
          ↑ Deslize para cima ou role para abrir a porteira ↑
        </div>
      </div>
    </main>
  )
}
