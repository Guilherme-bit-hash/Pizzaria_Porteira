import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'
import { pool } from './db/pool.js'
import { pedidosRouter } from './routes/pedidos.js'
import { authRouter } from './routes/auth.js'
import { promocoesRouter } from './routes/promocoes.js'
import { pagamentosRouter } from './routes/pagamentos.js'

// Falha rápido e com mensagem clara no boot se faltar alguma variável obrigatória, em vez de
// só quebrar de forma confusa no primeiro login (ex: jwt.sign com secret undefined).
const VARIAVEIS_OBRIGATORIAS = ['JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD_HASH']
const faltando = VARIAVEIS_OBRIGATORIAS.filter((nome) => !process.env[nome])
if (faltando.length > 0) {
  console.error(
    `Variáveis de ambiente obrigatórias não configuradas: ${faltando.join(', ')}. Veja o .env.example.`
  )
  process.exit(1)
}

// Em produção, CORS_ORIGIN precisa ser definido explicitamente: sem essa checagem, o
// fallback abaixo cairia silenciosamente para localhost e bloquearia o front-end real,
// dando um erro de CORS confuso no navegador em vez de um erro claro no boot do servidor.
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('CORS_ORIGIN precisa ser definido quando NODE_ENV=production.')
  process.exit(1)
}

const app = express()

// Cabeçalhos de segurança padrão (X-Content-Type-Options, HSTS quando servido via HTTPS,
// etc). contentSecurityPolicy fica desligado porque esta API só responde JSON, nunca HTML.
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5273' }))
app.use(express.json())

// Verifica de verdade se o banco está acessível, não só se o processo Node está de pé.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    console.error('Healthcheck falhou ao consultar o banco:', err)
    res.status(503).json({ status: 'erro', erro: 'Banco de dados indisponível.' })
  }
})
app.use('/api/auth', authRouter)
app.use('/api/pedidos', pedidosRouter)
app.use('/api/promocoes', promocoesRouter)
app.use('/api/pagamentos', pagamentosRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`API da Pizzaria Porteira rodando em http://localhost:${port}`)
})
