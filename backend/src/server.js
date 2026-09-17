import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { pedidosRouter } from './routes/pedidos.js'
import { authRouter } from './routes/auth.js'
import { promocoesRouter } from './routes/promocoes.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5273' }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api/pedidos', pedidosRouter)
app.use('/api/promocoes', promocoesRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`API da Pizzaria Porteira rodando em http://localhost:${port}`)
})
