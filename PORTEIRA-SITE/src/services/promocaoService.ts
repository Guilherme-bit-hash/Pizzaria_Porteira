import { getAdminToken } from './pedidoService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface PromocaoApi {
  diaSemana: number
  nome: string
  descricao: string
  preco: number
  destaque: boolean
  cor: string
  whatsappMessage: string | null
  emailSubject: string | null
  emailBody: string | null
}

export type DadosPromocao = Omit<PromocaoApi, 'diaSemana'>

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// Busca as promoções da semana no backend. Retorna null quando o backend está indisponível,
// para o site poder cair de volta nas promoções padrão embutidas no código.
export async function listarPromocoes(): Promise<PromocaoApi[] | null> {
  try {
    const resposta = await fetch(`${API_URL}/promocoes`)
    return await tratarResposta(resposta)
  } catch (error) {
    console.error('Não foi possível carregar as promoções do backend:', error)
    return null
  }
}

export async function atualizarPromocao(diaSemana: number, dados: DadosPromocao): Promise<PromocaoApi> {
  const resposta = await fetch(`${API_URL}/promocoes/${diaSemana}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify(dados),
  })
  return tratarResposta(resposta)
}
