// src/Pages/AdminPedidos.tsx
// Painel de PEDIDOS do administrador, servido na rota "/admin/pedidos" (definida em App.tsx).
// Lista os pedidos, permite avançar o status (recebido -> preparando -> entrega -> entregue) ou cancelar.
// Backend: GET /api/pedidos e PATCH /api/pedidos/:id/status (via services/pedidoService.ts), com token de admin.
// A lista é atualizada sozinha a cada 15 segundos.
import { useEffect, useState, useCallback, useRef } from 'react'
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
import { tocarSomNovoPedido } from '../utils/somPedido'
import '../styles/admin.css'

// Texto amigável (com emoji) exibido para cada status do pedido.
const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: '🆕 Recebido',
  preparando: '👨‍🍳 Preparando',
  saiu_para_entrega: '🛵 Saiu para entrega',
  entregue: '✅ Entregue',
  cancelado: '❌ Cancelado',
}

// Fluxo do pedido: para cada status, qual é o próximo (null = fim do fluxo, sem botão de avançar).
const PROXIMOS_STATUS: Record<StatusPedido, StatusPedido | null> = {
  recebido: 'preparando',
  preparando: 'saiu_para_entrega',
  saiu_para_entrega: 'entregue',
  entregue: null,
  cancelado: null,
}

// Decide o texto e a cor (classe CSS) do selo de pagamento de um pedido.
// Pedidos via WhatsApp não têm status de pagamento; pedidos PIX mostram pago/recusado/expirado/pendente.
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

  // Estados da tela: lista de pedidos, indicador de carregamento inicial e mensagem de erro
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // IDs de pedidos já vistos numa busca anterior, para detectar quais são novos a cada
  // polling. `null` = ainda não carregou pela primeira vez — usado pra NÃO tocar o som
  // nem notificar para os pedidos que já existiam quando a tela abriu, só para os que
  // chegarem depois. useRef (em vez de useState) porque essa informação não deve, sozinha,
  // causar um redesenho da tela.
  const idsConhecidosRef = useRef<Set<number> | null>(null)

  // Busca os pedidos no backend e atualiza a tela.
  // useCallback mantém a mesma função entre renderizações (só recria se "navigate" mudar),
  // o que evita que o useEffect abaixo seja reexecutado sem necessidade.
  const carregarPedidos = useCallback(async () => {
    try {
      const dados = await listarPedidos()
      setPedidos(dados)
      setErro('')

      // Compara com a busca anterior: qualquer id que não estava lá é um pedido novo.
      const idsAtuais = new Set(dados.map((pedido) => pedido.id))
      if (idsConhecidosRef.current) {
        const pedidosNovos = dados.filter((pedido) => !idsConhecidosRef.current!.has(pedido.id))
        if (pedidosNovos.length > 0) {
          tocarSomNovoPedido()
          pedidosNovos.forEach((pedido) => {
            showToast({
              message: `Novo pedido #${pedido.id} — ${pedido.cliente_nome}!`,
              type: 'success',
              emoji: '🔔',
              duration: 5000,
            })
          })
        }
      }
      idsConhecidosRef.current = idsAtuais
    } catch (error) {
      // Token inválido/expirado: apaga o token e volta para o login
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

  // Roda ao abrir a tela: sem token de admin manda para o login; com token carrega os pedidos
  // e agenda uma nova busca a cada 15s (polling) para pedidos novos aparecerem sozinhos.
  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregarPedidos()
    const intervalo = setInterval(carregarPedidos, 15000)
    // Limpeza: para o polling ao sair da tela
    return () => clearInterval(intervalo)
  }, [navigate, carregarPedidos])

  // Clique em "Avançar": move o pedido para a próxima etapa do fluxo.
  const handleAvancarStatus = async (pedido: Pedido) => {
    const proximo = PROXIMOS_STATUS[pedido.status]
    if (!proximo) return
    try {
      await atualizarStatusPedido(pedido.id, proximo)
      // Recarrega a lista para refletir a mudança
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

  // Clique em "Cancelar": marca o pedido como cancelado.
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
      {/* Cabeçalho com título e menu de navegação entre as telas do admin */}
      <header className="admin-header">
        <h1 className="admin-header__titulo">📋 Pedidos</h1>
        <AdminNav atual="pedidos" />
      </header>

      <div className="admin-conteudo">
        {/* Mensagens de estado: erro, carregando e lista vazia */}
        {erro && <p className="admin-mensagem-erro">{erro}</p>}

        {carregando && <p className="admin-mensagem-neutra">Carregando pedidos...</p>}

        {!carregando && pedidos.length === 0 && !erro && (
          <p className="admin-mensagem-neutra">Nenhum pedido registrado ainda.</p>
        )}

        {/* Um cartão por pedido (key ajuda o React a identificar cada item da lista) */}
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="admin-pedido-card">
            {/* Topo do cartão: número, dados do cliente e selos de status/pagamento */}
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
                {pedido.agendado_para && (
                  <span className="admin-status-badge admin-status-badge--alerta">
                    📅 Encomenda: {new Date(pedido.agendado_para).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
                <span className="admin-status-badge">{STATUS_LABEL[pedido.status]}</span>
                <span className={`admin-status-badge ${pagamentoBadge(pedido).classe}`}>
                  {pagamentoBadge(pedido).texto}
                </span>
              </div>
            </div>

            {/* Itens do pedido, com a observação de cada item quando houver */}
            <ul className="admin-pedido-card__itens">
              {pedido.itens.map((item, index) => (
                <li key={index}>
                  {item.quantidade}x {item.nome}
                  {item.observacoes ? ` — obs: ${item.observacoes}` : ''}
                </li>
              ))}
            </ul>

            {/* Observação geral do pedido (opcional) */}
            {pedido.observacoes && (
              <p className="admin-pedido-card__observacoes">
                Observações do pedido: {pedido.observacoes}
              </p>
            )}

            {/* Rodapé: total e botões de ação */}
            <div className="admin-pedido-card__rodape">
              <strong className="admin-pedido-card__total">
                Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
                {Number(pedido.sinal) > 0 && (
                  <>
                    {' '}· Sinal: R$ {Number(pedido.sinal).toFixed(2).replace('.', ',')}
                    {' '}· Restante na entrega: R$ {(Number(pedido.total) - Number(pedido.sinal)).toFixed(2).replace('.', ',')}
                  </>
                )}
              </strong>

              <div className="admin-pedido-card__acoes">
                {/* Só mostra "Avançar" se ainda existe uma próxima etapa */}
                {PROXIMOS_STATUS[pedido.status] && (
                  <button onClick={() => handleAvancarStatus(pedido)} className="admin-botao-avancar">
                    Avançar → {STATUS_LABEL[PROXIMOS_STATUS[pedido.status]!]}
                  </button>
                )}
                {/* Pedido já entregue ou cancelado não pode mais ser cancelado */}
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
