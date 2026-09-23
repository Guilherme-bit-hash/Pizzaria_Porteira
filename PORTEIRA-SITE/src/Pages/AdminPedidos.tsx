import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  atualizarStatusPedido,
  getAdminToken,
  limparAdminToken,
  listarPedidos,
  type Pedido,
  type StatusPedido,
} from '../services/pedidoService'
import { showToast } from '../components/Toast'
import AdminNav from '../components/AdminNav'
import '../styles/admin.css'

const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: '🆕 Recebido',
  preparando: '👨‍🍳 Preparando',
  saiu_para_entrega: '🛵 Saiu para entrega',
  entregue: '✅ Entregue',
  cancelado: '❌ Cancelado',
}

const PROXIMOS_STATUS: Record<StatusPedido, StatusPedido | null> = {
  recebido: 'preparando',
  preparando: 'saiu_para_entrega',
  saiu_para_entrega: 'entregue',
  entregue: null,
  cancelado: null,
}

function pagamentoBadge(pedido: Pedido) {
  if (pedido.forma_pagamento !== 'pix') return { texto: '💬 WhatsApp', classe: '' }

  switch (pedido.pagamento_status) {
    case 'aprovado':
      return { texto: '⚡ PIX pago', classe: 'admin-status-badge--sucesso' }
    case 'recusado':
      return { texto: '⚡ PIX recusado', classe: 'admin-status-badge--erro' }
    case 'expirado':
      return { texto: '⚡ PIX expirado', classe: 'admin-status-badge--erro' }
    default:
      return { texto: '⚡ PIX pendente', classe: 'admin-status-badge--alerta' }
  }
}

export default function AdminPedidos() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregarPedidos = useCallback(async () => {
    try {
      const dados = await listarPedidos()
      setPedidos(dados)
      setErro('')
    } catch (error) {
      if (error instanceof Error && /token/i.test(error.message)) {
        limparAdminToken()
        navigate('/admin')
        return
      }
      setErro(error instanceof Error ? error.message : 'Erro ao carregar pedidos.')
    } finally {
      setCarregando(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregarPedidos()
    const intervalo = setInterval(carregarPedidos, 15000)
    return () => clearInterval(intervalo)
  }, [navigate, carregarPedidos])

  const handleAvancarStatus = async (pedido: Pedido) => {
    const proximo = PROXIMOS_STATUS[pedido.status]
    if (!proximo) return
    try {
      await atualizarStatusPedido(pedido.id, proximo)
      carregarPedidos()
      showToast({
        message: `Pedido #${pedido.id} atualizado para "${STATUS_LABEL[proximo]}"`,
        type: 'success',
        emoji: '✅',
        duration: 2500,
      })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Erro ao atualizar status.',
        type: 'error',
        emoji: '⚠️',
      })
    }
  }

  const handleCancelar = async (pedido: Pedido) => {
    try {
      await atualizarStatusPedido(pedido.id, 'cancelado')
      carregarPedidos()
      showToast({
        message: `Pedido #${pedido.id} cancelado`,
        type: 'warning',
        emoji: '❌',
        duration: 2500,
      })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Erro ao cancelar pedido.',
        type: 'error',
        emoji: '⚠️',
      })
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header__titulo">📋 Pedidos</h1>
        <AdminNav atual="pedidos" />
      </header>

      <div className="admin-conteudo">
        {erro && <p className="admin-mensagem-erro">{erro}</p>}

        {carregando && <p className="admin-mensagem-neutra">Carregando pedidos...</p>}

        {!carregando && pedidos.length === 0 && !erro && (
          <p className="admin-mensagem-neutra">Nenhum pedido registrado ainda.</p>
        )}

        {pedidos.map((pedido) => (
          <div key={pedido.id} className="admin-pedido-card">
            <div className="admin-pedido-card__topo">
              <div>
                <h3 className="admin-pedido-card__titulo">
                  Pedido #{pedido.id} — {pedido.cliente_nome}
                </h3>
                <p className="admin-pedido-card__info">
                  {pedido.cliente_telefone} · {pedido.endereco}
                  {pedido.complemento ? ` (${pedido.complemento})` : ''}
                </p>
                <p className="admin-pedido-card__data">
                  {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="admin-pedido-card__badges">
                <span className="admin-status-badge">{STATUS_LABEL[pedido.status]}</span>
                <span className={`admin-status-badge ${pagamentoBadge(pedido).classe}`}>
                  {pagamentoBadge(pedido).texto}
                </span>
              </div>
            </div>

            <ul className="admin-pedido-card__itens">
              {pedido.itens.map((item, index) => (
                <li key={index}>
                  {item.quantidade}x {item.nome}
                  {item.observacoes ? ` — obs: ${item.observacoes}` : ''}
                </li>
              ))}
            </ul>

            {pedido.observacoes && (
              <p className="admin-pedido-card__observacoes">
                Observações do pedido: {pedido.observacoes}
              </p>
            )}

            <div className="admin-pedido-card__rodape">
              <strong className="admin-pedido-card__total">
                Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
              </strong>

              <div className="admin-pedido-card__acoes">
                {PROXIMOS_STATUS[pedido.status] && (
                  <button onClick={() => handleAvancarStatus(pedido)} className="admin-botao-avancar">
                    Avançar → {STATUS_LABEL[PROXIMOS_STATUS[pedido.status]!]}
                  </button>
                )}
                {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                  <button onClick={() => handleCancelar(pedido)} className="admin-botao-cancelar">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
