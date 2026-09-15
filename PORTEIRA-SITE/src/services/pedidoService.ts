import type { ItemCarrinho } from '../contexts/CarrinhoContexts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'pizzaria-porteira:admin-token'

export type StatusPedido = 'recebido' | 'preparando' | 'saiu_para_entrega' | 'entregue' | 'cancelado'

export interface Pedido {
  id: number
  cliente_nome: string
  cliente_telefone: string
  endereco: string
  complemento: string | null
  observacoes: string | null
  itens: ItemCarrinho[]
  total: string
  status: StatusPedido
  criado_em: string
  atualizado_em: string
}

export interface DadosNovoPedido {
  nome: string
  telefone: string
  endereco: string
  complemento?: string
  observacoes?: string
  itens: ItemCarrinho[]
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function limparAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// Registra o pedido no backend. Usado no checkout antes de redirecionar ao WhatsApp.
// Retorna null (em vez de lançar erro) quando o backend está indisponível, para não travar o pedido via WhatsApp.
export async function criarPedido(dados: DadosNovoPedido) {
  try {
    const resposta = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    return await tratarResposta(resposta)
  } catch (error) {
    console.error('Não foi possível registrar o pedido no backend:', error)
    return null
  }
}

export async function loginAdmin(usuario: string, senha: string) {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha }),
  })
  const dados = await tratarResposta(resposta)
  setAdminToken(dados.token)
  return dados.token as string
}

export async function listarPedidos(): Promise<Pedido[]> {
  const resposta = await fetch(`${API_URL}/pedidos`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  })
  return tratarResposta(resposta)
}

export async function atualizarStatusPedido(id: number, status: StatusPedido) {
  const resposta = await fetch(`${API_URL}/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify({ status }),
  })
  return tratarResposta(resposta)
}
