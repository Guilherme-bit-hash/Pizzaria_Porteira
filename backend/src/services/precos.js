// =====================================================================================
// services/precos.js — preços vigentes usados para conferir um pedido (routes/pedidos.js).
//
// Cada pedido novo precisa comparar os itens com o cardápio e com as promoções cadastradas.
// Lê-los do banco a cada pedido dobrava o número de consultas; por isso ficam em cache por
// 60 s. As rotas que editam produtos/promoções chamam limparCachePrecos(), então um preço
// alterado no painel vale já no pedido seguinte (nunca se confere contra um preço velho).
// =====================================================================================
import { pool } from '../db/pool.js'
import { criarCache } from './cache.js'

const cachePromocoes = criarCache(60 * 1000)
const cacheCardapio = criarCache(60 * 1000)

// Preços de promoção mudam de acordo com o dia/edição do admin e nem sempre chegam com o
// mesmo nome usado no cardápio fixo (a "Promoção do Dia" tem nomes livres). Por isso, para
// itens de promoção aceitamos qualquer preço que hoje exista de fato na tabela `promocoes`
// (ou 0, para promoções "combinar no WhatsApp"), em vez de exigir um nome exato.
export function precosPromocoesValidos() {
  return cachePromocoes.obter(async () => {
    const [linhas] = await pool.query('SELECT preco FROM promocoes')
    return new Set(linhas.map((linha) => Number(linha.preco)))
  })
}

// Catálogo vigente (produtos ativos da tabela `produtos`, editável pelo painel admin).
export function precosCardapio() {
  return cacheCardapio.obter(async () => {
    const [linhas] = await pool.query('SELECT nome, preco FROM produtos WHERE ativo = TRUE')
    return new Map(linhas.map((linha) => [linha.nome, Number(linha.preco)]))
  })
}

// Chamar depois de qualquer criação/edição/exclusão de produto ou promoção.
export function limparCachePrecos() {
  cachePromocoes.limpar()
  cacheCardapio.limpar()
}
