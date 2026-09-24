// =====================================================================================
// server.js — PONTO DE ENTRADA DO BACKEND (é o arquivo que o `node` executa ao subir a API).
//
// Responsabilidades:
//   1. Validar as variáveis de ambiente obrigatórias (.env);
//   2. Criar o app Express e ligar os middlewares globais (segurança, CORS, JSON);
//   3. Montar cada arquivo de rotas (routes/*.js) sob um prefixo de URL;
//   4. Registrar o tratador global de erros e começar a escutar na porta.
//
// O front-end (site do cliente e painel admin) conversa com esta API via HTTP, sempre
// em URLs que começam com /api/.
// =====================================================================================
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
// Importar 'dotenv/config' lê o arquivo .env e coloca seus valores em process.env.
import 'dotenv/config'
import { pool } from './db/pool.js'
import { pedidosRouter } from './routes/pedidos.js'
import { authRouter } from './routes/auth.js'
import { promocoesRouter } from './routes/promocoes.js'
import { pagamentosRouter } from './routes/pagamentos.js'
import { produtosRouter } from './routes/produtos.js'
import { clientesRouter } from './routes/clientes.js'
import { campanhasRouter } from './routes/campanhas.js'
import { lojaRouter } from './routes/loja.js'

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

// Atrás do proxy de hospedagem (Render), req.ip seria o IP do proxy — o mesmo para todo
// mundo — e os limitadores de taxa (rateLimit.js) tratariam todos os clientes como uma
// pessoa só: 20 pedidos por 15 min para a pizzaria inteira e o login do admin bloqueado
// por tentativas de outros. TRUST_PROXY = quantos proxies confiar (1 = o do Render); use 0
// se o servidor ficar exposto direto na internet. O valor errado é perigoso nos dois
// sentidos, então confira nos logs do Render se aparece algum aviso "ERR_ERL_*".
const trustProxy = Number(process.env.TRUST_PROXY ?? 1)
if (!Number.isInteger(trustProxy) || trustProxy < 0) {
  console.error('TRUST_PROXY deve ser um número inteiro >= 0 (quantidade de proxies confiáveis).')
  process.exit(1)
}
app.set('trust proxy', trustProxy)

// Middlewares globais: funções que rodam em TODA requisição, na ordem em que são
// registradas, antes de ela chegar à rota final.

// Cabeçalhos de segurança padrão (X-Content-Type-Options, HSTS quando servido via HTTPS,
// etc). contentSecurityPolicy fica desligado porque esta API só responde JSON, nunca HTML.
app.use(helmet({ contentSecurityPolicy: false }))
// CORS: o navegador só deixa uma página de outro endereço chamar esta API se o servidor
// autorizar essa origem. Aqui autorizamos apenas o endereço do front-end.
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5273' }))
// Converte o corpo JSON das requisições em objeto disponível em req.body.
app.use(express.json())

// Verifica de verdade se o banco está acessível, não só se o processo Node está de pé.
// Útil para monitoramento/hospedagem saberem se a API está saudável.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    console.error('Healthcheck falhou ao consultar o banco:', err)
    res.status(503).json({ status: 'erro', erro: 'Banco de dados indisponível.' })
  }
})

// Mapa de prefixos de URL -> arquivo de rotas. Dentro de cada arquivo, os caminhos são
// relativos ao prefixo (ex: '/login' em auth.js vira POST /api/auth/login).
app.use('/api/auth', authRouter) // login do admin
app.use('/api/pedidos', pedidosRouter) // criar/listar/atualizar pedidos
app.use('/api/promocoes', promocoesRouter) // promoção de cada dia da semana
app.use('/api/pagamentos', pagamentosRouter) // webhook do Mercado Pago (PIX)
app.use('/api/produtos', produtosRouter) // cardápio editável
app.use('/api/clientes', clientesRouter) // base de clientes (painel admin)
app.use('/api/campanhas', campanhasRouter) // e-mails promocionais e link de descadastro
app.use('/api/loja', lojaRouter) // status aberta/fechada da loja

// Tratador global de erros: o Express o reconhece pelos 4 parâmetros (err, req, res, next).
// Recebe qualquer erro lançado nas rotas (via asyncHandler) e responde de forma genérica,
// sem expor detalhes internos ao cliente; o detalhe fica só no log do servidor.
app.use((err, req, res, next) => {
  // Fila de espera do banco cheia (ver queueLimit em db/pool.js): sobrecarga momentânea,
  // não um bug — responde 503 para o cliente tentar de novo em instantes.
  if (err?.message === 'Queue limit reached.') {
    console.error('Fila do banco cheia: servidor sobrecarregado.')
    return res.status(503).json({ erro: 'Sistema muito ocupado no momento. Tente novamente em instantes.' })
  }
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})

// Sobe o servidor HTTP na porta configurada (3001 por padrão).
const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`API da Pizzaria Porteira rodando em http://localhost:${port}`)
})
