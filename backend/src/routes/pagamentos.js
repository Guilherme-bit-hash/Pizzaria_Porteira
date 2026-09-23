// =====================================================================================
// routes/pagamentos.js — recebimento de avisos do Mercado Pago. Montado em /api/pagamentos.
//
// Não é chamado pelo front-end: quem chama é o próprio Mercado Pago (webhook = aviso que
// um sistema externo envia à nossa API quando algo acontece, aqui a mudança de status de
// um pagamento PIX). A geração da cobrança PIX fica em routes/pedidos.js.
// =====================================================================================
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getPaymentClient } from '../services/mercadoPago.js'

export const pagamentosRouter = Router()

// Traduz o status do Mercado Pago (em inglês) para o valor do ENUM `pagamento_status` do
// banco. Qualquer status intermediário (pending, in_process...) vira 'pendente'.
// (Mesma tradução existe em routes/pedidos.js.)
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
  // O aviso pode vir no corpo ou na query string; só nos interessam eventos de pagamento.
  if (tipo !== 'payment' || !paymentId) return

  try {
    // Não confiamos nos dados do aviso: consultamos o pagamento direto no Mercado Pago.
    const client = getPaymentClient()
    const resultado = await client.get({ id: paymentId })
    // external_reference é o id do nosso pedido, enviado ao criar a cobrança (pedidos.js).
    const pedidoId = resultado.external_reference
    if (!pedidoId) return

    // Grava o novo status de pagamento no pedido correspondente.
    await pool.query('UPDATE pedidos SET pagamento_status = ?, mp_payment_id = ? WHERE id = ?', [
      mapearStatusPagamento(resultado.status),
      String(resultado.id),
      pedidoId,
    ])
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error)
  }
}))
