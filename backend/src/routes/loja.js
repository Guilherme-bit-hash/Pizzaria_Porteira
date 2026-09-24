// =====================================================================================
// routes/loja.js — status da loja (aberta/fechada). Montado em /api/loja.
//
// GET /status é público: o site consulta pra mostrar o aviso e bloquear o checkout.
// PUT /status é do painel admin: liga/desliga o aceite de pedidos novos.
// =====================================================================================
import { Router } from 'express'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { lojaEstaAberta, definirLojaAberta } from '../services/loja.js'

export const lojaRouter = Router()

lojaRouter.get('/status', asyncHandler(async (req, res) => {
  res.json({ aberta: await lojaEstaAberta() })
}))

lojaRouter.put('/status', exigirAdmin, asyncHandler(async (req, res) => {
  const { aberta } = req.body || {}
  if (typeof aberta !== 'boolean') {
    return res.status(400).json({ erro: 'Informe "aberta" como true ou false.' })
  }

  await definirLojaAberta(aberta)
  res.json({ aberta })
}))
