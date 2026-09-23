// ============================================================================
// AdminNav - barra de navegação do painel administrativo.
// Usado em: Pages/AdminPedidos, AdminProdutos, AdminClientes, AdminPromocoes e
// AdminCampanhas (todas as telas do admin, menos o login).
// Props: `atual` - qual seção está aberta (ela some da lista de botões).
// Estilos: styles/admin.css (classes `admin-header__acoes`, `admin-botao-*`).
// ============================================================================
import { useNavigate } from 'react-router-dom'
import { limparAdminToken } from '../services/pedidoService'

// Nomes válidos de seção: o TypeScript recusa qualquer outro texto em `atual`.
type SecaoAdmin = 'pedidos' | 'produtos' | 'clientes' | 'promocoes' | 'campanhas'

// Lista das seções do admin: id (para comparar com `atual`), texto do botão e rota.
// Para criar uma nova seção no menu, basta incluir mais uma linha aqui.
const SECOES: { id: SecaoAdmin; rotulo: string; rota: string }[] = [
  { id: 'pedidos', rotulo: '📋 Pedidos', rota: '/admin/pedidos' },
  { id: 'produtos', rotulo: '🍕 Cardápio', rota: '/admin/produtos' },
  { id: 'clientes', rotulo: '👥 Clientes', rota: '/admin/clientes' },
  { id: 'promocoes', rotulo: '🎯 Promoções', rota: '/admin/promocoes' },
  { id: 'campanhas', rotulo: '📧 Campanhas', rota: '/admin/campanhas' },
]

// Botões de navegação do painel admin: mostra todas as seções, menos a que está aberta.
// `props` são os parâmetros que o componente pai passa; aqui só recebemos `atual`.
export default function AdminNav({ atual }: { atual: SecaoAdmin }) {
  // useNavigate: hook do react-router que devolve uma função para trocar de página via código.
  const navigate = useNavigate()

  // Handler do botão "Sair": apaga o token de login do admin e volta para a tela de login.
  const handleSair = () => {
    limparAdminToken()
    navigate('/admin')
  }

  return (
    <div className="admin-header__acoes">
      {/* Um botão por seção (exceto a atual); `key` ajuda o React a identificar cada item da lista */}
      {SECOES.filter((secao) => secao.id !== atual).map((secao) => (
        <button key={secao.id} onClick={() => navigate(secao.rota)} className="admin-botao-secundario">
          {secao.rotulo}
        </button>
      ))}
      {/* Botão de logout */}
      <button onClick={handleSair} className="admin-botao-perigo">
        Sair
      </button>
    </div>
  )
}
