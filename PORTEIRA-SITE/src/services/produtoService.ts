// src/services/produtoService.ts
// Camada de acesso ao backend para o CARDÁPIO / PRODUTOS (endpoints /api/produtos/*).
// Usado por Pages/Cardapio.tsx (leitura pública) e Pages/AdminProdutos.tsx (edição, exige token de admin).
import { getAdminToken } from './pedidoService'

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Categorias possíveis de um produto (também definem as seções do cardápio).
export type CategoriaProduto = 'pizza' | 'hamburguer' | 'bebida' | 'sobremesa'

// Produto como retornado pelo backend.
export interface Produto {
  id: number
  categoria: CategoriaProduto
  nome: string
  descricao: string
  preco: number
  imagemUrl: string | null
  // false = escondido do cardápio público, mas ainda visível no admin
  ativo: boolean
  // Posição de exibição dentro da categoria
  ordem: number
}

// Dados para criar/editar um produto: tudo do Produto menos o id (que o banco gera).
export type DadosProduto = Omit<Produto, 'id'>

// Lê a resposta como JSON e transforma erros HTTP em exceções com a mensagem do backend.
// Status 204 (sem conteúdo, usado no DELETE) não tem corpo para ler.
async function tratarResposta(resposta: Response) {
  if (resposta.status === 204) return null
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// Cabeçalhos HTTP das rotas protegidas: JSON + token de admin no formato "Bearer".
function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

// GET /api/produtos
// Cardápio público (só produtos ativos). Lança erro se o backend estiver fora do ar.
export async function listarCardapio(): Promise<Produto[]> {
  return tratarResposta(await fetch(`${API_URL}/produtos`))
}

// GET /api/produtos/admin — todos os produtos, inclusive os inativos.
export async function listarProdutosAdmin(): Promise<Produto[]> {
  return tratarResposta(await fetch(`${API_URL}/produtos/admin`, { headers: cabecalhosAdmin() }))
}

// POST /api/produtos — cria um produto novo.
export async function criarProduto(dados: DadosProduto): Promise<Produto> {
  return tratarResposta(
    await fetch(`${API_URL}/produtos`, {
      method: 'POST',
      headers: cabecalhosAdmin(),
      body: JSON.stringify(dados),
    })
  )
}

// PUT /api/produtos/:id — substitui os dados de um produto existente.
export async function atualizarProduto(id: number, dados: DadosProduto): Promise<Produto> {
  return tratarResposta(
    await fetch(`${API_URL}/produtos/${id}`, {
      method: 'PUT',
      headers: cabecalhosAdmin(),
      body: JSON.stringify(dados),
    })
  )
}

// DELETE /api/produtos/:id — remove o produto.
export async function excluirProduto(id: number): Promise<void> {
  await tratarResposta(
    await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE', headers: cabecalhosAdmin() })
  )
}
