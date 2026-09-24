// src/services/lojaService.ts
// Camada de acesso ao backend para o STATUS DA LOJA (endpoints /api/loja/*).
// Usado pelo site (Cardapio.tsx, Pedido.tsx — leitura pública) e pelo painel admin
// (AdminDashboard.tsx — leitura e o botão de abrir/fechar, que exige token).
import { getAdminToken } from './pedidoService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// GET /api/loja/status — se o backend estiver fora do ar, assume aberta (não faz sentido
// bloquear o site inteiro por causa de uma falha de rede pontual nessa checagem).
export async function consultarStatusLoja(): Promise<boolean> {
  try {
    const resposta = await fetch(`${API_URL}/loja/status`)
    const dados = await tratarResposta(resposta)
    return Boolean(dados?.aberta)
  } catch (error) {
    console.error('Não foi possível consultar o status da loja:', error)
    return true
  }
}

// PUT /api/loja/status — liga/desliga o aceite de pedidos novos (painel admin).
export async function atualizarStatusLoja(aberta: boolean): Promise<boolean> {
  const resposta = await fetch(`${API_URL}/loja/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify({ aberta }),
  })
  const dados = await tratarResposta(resposta)
  return Boolean(dados.aberta)
}
