// =====================================================================================
// db/pool.js — conexão compartilhada com o banco MySQL.
//
// Um "pool" mantém um conjunto de conexões abertas e reutilizáveis, em vez de abrir uma
// nova a cada consulta (o que seria lento). Todas as rotas e o healthcheck de server.js
// importam `pool` daqui e usam pool.query(...). Os dados de acesso vêm do .env; os
// valores após || são padrões para desenvolvimento local.
// =====================================================================================
import mysql from 'mysql2/promise'
import 'dotenv/config'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pizzaria_porteira',
  // Se as 10 conexões estiverem ocupadas, novas consultas esperam na fila em vez de falhar.
  waitForConnections: true,
  // Configurável porque MySQL gratuito de hospedagem costuma limitar as conexões (ex: 5).
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
})
