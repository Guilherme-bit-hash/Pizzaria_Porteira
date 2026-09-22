import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getPaymentClient } from '../services/mercadoPago.js'

export const pagamentosRouter = Router()

function mapearStatusPagamento(statusMp) {
  switch (statusMp) {
    case 'approved':
      return 'aprovado'
    case 'rejected':
      return 'recusado'
    case 'cancelled':
      return 'expirado'
    default:
      return 'pendente'
  }
}

// Recebe as notificações de mudança de status do Mercado Pago (webhooks).
// Só funciona quando o servidor está acessível publicamente (MP_NOTIFICATION_URL) —
// em desenvolvimento local, o polling em GET /api/pedidos/:id/pagamento/status cobre o mesmo caso.
pagamentosRouter.post('/webhook', asyncHandler(async (req, res) => {
  // Sempre responde 200 rápido: o Mercado Pago reenvia a notificação se não receber
  // uma resposta de sucesso, então erros daqui pra frente não devem virar retries infinitos.
  res.sendStatus(200)

  const tipo = req.body?.type || req.query.type
  const paymentId = req.body?.data?.id || req.query['data.id']
  if (tipo !== 'payment' || !paymentId) return

  try {
    const client = getPaymentClient()
    const resultado = await client.get({ id: paymentId })
    const pedidoId = resultado.external_reference
    if (!pedidoId) return

    await pool.query('UPDATE pedidos SET pagamento_status = ?, mp_payment_id = ? WHERE id = ?', [
      mapearStatusPagamento(resultado.status),
      String(resultado.id),
      pedidoId,
    ])
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error)
  }
}))
