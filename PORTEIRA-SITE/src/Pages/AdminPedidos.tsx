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
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao atualizar status.')
    }
  }

  const handleCancelar = async (pedido: Pedido) => {
    try {
      await atualizarStatusPedido(pedido.id, 'cancelado')
      carregarPedidos()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao cancelar pedido.')
    }
  }

  const handleSair = () => {
    limparAdminToken()
    navigate('/admin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D1B00 0%, #3A240F 30%, #4A2F15 60%, #5A3E2B 100%)',
      color: 'white',
      fontFamily: "'Montserrat', sans-serif",
      padding: '20px',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1000px',
        margin: '0 auto 2rem',
        paddingTop: '20px',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <h1 style={{ color: '#FFD700', fontSize: '2rem' }}>📋 Pedidos</h1>
        <button
          onClick={handleSair}
          style={{
            background: 'rgba(255, 68, 68, 0.2)',
            color: '#FF8888',
            border: '1px solid rgba(255, 68, 68, 0.4)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {erro && (
          <p style={{ color: '#FF8888', marginBottom: '1.5rem', textAlign: 'center' }}>{erro}</p>
        )}

        {carregando && <p style={{ textAlign: 'center', color: '#ccc' }}>Carregando pedidos...</p>}

        {!carregando && pedidos.length === 0 && !erro && (
          <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum pedido registrado ainda.</p>
        )}

        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.2rem',
              border: '1px solid rgba(255, 215, 0, 0.2)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}>
              <div>
                <h3 style={{ color: '#FFD700', margin: 0 }}>
                  Pedido #{pedido.id} — {pedido.cliente_nome}
                </h3>
                <p style={{ color: '#aaa', margin: '0.3rem 0 0', fontSize: '0.9rem' }}>
                  {pedido.cliente_telefone} · {pedido.endereco}
                  {pedido.complemento ? ` (${pedido.complemento})` : ''}
                </p>
                <p style={{ color: '#888', margin: '0.3rem 0 0', fontSize: '0.85rem' }}>
                  {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
              <span style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(255, 215, 0, 0.15)',
                color: '#FFD700',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
              }}>
                {STATUS_LABEL[pedido.status]}
              </span>
            </div>

            <ul style={{ margin: '0 0 1rem', paddingLeft: '1.2rem', color: '#ddd' }}>
              {pedido.itens.map((item, index) => (
                <li key={index}>
                  {item.quantidade}x {item.nome}
                  {item.observacoes ? ` — obs: ${item.observacoes}` : ''}
                </li>
              ))}
            </ul>

            {pedido.observacoes && (
              <p style={{ color: '#FFA500', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Observações do pedido: {pedido.observacoes}
              </p>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <strong style={{ color: '#FFD700', fontSize: '1.2rem' }}>
                Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
              </strong>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                {PROXIMOS_STATUS[pedido.status] && (
                  <button
                    onClick={() => handleAvancarStatus(pedido)}
                    style={{
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: '#2D1B00',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Avançar → {STATUS_LABEL[PROXIMOS_STATUS[pedido.status]!]}
                  </button>
                )}
                {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                  <button
                    onClick={() => handleCancelar(pedido)}
                    style={{
                      background: 'rgba(255, 68, 68, 0.15)',
                      color: '#FF8888',
                      border: '1px solid rgba(255, 68, 68, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
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
