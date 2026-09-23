// src/services/promocaoService.ts
// Camada de acesso ao backend para as PROMOÇÕES DA SEMANA (endpoints /api/promocoes/*).
// Usado por hooks/usePromocaoDoDia.ts (leitura pública) e Pages/AdminPromocoes.tsx (edição, exige token de admin).
import { getAdminToken } from './pedidoService'

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Promoção de um dia da semana como retornada pelo backend.
export interface PromocaoApi {
  // 0 = domingo ... 6 = sábado (mesma convenção de Date.getDay())
  diaSemana: number
  nome: string
  descricao: string
  preco: number
  destaque: boolean
  cor: string
  // Textos opcionais usados ao divulgar a promoção por WhatsApp e e-mail
  whatsappMessage: string | null
  emailSubject: string | null
  emailBody: string | null
}

// Dados editáveis de uma promoção: tudo menos o dia (que vai na URL).
export type DadosPromocao = Omit<PromocaoApi, 'diaSemana'>

// Lê a resposta como JSON e transforma erros HTTP em exceções com a mensagem do backend.
async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// GET /api/promocoes (rota pública)
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

// PUT /api/promocoes/:diaSemana (rota de admin)
// Altera a promoção de um dia da semana.
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
