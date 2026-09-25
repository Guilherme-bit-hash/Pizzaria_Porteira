// src/components/PorteiraTransicao.tsx
// ============================================================================
// PorteiraTransicao - as duas portas da "porteira" que cobrem a tela inteira.
// Usado em: Pages/Home.tsx (modo "fechar": as portas se fecham antes de ir ao cardápio) e
// Pages/Cardapio.tsx (modo "abrir": ao chegar, as portas se abrem revelando o cardápio).
// Props: modo - "fechar" ou "abrir"; onFim - chamado quando a animação termina.
// Estilos: styles/porteiraTransicao.css. É só visual (aria-hidden) e não captura cliques ao abrir.
// ============================================================================
import { useEffect, useRef } from 'react'
import '../styles/porteiraTransicao.css'

interface PorteiraTransicaoProps {
  modo: 'fechar' | 'abrir'
  onFim?: () => void
}

// Duração de cada animação em ms (mesmos valores do CSS, contando o pequeno atraso ao abrir).
const DURACAO_MS = { fechar: 550, abrir: 1000 }

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
      <div className="porteira__porta porteira__porta--esq" />
      <div className="porteira__porta porteira__porta--dir" />
    </div>
  )
}
