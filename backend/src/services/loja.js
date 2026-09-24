// =====================================================================================
// services/loja.js — leitura/escrita da configuração da loja (hoje: só aberta/fechada).
//
// Usado por routes/loja.js (expõe pro painel admin e pro site) e por routes/pedidos.js
// (bloqueia a criação de pedido novo quando a loja está fechada).
// =====================================================================================
import { pool } from '../db/pool.js'
import { criarCache } from './cache.js'

// O site pergunta se a loja está aberta a cada visita ao cardápio/pedido e o servidor
// confere de novo a cada pedido criado — sem cache, isso é uma consulta ao banco por visita.
// 5 s de validade; definirLojaAberta() limpa na hora, então fechar/abrir vale imediatamente.
const cacheStatus = criarCache(5 * 1000)

// Lê se a loja está aceitando pedidos. Se a linha de configuração não existir por algum
// motivo (banco não migrado ainda), assume aberta — não faz sentido travar pedidos por
// causa de uma configuração ausente.
export async function lojaEstaAberta() {
  return cacheStatus.obter(async () => {
    const [linhas] = await pool.query('SELECT aberta FROM loja_config WHERE id = 1')
    return linhas.length === 0 ? true : Boolean(linhas[0].aberta)
  })
}

export async function definirLojaAberta(aberta) {
  await pool.query(
    'INSERT INTO loja_config (id, aberta) VALUES (1, ?) ON DUPLICATE KEY UPDATE aberta = VALUES(aberta)',
    [aberta]
  )
  cacheStatus.limpar()
}
