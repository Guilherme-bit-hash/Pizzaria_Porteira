// src/components/BotoesFlutuantes.tsx
// ============================================================================
// BotoesFlutuantes - contêiner dos botões fixos no canto da tela (WhatsApp + carrinho).
// Usado em: App.tsx (renderizado uma vez, aparece em todas as páginas do site).
// Props: nenhuma.
// Estilos: styles/botoesFlutuantes.css.
// ============================================================================
import { useLocation } from 'react-router-dom'
import CarrinhoFlutuante from './CarrinhoFlutuante'
import WhatsAppFlutuante from './WhatsaapFlutuante'
import '../styles/botoesFlutuantes.css'

// Agrupa os botões flutuantes numa "sidebar" vertical ancorada no canto
// inferior direito, alinhados pela borda direita, em vez de cada um se
// posicionar sozinho e correr o risco de sobrepor o outro.
export default function BotoesFlutuantes() {
  // useLocation: hook do react-router que informa a URL atual (e re-renderiza ao mudar de página).
  const location = useLocation()

  // Na página de produtos (cardápio) o botão do WhatsApp só polui a lista de
  // categorias — ali fica só o carrinho.
  const esconderWhatsapp = location.pathname === '/cardapio'

  return (
    <div className="botoes-flutuantes">
      {/* WhatsApp: renderizado só quando não estamos no cardápio */}
      {!esconderWhatsapp && <WhatsAppFlutuante />}
      {/* Carrinho: sempre presente (ele mesmo decide se se esconde) */}
      <CarrinhoFlutuante />
    </div>
  )
}
