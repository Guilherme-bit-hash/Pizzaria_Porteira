const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'expirado'

export interface PagamentoPix {
  paymentId: number
  status: StatusPagamento
  qrCode: string | null
  qrCodeBase64: string | null
}

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// Gera a cobrança PIX para um pedido já criado e devolve o QR code para exibir no checkout.
export async function criarPagamentoPix(pedidoId: number, email?: string): Promise<PagamentoPix> {
  const resposta = await fetch(`${API_URL}/pedidos/${pedidoId}/pagamento/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return tratarResposta(resposta)
}

// Consulta o status atual do pagamento — usada para dar polling enquanto o cliente
// não paga o PIX gerado.
export async function consultarStatusPagamento(pedidoId: number): Promise<StatusPagamento> {
  const resposta = await fetch(`${API_URL}/pedidos/${pedidoId}/pagamento/status`)
  const dados = await tratarResposta(resposta)
  return dados.status
}
