// src/Pages/AdminClientes.tsx
// Painel de CLIENTES do administrador, servido na rota "/admin/clientes" (definida em App.tsx).
// Lista a base de clientes com busca, mostra o histórico de pedidos de cada um, permite registrar/remover
// o consentimento para promoções (LGPD) e exportar a lista em CSV.
// Backend: /api/clientes/* (via services/clienteService.ts), sempre com token de admin.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNav from '../components/AdminNav'
import { showToast } from '../components/Toast'
import { getAdminToken, limparAdminToken } from '../services/pedidoService'
import {
  atualizarConsentimento,
  baixarClientesCsv,
  detalharCliente,
  listarClientes,
  type Cliente,
  type ClienteDetalhado,
} from '../services/clienteService'
import '../styles/admin.css'

// Formatadores de exibição: valor em reais e data/hora no padrão brasileiro ("—" quando não há data).
const formatarMoeda = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`
const formatarData = (data: string | null) => (data ? new Date(data).toLocaleString('pt-BR') : '—')

// Monta o link que abre uma conversa no WhatsApp com o cliente.
// Telefones de 10/11 dígitos são nacionais; o wa.me precisa do código do país (55).
function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, '')
  const completo = digitos.length <= 11 ? `55${digitos}` : digitos
  return `https://wa.me/${completo}`
}

export default function AdminClientes() {
  const navigate = useNavigate()

  // Estados da lista: clientes retornados, filtros (texto e checkbox), carregamento e erro
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [somentePromocoes, setSomentePromocoes] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  // Cliente cujo histórico está aberto no momento (null = nenhum)
  const [aberto, setAberto] = useState<ClienteDetalhado | null>(null)

  // Tratamento comum de erros: token inválido -> volta ao login; outros -> mensagem na tela e toast.
  const tratarErro = useCallback(
    (error: unknown, mensagemPadrao: string) => {
      if (error instanceof Error && /token/i.test(error.message)) {
        limparAdminToken()
        navigate('/admin')
        return
      }
      const mensagem = error instanceof Error ? error.message : mensagemPadrao
      setErro(mensagem)
      showToast({ message: mensagem, type: 'error', emoji: '⚠️' })
    },
    [navigate]
  )

  // Busca a lista de clientes no backend usando os filtros atuais.
  // Como depende de "busca" e "somentePromocoes", ela é recriada quando os filtros mudam.
  const carregar = useCallback(async () => {
    try {
      setClientes(await listarClientes(busca, somentePromocoes))
      setErro('')
    } catch (error) {
      tratarErro(error, 'Erro ao carregar clientes.')
    } finally {
      setCarregando(false)
    }
  }, [busca, somentePromocoes, tratarErro])

  // Roda ao abrir a tela e sempre que os filtros mudam: exige login e recarrega a lista.
  // Espera o admin parar de digitar antes de consultar o backend
  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    // "Debounce": agenda a busca para 350ms depois; se o admin digitar de novo, o timer é cancelado
    const timer = setTimeout(carregar, 350)
    return () => clearTimeout(timer)
  }, [navigate, carregar])

  // Abre/fecha o histórico de um cliente (clicar de novo no mesmo fecha).
  const handleAbrir = async (cliente: Cliente) => {
    if (aberto?.id === cliente.id) {
      setAberto(null)
      return
    }
    try {
      // Busca os pedidos do cliente no backend
      setAberto(await detalharCliente(cliente.id))
    } catch (error) {
      tratarErro(error, 'Erro ao carregar o cliente.')
    }
  }

  // Liga/desliga o consentimento de promoções de um cliente e recarrega a lista.
  const handleConsentimento = async (cliente: Cliente, aceita: boolean) => {
    try {
      await atualizarConsentimento(cliente.id, aceita)
      showToast({
        message: aceita ? `${cliente.nome} agora aceita promoções.` : `${cliente.nome} não receberá promoções.`,
        type: 'success',
        emoji: '✅',
        duration: 2500,
      })
      setAberto(null)
      carregar()
    } catch (error) {
      tratarErro(error, 'Erro ao atualizar o consentimento.')
    }
  }

  // Baixa o CSV de clientes (respeitando o filtro "só quem aceita promoções").
  const handleExportar = async () => {
    try {
      await baixarClientesCsv(somentePromocoes)
    } catch (error) {
      tratarErro(error, 'Erro ao exportar clientes.')
    }
  }

  return (
    <div className="admin-page">
      {/* Cabeçalho com título e menu do admin */}
      <header className="admin-header">
        <h1 className="admin-header__titulo">👥 Clientes</h1>
        <AdminNav atual="clientes" />
      </header>

      <div className="admin-conteudo">
        {/* Cartão de filtros: busca por texto, checkbox de consentimento, contador e exportação */}
        <div className="admin-pedido-card">
          <div className="admin-form-grid">
            <div>
              <label className="admin-label">Buscar por nome, telefone ou e-mail</label>
              <input
                className="admin-input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex: Maria, 99999-1234, maria@..."
              />
            </div>
            <div className="admin-checkbox-campo">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={somentePromocoes}
                  onChange={(e) => setSomentePromocoes(e.target.checked)}
                />
                Só quem aceita receber promoções
              </label>
            </div>
          </div>
          <div className="admin-pedido-card__rodape">
            <span>{clientes.length} cliente(s)</span>
            <button onClick={handleExportar} className="admin-botao-avancar">
              ⬇️ Exportar CSV
            </button>
          </div>
        </div>

        {/* Mensagens de estado: erro, carregando e lista vazia */}
        {erro && <p className="admin-mensagem-erro">{erro}</p>}
        {carregando && <p className="admin-mensagem-neutra">Carregando clientes...</p>}
        {!carregando && clientes.length === 0 && !erro && (
          <p className="admin-mensagem-neutra">Nenhum cliente encontrado.</p>
        )}

        {/* Um cartão por cliente */}
        {clientes.map((cliente) => (
          <div key={cliente.id} className="admin-pedido-card">
            {/* Dados do cliente e selo de consentimento */}
            <div className="admin-pedido-card__topo">
              <div>
                <h3 className="admin-pedido-card__titulo">{cliente.nome}</h3>
                <p className="admin-pedido-card__info">
                  {cliente.telefone}
                  {cliente.email ? ` · ${cliente.email}` : ''}
                </p>
                <p className="admin-pedido-card__info">
                  {cliente.endereco}
                  {cliente.complemento ? ` (${cliente.complemento})` : ''}
                </p>
                <p className="admin-pedido-card__data">
                  {cliente.totalPedidos} pedido(s) · {formatarMoeda(cliente.totalGasto)} · último em{' '}
                  {formatarData(cliente.ultimoPedidoEm)}
                </p>
              </div>
              <span
                className={`admin-status-badge${cliente.aceitaPromocoes ? ' admin-status-badge--sucesso' : ''}`}
              >
                {cliente.aceitaPromocoes ? '✅ Aceita promoções' : '🚫 Sem consentimento'}
              </span>
            </div>

            {/* Ações: histórico, conversa no WhatsApp e alternar consentimento */}
            <div className="admin-pedido-card__acoes">
              <button onClick={() => handleAbrir(cliente)} className="admin-botao-secundario">
                {aberto?.id === cliente.id ? 'Fechar histórico' : 'Ver histórico'}
              </button>
              <a
                href={linkWhatsApp(cliente.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-botao-secundario"
              >
                💬 WhatsApp
              </a>
              <button
                onClick={() => handleConsentimento(cliente, !cliente.aceitaPromocoes)}
                className={cliente.aceitaPromocoes ? 'admin-botao-cancelar' : 'admin-botao-avancar'}
              >
                {cliente.aceitaPromocoes ? 'Remover consentimento' : 'Registrar consentimento'}
              </button>
            </div>

            {/* Histórico de pedidos: só aparece no cliente que está aberto */}
            {aberto?.id === cliente.id && (
              <ul className="admin-pedido-card__itens">
                {aberto.pedidos.length === 0 && <li>Nenhum pedido registrado.</li>}
                {aberto.pedidos.map((pedido) => (
                  <li key={pedido.id}>
                    #{pedido.id} · {formatarData(pedido.criado_em)} · {pedido.status.replace(/_/g, ' ')} ·{' '}
                    {formatarMoeda(Number(pedido.total))} —{' '}
                    {pedido.itens.map((item) => `${item.quantidade}x ${item.nome}`).join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
