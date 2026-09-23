import { useNavigate } from 'react-router-dom'
import { limparAdminToken } from '../services/pedidoService'

type SecaoAdmin = 'pedidos' | 'produtos' | 'clientes' | 'promocoes' | 'campanhas'

const SECOES: { id: SecaoAdmin; rotulo: string; rota: string }[] = [
  { id: 'pedidos', rotulo: '📋 Pedidos', rota: '/admin/pedidos' },
  { id: 'produtos', rotulo: '🍕 Cardápio', rota: '/admin/produtos' },
  { id: 'clientes', rotulo: '👥 Clientes', rota: '/admin/clientes' },
  { id: 'promocoes', rotulo: '🎯 Promoções', rota: '/admin/promocoes' },
  { id: 'campanhas', rotulo: '📧 Campanhas', rota: '/admin/campanhas' },
]

// Botões de navegação do painel admin: mostra todas as seções, menos a que está aberta.
export default function AdminNav({ atual }: { atual: SecaoAdmin }) {
  const navigate = useNavigate()

  const handleSair = () => {
    limparAdminToken()
    navigate('/admin')
  }

  return (
    <div className="admin-header__acoes">
      {SECOES.filter((secao) => secao.id !== atual).map((secao) => (
        <button key={secao.id} onClick={() => navigate(secao.rota)} className="admin-botao-secundario">
          {secao.rotulo}
        </button>
      ))}
      <button onClick={handleSair} className="admin-botao-perigo">
        Sair
      </button>
    </div>
  )
}
