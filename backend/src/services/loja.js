// =====================================================================================
// services/loja.js — leitura/escrita da configuração da loja (hoje: só aberta/fechada).
//
// Usado por routes/loja.js (expõe pro painel admin e pro site) e por routes/pedidos.js
// (bloqueia a criação de pedido novo quando a loja está fechada).
// =====================================================================================
import { pool } from '../db/pool.js'

// Lê se a loja está aceitando pedidos. Se a linha de configuração não existir por algum
// motivo (banco não migrado ainda), assume aberta — não faz sentido travar pedidos por
// causa de uma configuração ausente.
export async function lojaEstaAberta() {
  const [linhas] = await pool.query('SELECT aberta FROM loja_config WHERE id = 1')
  return linhas.length === 0 ? true : Boolean(linhas[0].aberta)
}

export async function definirLojaAberta(aberta) {
  await pool.query(
    'INSERT INTO loja_config (id, aberta) VALUES (1, ?) ON DUPLICATE KEY UPDATE aberta = VALUES(aberta)',
    [aberta]
  )
}
