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
  `ALTER TABLE pedidos ADD COLUMN cliente_id INT NULL`,
]

// Cardápio original do site, usado só para popular a tabela `produtos` na primeira migração.
// Depois disso, tudo é editado pelo painel admin.
const PRODUTOS_INICIAIS = [
  ['pizza', 'Mussarela', 'Mussarela, molho de tomate, orégano', 32.9],
  ['pizza', 'Portuguesa', 'Presunto, ovo, cebola, pimentão, azeitonas, mussarela', 39.9],
  ['pizza', 'Calabresa', 'Calabresa, cebola, mussarela, orégano', 34.9],
  ['pizza', 'Frango com Catupiry', 'Frango desfiado, Catupiry, milho, mussarela', 42.9],
  ['pizza', 'Margherita', 'Mussarela, tomate, manjericão, azeite', 35.9],
  ['pizza', '4 Queijos', 'Mussarela, provolone, parmesão, gorgonzola', 44.9],
  ['hamburguer', 'Clássico', 'Carne 150g, queijo, alface, tomate, maionese', 26.9],
  ['hamburguer', 'Porteira', 'Carne 180g, bacon, cheddar, cebola caramelizada', 29.9],
  ['hamburguer', 'Double Bacon', '2 carnes, bacon extra, queijo cheddar, molho especial', 34.9],
  ['hamburguer', 'Vegetariano', 'Hambúrguer de grão de bico, queijo, alface, tomate', 28.9],
  ['bebida', 'Refrigerante lata', 'Coca-Cola, Guaraná, Fanta Laranja, Sprite', 6],
  ['bebida', 'Suco natural', 'Laranja, limão, maracujá, abacaxi com hortelã', 8],
  ['bebida', 'Água mineral', 'Água com/sem gás 500ml', 4],
  ['bebida', 'Cerveja artesanal', 'IPA, Pilsen, Weiss 500ml', 12],
  ['sobremesa', 'Pudim', 'Pudim de leite condensado tradicional', 12],
  ['sobremesa', 'Mousse de chocolate', 'Chocolate meio amargo com raspas de chocolate', 10],
  ['sobremesa', 'Brownie com sorvete', 'Brownie quente com bola de sorvete de creme', 16],
  ['sobremesa', 'Cheesecake', 'Cheesecake de frutas vermelhas', 14],
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

    await connection.query('USE pizzaria_porteira')
    const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM produtos')
    if (total === 0) {
      await connection.query(
        'INSERT INTO produtos (categoria, nome, descricao, preco, ordem) VALUES ?',
        [PRODUTOS_INICIAIS.map((produto, indice) => [...produto, indice])]
      )
      console.log(`Cardápio inicial carregado (${PRODUTOS_INICIAIS.length} produtos).`)
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
