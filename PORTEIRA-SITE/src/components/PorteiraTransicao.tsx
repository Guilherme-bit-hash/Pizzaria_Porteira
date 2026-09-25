// src/components/PorteiraTransicao.tsx
// ============================================================================
// PorteiraTransicao - a "porteira" de madeira que sobe de baixo para cima cobrindo a tela.
// Usado em: Pages/Home.tsx (modo "fechar": a porteira sobe e cobre a landing page) e
// Pages/Cardapio.tsx (modo "abrir": ao chegar, ela continua subindo e sai pelo topo,
// revelando o cardápio). Os dois modos formam um único movimento contínuo para cima,
// combinando com o gesto de deslizar para cima da landing page.
// Props: modo - "fechar" ou "abrir"; onFim - chamado quando a animação termina.
// Estilos: styles/porteiraTransicao.css. É só visual (aria-hidden) e não captura cliques ao abrir.
// ============================================================================
import { useEffect, useRef } from 'react'
import '../styles/porteiraTransicao.css'

interface PorteiraTransicaoProps {
  modo: 'fechar' | 'abrir'
  onFim?: () => void
}

// Duração de cada animação em ms (mesmos valores do CSS; ao abrir, inclui o atraso inicial).
const DURACAO_MS = { fechar: 650, abrir: 1200 }

export default function PorteiraTransicao({ modo, onFim }: PorteiraTransicaoProps) {
  // Guarda a função mais recente sem reiniciar o cronômetro quando o pai é redesenhado.
  const onFimRef = useRef(onFim)
  onFimRef.current = onFim

  useEffect(() => {
    const cronometro = setTimeout(() => onFimRef.current?.(), DURACAO_MS[modo])
    return () => clearTimeout(cronometro)
  }, [modo])

  return (
    <div className={`porteira porteira--${modo}`} aria-hidden="true">
      <div className="porteira__painel">
        {/* Emblema no centro: a logo com brilho dourado e a frase da transição */}
        <img src="/logo.jpeg" alt="" className="porteira__logo" />
        <p className="porteira__texto">Abrindo a porteira…</p>
      </div>
    </div>
  )
}
