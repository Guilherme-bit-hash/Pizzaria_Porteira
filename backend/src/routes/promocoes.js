import { Router } from 'express'
import { pool } from '../db/pool.js'
import { exigirAdmin } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const promocoesRouter = Router()

function validarPromocao(body) {
  const { nome, descricao, preco, destaque, cor, whatsappMessage, emailSubject, emailBody } = body || {}

  if (typeof nome !== 'string' || !nome.trim()) return null
  if (typeof descricao !== 'string' || !descricao.trim()) return null
  if (typeof preco !== 'number' || Number.isNaN(preco) || preco < 0) return null
  if (typeof cor !== 'string' || !cor.trim()) return null

  return {
    nome: nome.trim(),
    descricao: descricao.trim(),
    preco,
    destaque: Boolean(destaque),
    cor: cor.trim(),
    whatsappMessage: typeof whatsappMessage === 'string' ? whatsappMessage : null,
    emailSubject: typeof emailSubject === 'string' ? emailSubject : null,
    emailBody: typeof emailBody === 'string' ? emailBody : null,
  }
}

function mapLinha(linha) {
  return {
    diaSemana: linha.dia_semana,
    nome: linha.nome,
    descricao: linha.descricao,
    preco: Number(linha.preco),
    destaque: Boolean(linha.destaque),
    cor: linha.cor,
    whatsappMessage: linha.whatsapp_message,
    emailSubject: linha.email_subject,
    emailBody: linha.email_body,
  }
}

// Listar as promoções da semana (público, usado pelo site para mostrar a promoção do dia)
promocoesRouter.get('/', asyncHandler(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM promocoes ORDER BY dia_semana')
  res.json(linhas.map(mapLinha))
}))

// Criar/atualizar a promoção de um dia da semana (painel admin)
promocoesRouter.put('/:dia', exigirAdmin, asyncHandler(async (req, res) => {
  const dia = Number(req.params.dia)
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
    return res.status(400).json({ erro: 'Dia da semana inválido. Use um número de 0 (domingo) a 6 (sábado).' })
  }

  const dados = validarPromocao(req.body)
  if (!dados) {
    return res.status(400).json({ erro: 'Dados da promoção inválidos. Verifique nome, descrição, preço e cor.' })
  }

  await pool.query(
    `INSERT INTO promocoes (dia_semana, nome, descricao, preco, destaque, cor, whatsapp_message, email_subject, email_body)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome = VALUES(nome),
       descricao = VALUES(descricao),
       preco = VALUES(preco),
       destaque = VALUES(destaque),
       cor = VALUES(cor),
       whatsapp_message = VALUES(whatsapp_message),
       email_subject = VALUES(email_subject),
       email_body = VALUES(email_body)`,
    [
      dia,
      dados.nome,
      dados.descricao,
      dados.preco,
      dados.destaque,
      dados.cor,
      dados.whatsappMessage,
      dados.emailSubject,
      dados.emailBody,
    ]
  )

  res.json({ diaSemana: dia, ...dados })
}))
