// =====================================================================================
// db/migrate.js — script de migração: prepara o banco de dados.
//
// NÃO é importado pela API; é executado manualmente (via script npm do backend) antes de
// usar o sistema. Ele: (1) roda o schema.sql, que cria o banco e as tabelas se não existirem;
// (2) garante colunas que bancos antigos podem não ter; (3) carrega o cardápio inicial se a
// tabela `produtos` estiver vazia. Pode ser rodado várias vezes sem estragar nada (idempotente).
// =====================================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mysql from 'mysql2/promise'
import 'dotenv/config'

// Em módulos ES não existe __dirname pronto; calculamos a pasta deste arquivo para achar o schema.sql ao lado.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Lê todo o script SQL de criação do banco/tabelas.
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
// Nome do banco vem do .env (padrão: pizzaria_porteira, o usado em desenvolvimento local).
const DB_NAME = process.env.DB_NAME || 'pizzaria_porteira'

// Colunas de pagamento PIX e de vínculo com o cliente (cliente_id), que bancos criados
// numa versão anterior do schema.sql podem não ter. Em banco novo, as de pagamento já vêm do
// schema.sql (então dão "duplicada" e são ignoradas) e cliente_id é criada aqui.
// MySQL (diferente do MariaDB) não suporta `ADD COLUMN IF NOT EXISTS`, então a
// idempotência é feita aqui: tenta adicionar e ignora o erro "coluna duplicada"
// (ER_DUP_FIELDNAME) quando o banco já tem a coluna de uma migração anterior.
const COLUNAS_PIX = [
  `ALTER TABLE pedidos ADD COLUMN forma_pagamento ENUM('whatsapp', 'pix') NOT NULL DEFAULT 'whatsapp'`,
  `ALTER TABLE pedidos ADD COLUMN pagamento_status ENUM('pendente', 'aprovado', 'recusado', 'expirado') NULL`,
  `ALTER TABLE pedidos ADD COLUMN mp_payment_id VARCHAR(50) NULL`,
  `ALTER TABLE pedidos ADD COLUMN cliente_id INT NULL`,
  // Encomendas: data/hora futura combinada (NULL = pedido para agora).
  `ALTER TABLE pedidos ADD COLUMN agendado_para DATETIME NULL`,
  // Sinal cobrado no PIX da encomenda (0 = cobra o total).
  `ALTER TABLE pedidos ADD COLUMN sinal DECIMAL(10, 2) NOT NULL DEFAULT 0`,
]

// Cardápio original do site, usado só para popular a tabela `produtos` na primeira migração.
// Depois disso, tudo é editado pelo painel admin.
// Formato de cada linha: [categoria, nome, descrição, preço].
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

// Bancos hospedados (ex.: Clever Cloud) já vêm criados com charset utf8 de 3 bytes, que não
// guarda emoji nem outros caracteres de 4 bytes: um pedido com emoji no nome/observação
// falharia com "Incorrect string value", e o emoji das promoções virava "?". Esta função
// põe o banco e todas as tabelas existentes em utf8mb4. É idempotente: tabelas que já estão
// em utf8mb4 são ignoradas, então rodar de novo não faz nada. Devolve quantas converteu.
async function garantirUtf8mb4(connection) {
  try {
    await connection.query(
      `ALTER DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  } catch (error) {
    // Sem permissão para alterar o banco (1044/1227): tudo bem, as tabelas são convertidas abaixo.
    if (error.errno !== 1044 && error.errno !== 1227) throw error
  }

  const [tabelas] = await connection.query(
    `SELECT TABLE_NAME AS nome FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' AND TABLE_COLLATION NOT LIKE 'utf8mb4%'`,
    [DB_NAME]
  )
  for (const { nome } of tabelas) {
    await connection.query(
      `ALTER TABLE \`${nome}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  }
  return tabelas.length
}

// Executa a migração completa. Usa uma conexão direta (e não o pool) porque o banco
// pode ainda não existir, então não dá para se conectar já apontando para ele.
async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    // Necessário para executar o schema.sql inteiro (vários comandos SQL) de uma só vez.
    multipleStatements: true,
    // utf8mb4: as promoções padrão têm emojis (4 bytes), que com o utf8 de 3 bytes do mysql2
    // viravam "?" no banco.
    charset: 'utf8mb4',
  })

  try {
    // 1) Cria o banco (se o usuário tiver permissão), seleciona e cria tabelas e promoções padrão.
    // Em MySQL hospedado o banco já existe e o usuário não pode criar outros (erro 1044/1227):
    // nesse caso só seguimos e usamos o que já existe.
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
    } catch (error) {
      if (error.errno !== 1044 && error.errno !== 1227) throw error
    }
    await connection.query(`USE \`${DB_NAME}\``)

    // Tabelas de versões antigas primeiro: o schema.sql abaixo grava promoções com emoji.
    const convertidas = await garantirUtf8mb4(connection)
    if (convertidas > 0) console.log(`Tabelas convertidas para utf8mb4: ${convertidas}.`)

    await connection.query(schema)

    // 2) Garante as colunas extras em `pedidos`, ignorando as que já existem.
    for (const sql of COLUNAS_PIX) {
      try {
        await connection.query(sql)
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') throw error
      }
    }

    // 3) Cardápio inicial: só carrega se a tabela estiver vazia, para não sobrescrever
    // (nem duplicar) o que o admin já editou. `VALUES ?` insere várias linhas de uma vez.
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
    // Sempre fecha a conexão, senão o script não terminaria.
    await connection.end()
  }
}

// Dispara a migração; em caso de falha, mostra a mensagem e encerra com código de erro (1).
migrate().catch((error) => {
  console.error('Falha ao rodar a migração:', error.message)
  process.exit(1)
})
