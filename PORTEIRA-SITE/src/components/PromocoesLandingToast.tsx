import { useEffect } from 'react'
import { promocoesDestaque } from './bannerpromocoes'
import { showToast } from './Toast'

const SESSION_STORAGE_KEY = 'pizzaria-porteira:promocoes-landing-toast-mostrado'
const DURACOES_MS = [3000, 4000, 5000]

// Mostra as promoções em destaque como toasts empilhados na landing page,
// cada um com uma duração diferente (3s, 4s, 5s) — o efeito de sumirem em
// momentos distintos, um embaixo do outro, é o "legal" pedido.
export default function PromocoesLandingToast() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_STORAGE_KEY)) return

    promocoesDestaque.forEach((promocao, index) => {
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

  return null
}
