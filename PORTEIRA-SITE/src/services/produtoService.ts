// src/services/produtoService.ts
// Camada de acesso ao backend para o CARDÁPIO / PRODUTOS (endpoints /api/produtos/*).
// Usado por Pages/Cardapio.tsx (leitura pública) e Pages/AdminProdutos.tsx (edição, exige token de admin).
import { getAdminToken } from './pedidoService'
import { urlImagemProduto } from '../utils/imagemProduto'

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

// Guarda em memória a última busca do cardápio por 30 s. Assim, a busca iniciada na landing
// page (prefetchCardapio) é aproveitada pela página do cardápio, que abre já com os dados.
// A promessa fica guardada, não só o resultado: se o cardápio abrir enquanto a busca ainda
// está em andamento, ele espera a mesma requisição em vez de disparar outra.
const VALIDADE_CACHE_MS = 30 * 1000
let cacheCardapio: { promessa: Promise<Produto[]>; criadoEm: number } | null = null

// GET /api/produtos
// Cardápio público (só produtos ativos). Lança erro se o backend estiver fora do ar.
// `forcar: true` ignora o que está em memória (usado ao conferir preços do carrinho, que
// precisam ser os atuais).
export function listarCardapio(opcoes: { forcar?: boolean } = {}): Promise<Produto[]> {
  const agora = Date.now()
  if (!opcoes.forcar && cacheCardapio && agora - cacheCardapio.criadoEm < VALIDADE_CACHE_MS) {
    return cacheCardapio.promessa
  }

  const promessa = fetch(`${API_URL}/produtos`).then(tratarResposta) as Promise<Produto[]>
  cacheCardapio = { promessa, criadoEm: agora }
  // Falha não fica guardada: o "Tentar novamente" precisa fazer uma busca nova de verdade.
  promessa.catch(() => {
    if (cacheCardapio?.promessa === promessa) cacheCardapio = null
  })
  return promessa
}

// Adianta o carregamento do cardápio enquanto o cliente ainda está na landing page: já busca
// os produtos (o que também "acorda" o backend do Render, que dorme quando fica parado) e
// baixa as imagens das 3 primeiras pizzas, que são as primeiras que aparecem no cardápio.
// Erros são ignorados aqui — se falhar, o cardápio simplesmente busca de novo ao abrir.
export function prefetchCardapio(): void {
  listarCardapio()
    .then((produtos) => {
      produtos
        .filter((produto) => produto.categoria === 'pizza')
        .slice(0, 3)
        .forEach((produto) => {
          new Image().src = urlImagemProduto(produto)
        })
    })
    .catch(() => {})
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
