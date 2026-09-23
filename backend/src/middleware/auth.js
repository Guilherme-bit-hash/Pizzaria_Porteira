// =====================================================================================
// middleware/auth.js — proteção das rotas do painel admin.
//
// Middleware = função que roda ANTES do handler da rota e decide se a requisição pode
// seguir (chamando next()) ou deve ser barrada (respondendo com erro).
// É usado nas rotas de routes/*.js que só o administrador pode acessar
// (ex: listar pedidos, editar cardápio, ver clientes, enviar campanhas).
// =====================================================================================
import jwt from 'jsonwebtoken'

// Exige um token JWT válido no cabeçalho "Authorization: Bearer <token>" (o token é
// emitido por POST /api/auth/login). Se válido, guarda o conteúdo em req.admin e segue.
export function exigirAdmin(req, res, next) {
  const header = req.headers.authorization
  // Extrai o token removendo o prefixo "Bearer " (7 caracteres).
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticação ausente.' })
  }

  try {
    // verify confere a assinatura (com JWT_SECRET) e a validade; lança erro se falhar.
    req.admin = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' })
  }
}
