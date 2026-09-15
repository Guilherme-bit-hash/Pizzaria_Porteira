import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const pedidosRouter = Router()

const STATUS_VALIDOS = ['recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado']

function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return null

  for (const item of itens) {
    if (
      typeof item.nome !== 'string' ||
      typeof item.preco !== 'number' ||
      typeof item.quantidade !== 'number' ||
      item.preco < 0 ||
      item.quantidade < 1
    ) {
      return null
    }
  }
  return itens
}

// Criar pedido (usado pelo checkout do site, sem autenticação)
pedidosRouter.post('/', asyncHandler(async (req, res) => {
  const { nome, telefone, endereco, complemento, observacoes, itens } = req.body || {}

  if (!nome || !telefone || !endereco) {
    return res.status(400).json({ erro: 'Nome, telefone e endereço são obrigatórios.' })
  }

  const itensValidos = validarItens(itens)
  if (!itensValidos) {
    return res.status(400).json({ erro: 'A lista de itens do pedido é inválida ou está vazia.' })
  }

  const total = itensValidos.reduce((acc, item) => acc + item.preco * item.quantidade, 0)

  const [resultado] = await pool.query(
    `INSERT INTO pedidos (cliente_nome, cliente_telefone, endereco, complemento, observacoes, itens, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome, telefone, endereco, complemento || null, observacoes || null, JSON.stringify(itensValidos), total]
  )

  res.status(201).json({ id: resultado.insertId, total, status: 'recebido' })
}))

// Listar pedidos (painel admin)
pedidosRouter.get('/', exigirAdmin, asyncHandler(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM pedidos ORDER BY criado_em DESC')
  res.json(linhas)
}))

// Detalhar um pedido (painel admin)
pedidosRouter.get('/:id', exigirAdmin, asyncHandler(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [req.params.id])
  if (linhas.length === 0) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' })
  }
  res.json(linhas[0])
}))

// Atualizar status do pedido (painel admin)
pedidosRouter.patch('/:id/status', exigirAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body || {}

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` })
  }

  const [resultado] = await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [
    status,
    req.params.id,
  ])

  if (resultado.affectedRows === 0) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' })
  }

  res.json({ id: Number(req.params.id), status })
}))
