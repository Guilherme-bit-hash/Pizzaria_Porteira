import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// Colunas de pagamento PIX, adicionadas depois da criação inicial da tabela `pedidos`.
// MySQL (diferente do MariaDB) não suporta `ADD COLUMN IF NOT EXISTS`, então a
// idempotência é feita aqui: tenta adicionar e ignora o erro "coluna duplicada"
// (ER_DUP_FIELDNAME) quando o banco já tem a coluna de uma migração anterior.
const COLUNAS_PIX = [
  `ALTER TABLE pedidos ADD COLUMN forma_pagamento ENUM('whatsapp', 'pix') NOT NULL DEFAULT 'whatsapp'`,
  `ALTER TABLE pedidos ADD COLUMN pagamento_status ENUM('pendente', 'aprovado', 'recusado', 'expirado') NULL`,
  `ALTER TABLE pedidos ADD COLUMN mp_payment_id VARCHAR(50) NULL`,
]

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })

  try {
    await connection.query(schema)

    for (const sql of COLUNAS_PIX) {
      try {
        await connection.query(sql)
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') throw error
      }
    }

    console.log('Banco de dados e tabelas criados/verificados com sucesso.')
  } finally {
    await connection.end()
  }
}

migrate().catch((error) => {
  console.error('Falha ao rodar a migração:', error.message)
  process.exit(1)
})
