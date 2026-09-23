import nodemailer from 'nodemailer'
import crypto from 'node:crypto'
import 'dotenv/config'

let transporter = null

// O envio usa SMTP genérico, então funciona com Gmail (senha de app), Brevo, Resend, Mailgun etc.
// Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env (veja o .env.example).
export function emailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

// Cria o transporter sob demanda (e não na importação) para que o servidor continue subindo
// normalmente sem SMTP configurado — só o envio de campanhas fica indisponível, com erro claro.
function getTransporter() {
  if (transporter) return transporter

  if (!emailConfigurado()) {
    throw new Error('E-mail não configurado: preencha SMTP_HOST, SMTP_USER e SMTP_PASS no .env.')
  }

  const porta = Number(process.env.SMTP_PORT) || 587
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    // Porta 465 usa TLS direto; as demais (587) começam sem TLS e fazem upgrade (STARTTLS).
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

export async function enviarEmail({ para, assunto, texto, html }) {
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html,
  })
}

// Token do link de descadastro: HMAC do id do cliente com o JWT_SECRET. Assim ninguém consegue
// descadastrar outro cliente adivinhando ids, e não precisamos guardar nada extra no banco.
export function gerarTokenDescadastro(clienteId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`descadastrar:${clienteId}`).digest('hex')
}

export function tokenDescadastroValido(clienteId, token) {
  const esperado = Buffer.from(gerarTokenDescadastro(clienteId))
  const recebido = Buffer.from(String(token || ''))
  // timingSafeEqual exige buffers do mesmo tamanho e evita vazar informação pelo tempo de resposta.
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido)
}

// Escapa HTML para o texto digitado no painel virar conteúdo seguro dentro do e-mail.
export function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
