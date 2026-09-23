import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { descadastroLimiter } from '../middleware/rateLimit.js'
import {
  emailConfigurado,
  enviarEmail,
  escaparHtml,
  gerarTokenDescadastro,
  tokenDescadastroValido,
} from '../services/email.js'

export const campanhasRouter = Router()

// URL pública da API, usada para montar o link de descadastro dentro dos e-mails. Em produção
// precisa ser o endereço real do servidor (ex: https://api.seudominio.com).
const URL_PUBLICA_API = () => process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3001}`

// Pausa entre envios para não estourar o limite por minuto dos provedores de SMTP.
const INTERVALO_ENTRE_ENVIOS_MS = 300
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Só entram na campanha clientes que deram consentimento E têm e-mail cadastrado.
async function buscarDestinatarios() {
  const [linhas] = await pool.query(
    `SELECT id, nome, email FROM clientes
     WHERE aceita_promocoes = TRUE AND email IS NOT NULL AND email <> ''`
  )
  return linhas
}

// Monta o e-mail de um destinatário: mensagem do admin + rodapé com o link de descadastro
// (obrigatório: o cliente precisa conseguir sair da lista com um clique).
function montarEmail({ mensagem, cliente }) {
  const link = `${URL_PUBLICA_API()}/api/campanhas/descadastrar?id=${cliente.id}&token=${gerarTokenDescadastro(cliente.id)}`
  const saudacao = cliente.nome ? `Olá, ${cliente.nome.split(' ')[0]}!` : 'Olá!'

  const texto = `${saudacao}\n\n${mensagem}\n\n—\nPizzaria Porteira\nPara não receber mais promoções: ${link}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <p>${escaparHtml(saudacao)}</p>
      <div style="white-space: pre-wrap;">${escaparHtml(mensagem)}</div>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
      <p style="font-size: 12px; color: #777;">
        Pizzaria Porteira<br>
        Não quer mais receber promoções? <a href="${link}">Clique aqui para sair da lista</a>.
      </p>
    </div>`
  return { texto, html }
}

// Quantos clientes receberiam a campanha + se o SMTP já está configurado (para o painel avisar).
campanhasRouter.get('/status', exigirAdmin, asyncHandler(async (req, res) => {
  const destinatarios = await buscarDestinatarios()
  res.json({ emailConfigurado: emailConfigurado(), totalDestinatarios: destinatarios.length })
}))

// Envia a promoção por e-mail. Com `emailTeste`, manda só para esse endereço (para conferir o
// visual antes do disparo real); sem ele, manda para todos os clientes com consentimento.
campanhasRouter.post('/email', exigirAdmin, asyncHandler(async (req, res) => {
  const { assunto, mensagem, emailTeste } = req.body || {}

  if (typeof assunto !== 'string' || !assunto.trim() || assunto.length > 200) {
    return res.status(400).json({ erro: 'Informe um assunto (até 200 caracteres).' })
  }
  if (typeof mensagem !== 'string' || !mensagem.trim() || mensagem.length > 5000) {
    return res.status(400).json({ erro: 'Informe a mensagem (até 5000 caracteres).' })
  }
  if (!emailConfigurado()) {
    return res.status(503).json({ erro: 'E-mail não configurado no servidor. Preencha as variáveis SMTP_* no .env.' })
  }

  const destinatarios = emailTeste
    ? [{ id: 0, nome: 'Teste', email: String(emailTeste).trim() }]
    : await buscarDestinatarios()

  if (emailTeste && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatarios[0].email)) {
    return res.status(400).json({ erro: 'E-mail de teste inválido.' })
  }
  if (destinatarios.length === 0) {
    return res.status(400).json({ erro: 'Nenhum cliente com consentimento e e-mail cadastrado.' })
  }

  let enviados = 0
  let falhas = 0
  for (const cliente of destinatarios) {
    try {
      const { texto, html } = montarEmail({ mensagem: mensagem.trim(), cliente })
      await enviarEmail({ para: cliente.email, assunto: assunto.trim(), texto, html })
      enviados += 1
    } catch (error) {
      // Uma falha individual (e-mail inexistente, caixa cheia...) não deve parar a campanha.
      falhas += 1
      console.error(`Falha ao enviar e-mail para o cliente ${cliente.id}:`, error.message)
    }
    await pausa(INTERVALO_ENTRE_ENVIOS_MS)
  }

  res.json({ enviados, falhas, teste: Boolean(emailTeste) })
}))

// Link público de descadastro (vai dentro de cada e-mail). Não exige login: quem clica precisa
// ser descadastrado na hora. A proteção é o token HMAC, que só o servidor sabe gerar.
campanhasRouter.get('/descadastrar', descadastroLimiter, asyncHandler(async (req, res) => {
  const id = Number(req.query.id)
  if (!Number.isInteger(id) || !tokenDescadastroValido(id, req.query.token)) {
    return res.status(400).type('html').send('<p>Link inválido ou expirado.</p>')
  }

  await pool.query('UPDATE clientes SET aceita_promocoes = FALSE, consentimento_em = NULL WHERE id = ?', [id])
  res.type('html').send(
    '<!doctype html><meta charset="utf-8"><body style="font-family:Arial,sans-serif;text-align:center;padding:48px">' +
      '<h2>Pronto! 👋</h2><p>Você não receberá mais promoções da Pizzaria Porteira.</p></body>'
  )
}))
