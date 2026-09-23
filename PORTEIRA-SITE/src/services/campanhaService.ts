// src/services/campanhaService.ts
// Camada de acesso ao backend para CAMPANHAS DE E-MAIL (endpoints /api/campanhas/*).
// Usado por Pages/AdminCampanhas.tsx. Todas as chamadas exigem o token de administrador.
import { getAdminToken } from './pedidoService'

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Resposta de GET /campanhas/status: se o envio de e-mail está configurado no backend
// e quantos clientes vão receber (os que aceitaram promoções).
export interface StatusCampanha {
  emailConfigurado: boolean
  totalDestinatarios: number
}

// Resposta de POST /campanhas/email: quantos e-mails saíram, quantos falharam e se foi só um teste.
export interface ResultadoEnvio {
  enviados: number
  falhas: number
  teste: boolean
}

// Cabeçalhos HTTP das rotas protegidas: JSON + token de admin no formato "Bearer".
function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

// Lê a resposta do backend como JSON e converte erros HTTP em exceções (Error)
// com a mensagem enviada pelo backend no campo "erro".
async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// GET /api/campanhas/status
export async function obterStatusCampanha(): Promise<StatusCampanha> {
  return tratarResposta(await fetch(`${API_URL}/campanhas/status`, { headers: cabecalhosAdmin() }))
}

// POST /api/campanhas/email
// Sem `emailTeste`, envia para todos os clientes que aceitaram promoções.
export async function enviarCampanhaEmail(
  assunto: string,
  mensagem: string,
  emailTeste?: string
): Promise<ResultadoEnvio> {
  return tratarResposta(
    await fetch(`${API_URL}/campanhas/email`, {
      method: 'POST',
      headers: cabecalhosAdmin(),
      body: JSON.stringify({ assunto, mensagem, emailTeste: emailTeste || undefined }),
    })
  )
}
