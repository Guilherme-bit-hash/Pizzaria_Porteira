import { getAdminToken } from './pedidoService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export type CategoriaProduto = 'pizza' | 'hamburguer' | 'bebida' | 'sobremesa'

export interface Produto {
  id: number
  categoria: CategoriaProduto
  nome: string
  descricao: string
  preco: number
  imagemUrl: string | null
  ativo: boolean
  ordem: number
}

export type DadosProduto = Omit<Produto, 'id'>

async function tratarResposta(resposta: Response) {
  if (resposta.status === 204) return null
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

// Cardápio público (só produtos ativos). Lança erro se o backend estiver fora do ar.
export async function listarCardapio(): Promise<Produto[]> {
  return tratarResposta(await fetch(`${API_URL}/produtos`))
}

export async function listarProdutosAdmin(): Promise<Produto[]> {
  return tratarResposta(await fetch(`${API_URL}/produtos/admin`, { headers: cabecalhosAdmin() }))
}

export async function criarProduto(dados: DadosProduto): Promise<Produto> {
  return tratarResposta(
    await fetch(`${API_URL}/produtos`, {
      method: 'POST',
      headers: cabecalhosAdmin(),
      body: JSON.stringify(dados),
    })
  )
}

export async function atualizarProduto(id: number, dados: DadosProduto): Promise<Produto> {
  return tratarResposta(
    await fetch(`${API_URL}/produtos/${id}`, {
      method: 'PUT',
      headers: cabecalhosAdmin(),
      body: JSON.stringify(dados),
    })
  )
}

export async function excluirProduto(id: number): Promise<void> {
  await tratarResposta(
    await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE', headers: cabecalhosAdmin() })
  )
}
