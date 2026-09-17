import { useEffect } from 'react'
import { useCarrinho } from '../contexts/CarrinhoContexts'
import { CUPOM_VALOR_MINIMO, jaFezPedido } from '../services/pedidoService'
import { showToast } from './Toast'

const SESSION_STORAGE_KEY = 'pizzaria-porteira:primeira-compra-toast-mostrado'

// Mostra um toast avisando sobre o desconto de primeira compra assim que o
// carrinho ultrapassa R$ 80, mas só para quem ainda nunca finalizou um pedido.
export default function PrimeiraCompraToast() {
  const { total, quantidadeTotal } = useCarrinho()

  useEffect(() => {
    if (quantidadeTotal === 0) return
    if (total < CUPOM_VALOR_MINIMO) return
    if (jaFezPedido()) return
    if (sessionStorage.getItem(SESSION_STORAGE_KEY)) return

    showToast({
      message: `🎁 Primeira Compra!\nUse o cupom BEMVINDO10 e ganhe 10% OFF neste pedido (compras acima de R$ ${CUPOM_VALOR_MINIMO.toFixed(2).replace('.', ',')}). Aplicado automaticamente no carrinho!`,
      type: 'promocao',
      emoji: '🎁',
      duration: 0,
    })

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
  }, [total, quantidadeTotal])

  return null
}
