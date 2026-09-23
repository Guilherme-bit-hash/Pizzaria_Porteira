// src/services/pagamentoService.ts
// Camada de acesso ao backend para PAGAMENTO PIX (endpoints /api/pedidos/:id/pagamento/*).
// Usado pelo checkout (Pages/Pedido.tsx). Rotas públicas: o cliente não é administrador.

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Situação do pagamento de um pedido.
export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'expirado'

// Cobrança PIX criada: id no provedor de pagamento, status e o QR code (texto "copia e cola" e imagem base64).
export interface PagamentoPix {
  paymentId: number
  status: StatusPagamento
  qrCode: string | null
  qrCodeBase64: string | null
}

// Lê a resposta como JSON e transforma erros HTTP em exceções com a mensagem do backend.
async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// POST /api/pedidos/:id/pagamento/pix
// Gera a cobrança PIX para um pedido já criado e devolve o QR code para exibir no checkout.
export async function criarPagamentoPix(pedidoId: number, email?: string): Promise<PagamentoPix> {
  const resposta = await fetch(`${API_URL}/pedidos/${pedidoId}/pagamento/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return tratarResposta(resposta)
}

// GET /api/pedidos/:id/pagamento/status
// Consulta o status atual do pagamento — usada para dar polling enquanto o cliente
// não paga o PIX gerado.
export async function consultarStatusPagamento(pedidoId: number): Promise<StatusPagamento> {
  const resposta = await fetch(`${API_URL}/pedidos/${pedidoId}/pagamento/status`)
  const dados = await tratarResposta(resposta)
  return dados.status
}
