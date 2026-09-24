// src/services/pedidoService.ts
// Camada de acesso ao backend para PEDIDOS e LOGIN DE ADMIN (endpoints /api/pedidos/* e /api/auth/login).
// Também guarda no localStorage do navegador o token de admin e a marca "já fez pedido".
// Usado por Pages/Pedido.tsx (checkout), Pages/AdminLogin.tsx, Pages/AdminPedidos.tsx
// e importado pelos outros services para reaproveitar getAdminToken().
import type { ItemCarrinho } from '../contexts/CarrinhoContexts'

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
// Chaves usadas no localStorage (armazenamento persistente do navegador)
const TOKEN_KEY = 'pizzaria-porteira:admin-token'
const PEDIDO_REALIZADO_KEY = 'pizzaria-porteira:pedido-realizado'

// Cupom de primeira compra.
// Precisam bater com as constantes equivalentes em backend/src/routes/pedidos.js —
// o backend é quem decide de fato se o desconto é aplicado, isso aqui é só para exibição.
export const CUPOM_PRIMEIRA_COMPRA = 'BEMVINDO10'
export const CUPOM_PERCENTUAL = 0.1
export const CUPOM_VALOR_MINIMO = 80

// Regras de encomenda (espelham backend/src/routes/pedidos.js; o servidor é quem valida).
export const ENCOMENDA_MIN_MINUTOS = 60
export const ENCOMENDA_MAX_DIAS = 30
export const ENCOMENDA_SINAL_PERCENTUAL = 0.5

// Etapas pelas quais um pedido passa, na ordem do fluxo da cozinha/entrega.
export type StatusPedido = 'recebido' | 'preparando' | 'saiu_para_entrega' | 'entregue' | 'cancelado'

// Pedido como retornado pelo backend (nomes em snake_case porque vêm direto das colunas do banco).
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
  // Encomenda: data/hora combinada (null = pedido para agora) e sinal cobrado no PIX (0 = total)
  agendado_para: string | null
  sinal: string
  criado_em: string
  atualizado_em: string
}

// Dados que o checkout envia para criar um pedido novo.
export interface DadosNovoPedido {
  nome: string
  telefone: string
  endereco: string
  complemento?: string
  observacoes?: string
  itens: ItemCarrinho[]
  cupom?: string
  email?: string
  aceitaPromocoes?: boolean
  // Encomenda: data/hora futura (ISO) e, opcionalmente, pagar só o sinal de 50% agora
  agendadoPara?: string
  pagarSinal?: boolean
}

// Confirmação devolvida pelo backend: valores já calculados no servidor (subtotal, desconto, total).
export interface RespostaNovoPedido {
  id: number
  subtotal: number
  desconto: number
  cupom: string | null
  total: number
  sinal: number
  agendadoPara: string | null
  status: StatusPedido
}

// Métricas do dia para o dashboard do painel admin (GET /api/pedidos/metricas/hoje).
export interface MetricasHoje {
  totalHoje: number
  faturamentoHoje: number
  ticketMedio: number
  porStatus: Record<StatusPedido, number>
}

// ---- Token de administrador (guardado no localStorage) ----

// Lê o token salvo no login (null se não estiver logado).
export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

// Remove o token (logout).
export function limparAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ---- Marca de "primeiro pedido" ----

// Usado para saber se o cliente já finalizou algum pedido neste navegador,
// e assim decidir se ainda vale mostrar a promoção de primeira compra.
export function jaFezPedido() {
  return localStorage.getItem(PEDIDO_REALIZADO_KEY) === 'true'
}

export function marcarPedidoRealizado() {
  localStorage.setItem(PEDIDO_REALIZADO_KEY, 'true')
}

// Lê a resposta como JSON e transforma erros HTTP em exceções com a mensagem do backend.
async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// POST /api/pedidos (rota pública)
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

// GET /api/pedidos/cupom-primeira-compra/elegivel?telefone=...
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

// POST /api/auth/login
// Faz login do administrador; em caso de sucesso guarda o token no localStorage e o devolve.
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

// GET /api/pedidos (rota de admin: exige o token no cabeçalho Authorization)
// Lista todos os pedidos para o painel.
export async function listarPedidos(): Promise<Pedido[]> {
  const resposta = await fetch(`${API_URL}/pedidos`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  })
  return tratarResposta(resposta)
}

// GET /api/pedidos/metricas/hoje (rota de admin)
// Números do dia (pedidos, faturamento, ticket médio e contagem por status) para o dashboard.
export async function buscarMetricasHoje(): Promise<MetricasHoje> {
  const resposta = await fetch(`${API_URL}/pedidos/metricas/hoje`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  })
  return tratarResposta(resposta)
}

// PATCH /api/pedidos/:id/status (rota de admin)
// Move o pedido para outra etapa (ex.: recebido -> preparando).
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
