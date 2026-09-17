import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const pedidosRouter = Router()

const STATUS_VALIDOS = ['recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado']

const CUPOM_PRIMEIRA_COMPRA = 'BEMVINDO10'
const CUPOM_PERCENTUAL = 0.1
const CUPOM_VALOR_MINIMO = 80

function normalizarTelefone(telefone) {
  return String(telefone || '').replace(/\D/g, '')
}

// Cupom de primeira compra é válido apenas para telefones que nunca fizeram um pedido antes.
// A checagem é sempre feita no servidor (nunca confiando no cliente) para não poder ser
// burlada limpando o localStorage do navegador.
async function elegivelCupomPrimeiraCompra(telefone) {
  const telefoneNormalizado = normalizarTelefone(telefone)
  if (!telefoneNormalizado) return false

  const [linhas] = await pool.query(
    `SELECT id FROM pedidos WHERE REGEXP_REPLACE(cliente_telefone, '[^0-9]', '') = ? LIMIT 1`,
    [telefoneNormalizado]
  )
  return linhas.length === 0
}

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
  const { nome, telefone, endereco, complemento, observacoes, itens, cupom } = req.body || {}

  if (!nome || !telefone || !endereco) {
    return res.status(400).json({ erro: 'Nome, telefone e endereço são obrigatórios.' })
  }

  const itensValidos = validarItens(itens)
  if (!itensValidos) {
    return res.status(400).json({ erro: 'A lista de itens do pedido é inválida ou está vazia.' })
  }

  const subtotal = itensValidos.reduce((acc, item) => acc + item.preco * item.quantidade, 0)

  // O desconto é sempre recalculado aqui, ignorando qualquer valor vindo do cliente:
  // um cupom inválido/já usado simplesmente não gera desconto, mas não impede o pedido.
  let desconto = 0
  let cupomAplicado = null

  if (cupom === CUPOM_PRIMEIRA_COMPRA && subtotal >= CUPOM_VALOR_MINIMO) {
    const elegivel = await elegivelCupomPrimeiraCompra(telefone)
    if (elegivel) {
      desconto = Number((subtotal * CUPOM_PERCENTUAL).toFixed(2))
      cupomAplicado = CUPOM_PRIMEIRA_COMPRA
    }
  }

  const total = Number((subtotal - desconto).toFixed(2))

  const [resultado] = await pool.query(
    `INSERT INTO pedidos (cliente_nome, cliente_telefone, endereco, complemento, observacoes, itens, subtotal, desconto, cupom, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nome,
      telefone,
      endereco,
      complemento || null,
      observacoes || null,
      JSON.stringify(itensValidos),
      subtotal,
      desconto,
      cupomAplicado,
      total,
    ]
  )

  res.status(201).json({
    id: resultado.insertId,
    subtotal,
    desconto,
    cupom: cupomAplicado,
    total,
    status: 'recebido',
  })
}))

// Verifica, em tempo real, se o telefone informado ainda tem direito ao cupom de primeira
// compra. Usado no checkout para mostrar o desconto antes de finalizar o pedido.
pedidosRouter.get('/cupom-primeira-compra/elegivel', asyncHandler(async (req, res) => {
  const elegivel = await elegivelCupomPrimeiraCompra(req.query.telefone)
  res.json({
    elegivel,
    codigo: CUPOM_PRIMEIRA_COMPRA,
    percentual: CUPOM_PERCENTUAL,
    valorMinimo: CUPOM_VALOR_MINIMO,
  })
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
