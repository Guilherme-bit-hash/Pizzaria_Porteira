import { getAdminToken } from './pedidoService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface StatusCampanha {
  emailConfigurado: boolean
  totalDestinatarios: number
}

export interface ResultadoEnvio {
  enviados: number
  falhas: number
  teste: boolean
}

function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

export async function obterStatusCampanha(): Promise<StatusCampanha> {
  return tratarResposta(await fetch(`${API_URL}/campanhas/status`, { headers: cabecalhosAdmin() }))
}

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
