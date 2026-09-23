// src/services/clienteService.ts
// Camada de acesso ao backend para a BASE DE CLIENTES (endpoints /api/clientes/*).
// Usado por Pages/AdminClientes.tsx. Todas as chamadas exigem o token de administrador.
import { getAdminToken } from './pedidoService'
import type { StatusPedido } from './pedidoService'

// Endereço base do backend (vem do .env; se não existir, usa o backend local)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Cliente como retornado pela listagem, com os totais já calculados pelo backend.
export interface Cliente {
  id: number
  nome: string
  telefone: string
  email: string | null
  endereco: string
  complemento: string | null
  // Consentimento (LGPD) para receber promoções por e-mail, e quando foi dado
  aceitaPromocoes: boolean
  consentimentoEm: string | null
  criadoEm: string
  totalPedidos: number
  totalGasto: number
  ultimoPedidoEm: string | null
}

// Resumo de um pedido dentro do histórico de um cliente.
export interface PedidoDoCliente {
  id: number
  itens: { nome: string; quantidade: number }[]
  total: string
  status: StatusPedido
  criado_em: string
}

// Cliente + histórico de pedidos (resposta de GET /clientes/:id).
export interface ClienteDetalhado extends Cliente {
  pedidos: PedidoDoCliente[]
}

// Cabeçalhos HTTP das rotas protegidas: JSON + token de admin no formato "Bearer".
function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

// Lê a resposta como JSON e transforma erros HTTP em exceções com a mensagem do backend.
async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

// GET /api/clientes?busca=...&promocoes=1 — lista clientes, com busca por texto e filtro de quem aceita promoções.
export async function listarClientes(busca: string, somentePromocoes: boolean): Promise<Cliente[]> {
  // URLSearchParams monta a query string (?busca=...) já com o escape correto
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (somentePromocoes) params.set('promocoes', '1')
  return tratarResposta(await fetch(`${API_URL}/clientes?${params}`, { headers: cabecalhosAdmin() }))
}

// GET /api/clientes/:id — dados de um cliente e o histórico de pedidos dele.
export async function detalharCliente(id: number): Promise<ClienteDetalhado> {
  return tratarResposta(await fetch(`${API_URL}/clientes/${id}`, { headers: cabecalhosAdmin() }))
}

// PATCH /api/clientes/:id/consentimento — liga/desliga o consentimento de receber promoções.
export async function atualizarConsentimento(id: number, aceitaPromocoes: boolean) {
  return tratarResposta(
    await fetch(`${API_URL}/clientes/${id}/consentimento`, {
      method: 'PATCH',
      headers: cabecalhosAdmin(),
      body: JSON.stringify({ aceitaPromocoes }),
    })
  )
}

// GET /api/clientes/exportar — baixa a lista de clientes como arquivo CSV.
// Baixa o CSV pelo fetch (e não por um link) porque a rota exige o token no header.
export async function baixarClientesCsv(somentePromocoes: boolean): Promise<void> {
  const resposta = await fetch(`${API_URL}/clientes/exportar${somentePromocoes ? '?promocoes=1' : ''}`, {
    headers: cabecalhosAdmin(),
  })
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }

  // Transforma o conteúdo em um arquivo temporário no navegador e simula um clique
  // em um link invisível para disparar o download.
  const url = URL.createObjectURL(await resposta.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'clientes.csv'
  link.click()
  // Libera a memória usada pelo arquivo temporário
  URL.revokeObjectURL(url)
}
