// ============================================================================
// PromocoesLandingToast - componente "invisível" que dispara os toasts de
// promoções em destaque ao abrir a landing page.
// Usado em: Pages/Home.tsx.
// Props: nenhuma. Sem CSS próprio (o visual vem de Toast / styles/toast.css).
// ============================================================================
import { useEffect } from 'react'
import { promocoesDestaque } from './bannerpromocoes'
import { showToast } from './Toast'

// Chave do sessionStorage para mostrar os toasts uma única vez por sessão.
const SESSION_STORAGE_KEY = 'pizzaria-porteira:promocoes-landing-toast-mostrado'
// Tempo de exibição (ms) de cada toast, na ordem em que são criados.
const DURACOES_MS = [3000, 4000, 5000]

// Mostra as promoções em destaque como toasts empilhados na landing page,
// cada um com uma duração diferente (3s, 4s, 5s) — o efeito de sumirem em
// momentos distintos, um embaixo do outro, é o "legal" pedido.
export default function PromocoesLandingToast() {
  // useEffect com lista vazia `[]`: roda uma única vez, quando o componente aparece na tela.
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_STORAGE_KEY)) return

    promocoesDestaque.forEach((promocao, index) => {
      // O título começa com um emoji: separamos a 1ª palavra (emoji) do resto do texto.
      const [emoji, ...resto] = promocao.titulo.split(' ')
      const titulo = resto.join(' ')

      showToast({
        message: promocao.codigo
          ? `${titulo}\n${promocao.descricao} — cupom ${promocao.codigo}`
          : `${titulo}\n${promocao.descricao}`,
        type: 'promocao',
        emoji,
        duration: DURACOES_MS[index] ?? 4000,
      })
    })

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
  }, [])

  // Não desenha nada.
  return null
}
