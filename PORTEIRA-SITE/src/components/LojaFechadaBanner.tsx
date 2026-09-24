// src/components/LojaFechadaBanner.tsx
// Aviso mostrado no Cardápio e no Pedido quando a loja está fechada (ver Pages/AdminDashboard.tsx
// para o botão que liga/desliga). Puramente informativo aqui — quem realmente bloqueia o pedido
// é o backend (POST /api/pedidos devolve 403 com a loja fechada); este banner só avisa antes.
import '../styles/lojaFechadaBanner.css'

export default function LojaFechadaBanner() {
  return (
    <div className="loja-fechada-banner">
      🔒 Estamos fechados no momento — você pode ver o cardápio, mas não é possível finalizar pedidos agora.
    </div>
  )
}
