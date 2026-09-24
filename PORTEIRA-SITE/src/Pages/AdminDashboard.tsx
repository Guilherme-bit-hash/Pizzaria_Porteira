// src/Pages/AdminDashboard.tsx
// Tela inicial do painel administrativo, servida em "/admin/dashboard" (para onde o login leva).
// Mostra o botão de abrir/fechar a loja e um resumo do dia (pedidos, faturamento, ticket médio,
// contagem por status). Backend: GET/PUT /api/loja/status e GET /api/pedidos/metricas/hoje.
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarMetricasHoje, getAdminToken, limparAdminToken, type MetricasHoje, type StatusPedido } from '../services/pedidoService'
import { consultarStatusLoja, atualizarStatusLoja } from '../services/lojaService'
import { showToast } from '../components/Toast'
import AdminNav from '../components/AdminNav'
import '../styles/admin.css'

// Texto amigável para cada status, na mesma ordem em que aparecem no resumo.
const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: '🆕 Recebido',
  preparando: '👨‍🍳 Preparando',
  saiu_para_entrega: '🛵 Saiu para entrega',
  entregue: '✅ Entregue',
  cancelado: '❌ Cancelado',
}
const ORDEM_STATUS: StatusPedido[] = ['recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado']

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [metricas, setMetricas] = useState<MetricasHoje | null>(null)
  const [lojaAberta, setLojaAberta] = useState<boolean | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [alternandoLoja, setAlternandoLoja] = useState(false)
  const [erro, setErro] = useState('')

  const carregarDados = useCallback(async () => {
    try {
      const [dadosMetricas, aberta] = await Promise.all([buscarMetricasHoje(), consultarStatusLoja()])
      setMetricas(dadosMetricas)
      setLojaAberta(aberta)
      setErro('')
    } catch (error) {
      if (error instanceof Error && /token/i.test(error.message)) {
        limparAdminToken()
        navigate('/admin')
        return
      }
      setErro(error instanceof Error ? error.message : 'Erro ao carregar o painel.')
    } finally {
      setCarregando(false)
    }
  }, [navigate])

  // Mesmo padrão das outras telas do admin: sem token manda pro login; com token, carrega
  // e atualiza sozinho a cada 20s (um pouco mais devagar que a lista de pedidos, já que
  // números agregados mudam com menos urgência do que "chegou um pedido novo").
  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregarDados()
    const intervalo = setInterval(carregarDados, 20000)
    return () => clearInterval(intervalo)
  }, [navigate, carregarDados])

  const handleAlternarLoja = async () => {
    if (lojaAberta === null) return
    setAlternandoLoja(true)
    try {
      const novoStatus = await atualizarStatusLoja(!lojaAberta)
      setLojaAberta(novoStatus)
      showToast({
        message: novoStatus ? '🔓 Loja aberta — o site já aceita pedidos novos' : '🔒 Loja fechada — o site parou de aceitar pedidos novos',
        type: novoStatus ? 'success' : 'warning',
        emoji: novoStatus ? '🔓' : '🔒',
        duration: 3000,
      })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Erro ao atualizar o status da loja.',
        type: 'error',
        emoji: '⚠️',
      })
    } finally {
      setAlternandoLoja(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header__titulo">📊 Painel</h1>
        <AdminNav atual="dashboard" />
      </header>

      <div className="admin-conteudo">
        {erro && <p className="admin-mensagem-erro">{erro}</p>}
        {carregando && <p className="admin-mensagem-neutra">Carregando painel...</p>}

        {!carregando && (
          <>
            {/* LOJA ABERTA/FECHADA */}
            <div className={`admin-loja-card${lojaAberta ? '' : ' admin-loja-card--fechada'}`}>
              <div>
                <h2 className="admin-loja-card__titulo">
                  {lojaAberta ? '🔓 Loja aberta' : '🔒 Loja fechada'}
                </h2>
                <p className="admin-loja-card__texto">
                  {lojaAberta
                    ? 'O site está aceitando pedidos novos normalmente.'
                    : 'O site não está aceitando pedidos novos no momento.'}
                </p>
              </div>
              <button
                onClick={handleAlternarLoja}
                disabled={alternandoLoja || lojaAberta === null}
                className={lojaAberta ? 'admin-botao-perigo' : 'admin-botao-primario admin-botao-primario--largura-auto'}
              >
                {alternandoLoja ? 'Atualizando...' : lojaAberta ? 'Fechar loja' : 'Abrir loja'}
              </button>
            </div>

            {/* MÉTRICAS DO DIA */}
            {metricas && (
              <>
                <div className="admin-metricas-grid">
                  <div className="admin-metrica-card">
                    <span className="admin-metrica-card__valor">{metricas.totalHoje}</span>
                    <span className="admin-metrica-card__rotulo">Pedidos hoje</span>
                  </div>
                  <div className="admin-metrica-card">
                    <span className="admin-metrica-card__valor">
                      R$ {metricas.faturamentoHoje.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="admin-metrica-card__rotulo">Faturamento hoje</span>
                  </div>
                  <div className="admin-metrica-card">
                    <span className="admin-metrica-card__valor">
                      R$ {metricas.ticketMedio.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="admin-metrica-card__rotulo">Ticket médio</span>
                  </div>
                </div>

                <div className="admin-promo-card">
                  <h3 className="admin-promo-card__titulo">Pedidos de hoje por status</h3>
                  <div className="admin-status-resumo">
                    {ORDEM_STATUS.map((status) => (
                      <div key={status} className="admin-status-resumo__item">
                        <span>{STATUS_LABEL[status]}</span>
                        <strong>{metricas.porStatus[status]}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
