import type { ItemCarrinho } from '../contexts/CarrinhoContexts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'pizzaria-porteira:admin-token'
const PEDIDO_REALIZADO_KEY = 'pizzaria-porteira:pedido-realizado'

// Precisam bater com as constantes equivalentes em backend/src/routes/pedidos.js —
// o backend é quem decide de fato se o desconto é aplicado, isso aqui é só para exibição.
export const CUPOM_PRIMEIRA_COMPRA = 'BEMVINDO10'
export const CUPOM_PERCENTUAL = 0.1
export const CUPOM_VALOR_MINIMO = 80

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
  forma_pagamento: 'whatsapp' | 'pix'
  pagamento_status: 'pendente' | 'aprovado' | 'recusado' | 'expirado' | null
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
  cupom?: string
}

export interface RespostaNovoPedido {
  id: number
  subtotal: number
  desconto: number
  cupom: string | null
  total: number
  status: StatusPedido
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

// Usado para saber se o cliente já finalizou algum pedido neste navegador,
// e assim decidir se ainda vale mostrar a promoção de primeira compra.
export function jaFezPedido() {
  return localStorage.getItem(PEDIDO_REALIZADO_KEY) === 'true'
}

export function marcarPedidoRealizado() {
  localStorage.setItem(PEDIDO_REALIZADO_KEY, 'true')
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
export async function criarPedido(dados: DadosNovoPedido): Promise<RespostaNovoPedido | null> {
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

// Verifica no backend se o telefone informado ainda tem direito ao cupom de primeira
// compra (nunca fez pedido antes). Usado só para dar feedback visual no checkout —
// a validação que realmente vale é feita de novo no servidor ao criar o pedido.
export async function verificarCupomPrimeiraCompra(telefone: string): Promise<boolean> {
  try {
    const resposta = await fetch(
      `${API_URL}/pedidos/cupom-primeira-compra/elegivel?telefone=${encodeURIComponent(telefone)}`
    )
    const dados = await tratarResposta(resposta)
    return Boolean(dados?.elegivel)
  } catch (error) {
    console.error('Não foi possível verificar o cupom de primeira compra:', error)
    return false
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
