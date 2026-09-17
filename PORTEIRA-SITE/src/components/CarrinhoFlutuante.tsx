// src/components/CarrinhoFlutuante.tsx - VERSÃO MODIFICADA
import { Link, useLocation } from 'react-router-dom'
import { useCarrinho } from '../contexts/CarrinhoContexts'
import '../styles/carrinhoFlutuante.css'

export default function CarrinhoFlutuante() {
  const { quantidadeTotal, total } = useCarrinho()
  const location = useLocation()

  // Não mostrar o botão flutuante na landing page nem na própria página do carrinho
  if (location.pathname === '/' || location.pathname === '/pedido') return null

  const vazio = quantidadeTotal === 0

  return (
    <Link
      to="/pedido"
      className={`carrinho-flutuante${vazio ? ' carrinho-flutuante--vazio' : ''}`}
      title="Ver carrinho de compras"
    >
      <div className="carrinho-flutuante__icone-wrapper">
        🛒
        {quantidadeTotal > 0 && (
          <span className="carrinho-flutuante__badge">{quantidadeTotal}</span>
        )}
      </div>
      <span className="carrinho-flutuante__texto">Ver Carrinho</span>
      {quantidadeTotal > 0 ? (
        <span className="carrinho-flutuante__preco">
          R$ {total.toFixed(2).replace('.', ',')}
        </span>
      ) : (
        <span className="carrinho-flutuante__vazio-tag">Vazio</span>
      )}
    </Link>
  )
}
