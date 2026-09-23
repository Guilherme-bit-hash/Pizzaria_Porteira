import { getAdminToken } from './pedidoService'
import type { StatusPedido } from './pedidoService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Cliente {
  id: number
  nome: string
  telefone: string
  email: string | null
  endereco: string
  complemento: string | null
  aceitaPromocoes: boolean
  consentimentoEm: string | null
  criadoEm: string
  totalPedidos: number
  totalGasto: number
  ultimoPedidoEm: string | null
}

export interface PedidoDoCliente {
  id: number
  itens: { nome: string; quantidade: number }[]
  total: string
  status: StatusPedido
  criado_em: string
}

export interface ClienteDetalhado extends Cliente {
  pedidos: PedidoDoCliente[]
}

function cabecalhosAdmin() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  }
}

async function tratarResposta(resposta: Response) {
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }
  return dados
}

export async function listarClientes(busca: string, somentePromocoes: boolean): Promise<Cliente[]> {
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (somentePromocoes) params.set('promocoes', '1')
  return tratarResposta(await fetch(`${API_URL}/clientes?${params}`, { headers: cabecalhosAdmin() }))
}

export async function detalharCliente(id: number): Promise<ClienteDetalhado> {
  return tratarResposta(await fetch(`${API_URL}/clientes/${id}`, { headers: cabecalhosAdmin() }))
}

export async function atualizarConsentimento(id: number, aceitaPromocoes: boolean) {
  return tratarResposta(
    await fetch(`${API_URL}/clientes/${id}/consentimento`, {
      method: 'PATCH',
      headers: cabecalhosAdmin(),
      body: JSON.stringify({ aceitaPromocoes }),
    })
  )
}

// Baixa o CSV pelo fetch (e não por um link) porque a rota exige o token no header.
export async function baixarClientesCsv(somentePromocoes: boolean): Promise<void> {
  const resposta = await fetch(`${API_URL}/clientes/exportar${somentePromocoes ? '?promocoes=1' : ''}`, {
    headers: cabecalhosAdmin(),
  })
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    throw new Error(dados?.erro || `Erro na requisição (${resposta.status})`)
  }

  const url = URL.createObjectURL(await resposta.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'clientes.csv'
  link.click()
  URL.revokeObjectURL(url)
}
