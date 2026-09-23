// =====================================================================================
// routes/auth.js — autenticação do administrador. Montado em server.js em /api/auth.
//
// Só existe um administrador, cujas credenciais vêm do .env (ADMIN_USER e
// ADMIN_PASSWORD_HASH). O painel admin do front-end chama o login daqui, guarda o token
// recebido e o envia nas próximas requisições; middleware/auth.js (exigirAdmin) valida
// esse token nas rotas protegidas.
// =====================================================================================
import { Router } from 'express'
// bcrypt: compara a senha digitada com um hash (impressão digital irreversível da senha),
// assim a senha real nunca fica guardada em texto puro.
import bcrypt from 'bcryptjs'
// JWT (JSON Web Token): token assinado com um segredo que prova que o login foi feito,
// sem o servidor precisar guardar sessões.
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { loginLimiter } from '../middleware/rateLimit.js'

export const authRouter = Router()

// POST /api/auth/login — recebe { usuario, senha } e devolve { token } se estiverem corretos.
// loginLimiter roda antes do handler e limita tentativas por IP (proteção contra força bruta).
authRouter.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { usuario, senha } = req.body || {}

  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Informe usuário e senha.' })
  }

  const adminUser = process.env.ADMIN_USER
  const adminHash = process.env.ADMIN_PASSWORD_HASH

  if (!adminUser || !adminHash) {
    return res.status(500).json({
      erro: 'Login do admin não configurado no servidor (ADMIN_USER / ADMIN_PASSWORD_HASH).',
    })
  }

  // Usuário e senha errados devolvem a MESMA mensagem, para não revelar qual dos dois falhou.
  if (usuario !== adminUser) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' })
  }

  const senhaValida = await bcrypt.compare(senha, adminHash)
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' })
  }

  // Login válido: emite o token, que expira em 8h (depois disso o admin precisa logar de novo).
  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
}))
