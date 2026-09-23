// src/components/CarrinhoFlutuante.tsx - VERSÃO MODIFICADA
// ============================================================================
// CarrinhoFlutuante - botão "Ver Carrinho" com contador de itens e total em R$.
// Usado em: BotoesFlutuantes.tsx (que fica no App.tsx, logo aparece em todo o site).
// Props: nenhuma - os dados vêm do contexto do carrinho (useCarrinho).
// Estilos: styles/carrinhoFlutuante.css.
// ============================================================================
import { Link, useLocation } from 'react-router-dom'
import { useCarrinho } from '../contexts/CarrinhoContexts'
import '../styles/carrinhoFlutuante.css'

export default function CarrinhoFlutuante() {
  // Context: estado global compartilhado entre componentes; aqui lemos a quantidade e o total do carrinho.
  const { quantidadeTotal, total } = useCarrinho()
  const location = useLocation()

  // Não mostrar o botão flutuante na landing page nem na própria página do carrinho
  if (location.pathname === '/' || location.pathname === '/pedido') return null

  // Flag para aplicar o modificador visual "vazio" (botão mais discreto).
  const vazio = quantidadeTotal === 0

  return (
    // Link do react-router: navega para /pedido sem recarregar a página
    <Link
      to="/pedido"
      className={`carrinho-flutuante${vazio ? ' carrinho-flutuante--vazio' : ''}`}
      title="Ver carrinho de compras"
    >
      {/* Ícone do carrinho + bolinha com a quantidade (só se houver itens) */}
      <div className="carrinho-flutuante__icone-wrapper">
        🛒
        {quantidadeTotal > 0 && (
          <span className="carrinho-flutuante__badge">{quantidadeTotal}</span>
        )}
      </div>
      {/* Texto fixo do botão */}
      <span className="carrinho-flutuante__texto">Ver Carrinho</span>
      {/* Preço total formatado em pt-BR, ou etiqueta "Vazio" */}
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
