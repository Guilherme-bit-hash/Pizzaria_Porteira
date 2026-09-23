import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const produtosRouter = Router()

const CATEGORIAS = ['pizza', 'hamburguer', 'bebida', 'sobremesa']

function urlValida(valor) {
  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Retorna os dados já normalizados ou null se algum campo for inválido.
function validarProduto(body) {
  const { categoria, nome, descricao, preco, imagemUrl, ativo, ordem } = body || {}

  if (!CATEGORIAS.includes(categoria)) return null
  if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 150) return null
  if (descricao !== undefined && descricao !== null) {
    if (typeof descricao !== 'string' || descricao.length > 255) return null
  }
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0 || preco > 99999) return null
  if (imagemUrl !== undefined && imagemUrl !== null && imagemUrl !== '') {
    if (typeof imagemUrl !== 'string' || imagemUrl.length > 500 || !urlValida(imagemUrl)) return null
  }
  if (ordem !== undefined && !Number.isInteger(ordem)) return null

  return {
    categoria,
    nome: nome.trim(),
    descricao: (descricao || '').trim(),
    preco: Number(preco.toFixed(2)),
    imagemUrl: imagemUrl || null,
    ativo: ativo === undefined ? true : Boolean(ativo),
    ordem: ordem ?? 0,
  }
}

function mapLinha(linha) {
  return {
    id: linha.id,
    categoria: linha.categoria,
    nome: linha.nome,
    descricao: linha.descricao,
    preco: Number(linha.preco),
    imagemUrl: linha.imagem_url,
    ativo: Boolean(linha.ativo),
    ordem: linha.ordem,
  }
}

function tratarNomeDuplicado(error, res) {
  if (error.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ erro: 'Já existe um produto com esse nome.' })
    return true
  }
  return false
}

// Cardápio público: só produtos ativos (usado pelo site).
produtosRouter.get('/', asyncHandler(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM produtos WHERE ativo = TRUE ORDER BY ordem, id')
  res.json(linhas.map(mapLinha))
}))

// Lista completa, inclusive produtos desativados (painel admin).
produtosRouter.get('/admin', exigirAdmin, asyncHandler(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM produtos ORDER BY categoria, ordem, id')
  res.json(linhas.map(mapLinha))
}))

produtosRouter.post('/', exigirAdmin, asyncHandler(async (req, res) => {
  const dados = validarProduto(req.body)
  if (!dados) {
    return res.status(400).json({ erro: 'Dados do produto inválidos. Confira categoria, nome, preço (maior que zero) e link da imagem.' })
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO produtos (categoria, nome, descricao, preco, imagem_url, ativo, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dados.categoria, dados.nome, dados.descricao, dados.preco, dados.imagemUrl, dados.ativo, dados.ordem]
    )
    res.status(201).json({ id: resultado.insertId, ...dados })
  } catch (error) {
    if (!tratarNomeDuplicado(error, res)) throw error
  }
}))

produtosRouter.put('/:id', exigirAdmin, asyncHandler(async (req, res) => {
  const dados = validarProduto(req.body)
  if (!dados) {
    return res.status(400).json({ erro: 'Dados do produto inválidos. Confira categoria, nome, preço (maior que zero) e link da imagem.' })
  }

  try {
    const [resultado] = await pool.query(
      `UPDATE produtos
       SET categoria = ?, nome = ?, descricao = ?, preco = ?, imagem_url = ?, ativo = ?, ordem = ?
       WHERE id = ?`,
      [dados.categoria, dados.nome, dados.descricao, dados.preco, dados.imagemUrl, dados.ativo, dados.ordem, req.params.id]
    )
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' })
    }
    res.json({ id: Number(req.params.id), ...dados })
  } catch (error) {
    if (!tratarNomeDuplicado(error, res)) throw error
  }
}))

// Pedidos antigos guardam nome/preço dos itens no próprio JSON, então excluir é seguro.
produtosRouter.delete('/:id', exigirAdmin, asyncHandler(async (req, res) => {
  const [resultado] = await pool.query('DELETE FROM produtos WHERE id = ?', [req.params.id])
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ erro: 'Produto não encontrado.' })
  }
  res.status(204).end()
}))
