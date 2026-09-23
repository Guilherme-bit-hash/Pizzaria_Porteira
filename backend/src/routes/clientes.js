// =====================================================================================
// routes/clientes.js — base de clientes para o painel admin. Montado em /api/clientes.
//
// Os clientes são criados/atualizados automaticamente por routes/pedidos.js a cada pedido.
// Aqui o admin consulta a lista (com busca e filtro de consentimento), vê o detalhe e o
// histórico de um cliente, exporta CSV e altera o consentimento de promoções.
// =====================================================================================
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const clientesRouter = Router()

// Todas as rotas de clientes são do painel admin: contêm dados pessoais (LGPD).
// router.use aplica o middleware exigirAdmin a todas as rotas declaradas abaixo.
clientesRouter.use(exigirAdmin)

// Totais são calculados na hora a partir dos pedidos (ignorando cancelados), assim nunca
// ficam desatualizados quando o status de um pedido muda.
// LEFT JOIN mantém clientes sem nenhum pedido; COUNT/SUM/MAX agregam os pedidos de cada um
// (quem usa esta base acrescenta WHERE e GROUP BY c.id).
const SELECT_CLIENTES = `
  SELECT c.*,
         COUNT(p.id) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_gasto,
         MAX(p.criado_em) AS ultimo_pedido_em
  FROM clientes c
  LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status <> 'cancelado'`

// Converte a linha do banco (snake_case; agregados como texto) para o JSON da API (camelCase, números).
function mapCliente(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone,
    email: linha.email,
    endereco: linha.endereco,
    complemento: linha.complemento,
    aceitaPromocoes: Boolean(linha.aceita_promocoes),
    consentimentoEm: linha.consentimento_em,
    criadoEm: linha.criado_em,
    totalPedidos: Number(linha.total_pedidos),
    totalGasto: Number(linha.total_gasto),
    ultimoPedidoEm: linha.ultimo_pedido_em,
  }
}

// Monta a consulta de clientes conforme os filtros: busca por nome/e-mail/telefone e/ou
// somente quem aceitou promoções. Usada pela listagem e pela exportação CSV.
async function buscarClientes({ busca, somenteConsentimento }) {
  const condicoes = []
  const parametros = []

  if (busca) {
    // Escapa os curingas do LIKE (\, % e _) para que o texto digitado seja buscado literalmente.
    const termo = `%${busca.replace(/[\\%_]/g, '\\$&')}%`
    // Se houver dígitos, também busca pelo telefone sem máscara (só números).
    const digitos = busca.replace(/\D/g, '')
    condicoes.push('(c.nome LIKE ? OR c.email LIKE ?' + (digitos ? ' OR c.telefone_normalizado LIKE ?' : '') + ')')
    parametros.push(termo, termo)
    if (digitos) parametros.push(`%${digitos}%`)
  }
  if (somenteConsentimento) condicoes.push('c.aceita_promocoes = TRUE')

  // Os valores vão em `parametros` (placeholders ?) e nunca concatenados no SQL, evitando SQL injection.
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const [linhas] = await pool.query(
    `${SELECT_CLIENTES} ${where} GROUP BY c.id ORDER BY ultimo_pedido_em DESC, c.id DESC`,
    parametros
  )
  return linhas.map(mapCliente)
}

// Lista clientes. Query string opcional: ?busca=texto e ?promocoes=1 (só com consentimento).
clientesRouter.get('/', asyncHandler(async (req, res) => {
  const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().slice(0, 100) : ''
  const somenteConsentimento = req.query.promocoes === '1'
  res.json(await buscarClientes({ busca, somenteConsentimento }))
}))

// Escapa um valor de CSV e neutraliza "injeção de fórmula" (=, +, -, @ no início da célula
// executariam uma fórmula ao abrir o arquivo no Excel).
function celulaCsv(valor) {
  let texto = valor === null || valor === undefined ? '' : String(valor)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return `"${texto.replace(/"/g, '""')}"`
}

// Exporta a base de clientes em CSV (BOM para o Excel abrir os acentos corretamente).
// Declarada antes de '/:id' para "exportar" não ser confundido com um id de cliente.
clientesRouter.get('/exportar', asyncHandler(async (req, res) => {
  const clientes = await buscarClientes({ busca: '', somenteConsentimento: req.query.promocoes === '1' })
  // Cabeçalho e linhas na mesma ordem de colunas; separador ';' e vírgula decimal (padrão do Excel em pt-BR).
  const cabecalho = ['Nome', 'Telefone', 'E-mail', 'Endereço', 'Complemento', 'Aceita promoções', 'Pedidos', 'Total gasto', 'Último pedido']
  const linhas = clientes.map((c) => [
    c.nome,
    c.telefone,
    c.email,
    c.endereco,
    c.complemento,
    c.aceitaPromocoes ? 'sim' : 'não',
    c.totalPedidos,
    c.totalGasto.toFixed(2).replace('.', ','),
    c.ultimoPedidoEm ? new Date(c.ultimoPedidoEm).toISOString() : '',
  ])
  const csv = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(';')).join('\r\n')

  // Content-Disposition: attachment faz o navegador baixar o arquivo em vez de exibi-lo.
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"')
  res.send(`﻿${csv}`)
}))

// Detalhe de um cliente: dados + totais + histórico de pedidos (mais recentes primeiro).
clientesRouter.get('/:id', asyncHandler(async (req, res) => {
  const [linhas] = await pool.query(`${SELECT_CLIENTES} WHERE c.id = ? GROUP BY c.id`, [req.params.id])
  if (linhas.length === 0) {
    return res.status(404).json({ erro: 'Cliente não encontrado.' })
  }

  const [pedidos] = await pool.query(
    'SELECT id, itens, total, status, criado_em FROM pedidos WHERE cliente_id = ? ORDER BY criado_em DESC',
    [req.params.id]
  )
  res.json({ ...mapCliente(linhas[0]), pedidos })
}))

// Permite ao admin registrar/retirar o consentimento manualmente, por exemplo quando um
// cliente pede para não receber mais promoções (opt-out).
clientesRouter.patch('/:id/consentimento', asyncHandler(async (req, res) => {
  const { aceitaPromocoes } = req.body || {}
  if (typeof aceitaPromocoes !== 'boolean') {
    return res.status(400).json({ erro: 'Informe aceitaPromocoes como true ou false.' })
  }

  const [resultado] = await pool.query(
    'UPDATE clientes SET aceita_promocoes = ?, consentimento_em = ? WHERE id = ?',
    [aceitaPromocoes, aceitaPromocoes ? new Date() : null, req.params.id]
  )
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ erro: 'Cliente não encontrado.' })
  }
  res.json({ id: Number(req.params.id), aceitaPromocoes })
}))
