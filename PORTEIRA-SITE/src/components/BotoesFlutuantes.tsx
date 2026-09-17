// src/components/BotoesFlutuantes.tsx
import { useLocation } from 'react-router-dom'
import CarrinhoFlutuante from './CarrinhoFlutuante'
import WhatsAppFlutuante from './WhatsaapFlutuante'
import '../styles/botoesFlutuantes.css'

// Agrupa os botões flutuantes numa "sidebar" vertical ancorada no canto
// inferior direito, alinhados pela borda direita, em vez de cada um se
// posicionar sozinho e correr o risco de sobrepor o outro.
export default function BotoesFlutuantes() {
  const location = useLocation()

  // Na página de produtos (cardápio) o botão do WhatsApp só polui a lista de
  // categorias — ali fica só o carrinho.
  const esconderWhatsapp = location.pathname === '/cardapio'

  return (
    <div className="botoes-flutuantes">
      {!esconderWhatsapp && <WhatsAppFlutuante />}
      <CarrinhoFlutuante />
    </div>
  )
}
