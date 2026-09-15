import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(async (req, res) => {
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

  if (usuario !== adminUser) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' })
  }

  const senhaValida = await bcrypt.compare(senha, adminHash)
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' })
  }

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
}))
