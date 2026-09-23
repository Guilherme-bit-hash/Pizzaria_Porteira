// src/contexts/CarrinhoContext.tsx - VERSÃO CORRIGIDA
import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

const CARRINHO_STORAGE_KEY = 'pizzaria-porteira:carrinho'

export type ItemCarrinho = {
  id: string
  nome: string
  descricao: string
  preco: number
  quantidade: number
  categoria: 'pizza' | 'hamburguer' | 'bebida' | 'sobremesa' | 'promocao'
  observacoes?: string
}

type CarrinhoContextType = {
  itens: ItemCarrinho[]
  total: number
  quantidadeTotal: number
  adicionarItem: (item: Omit<ItemCarrinho, 'id' | 'quantidade'>) => void
  removerItem: (id: string) => void
  atualizarQuantidade: (id: string, quantidade: number) => void
  adicionarObservacao: (id: string, observacoes: string) => void
  limparCarrinho: () => void
  sincronizarComCardapio: (produtos: { nome: string; preco: number }[]) => {
    removidos: string[]
    reajustados: string[]
  }
}

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined)

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext)
  if (!context) {
    throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider')
  }
  return context
}

export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  const [itens, setItens] = useState<ItemCarrinho[]>(() => {
    try {
      const salvo = localStorage.getItem(CARRINHO_STORAGE_KEY)
      return salvo ? JSON.parse(salvo) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens))
    } catch {
      // localStorage indisponível (modo privado, quota excedida etc.) — ignora
    }
  }, [itens])

  const gerarId = () => Math.random().toString(36).slice(2, 11)

  const total = itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)

  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0)

  const adicionarItem = (item: Omit<ItemCarrinho, 'id' | 'quantidade'>) => {
    setItens(prev => {
      const itemExistenteIndex = prev.findIndex(
        i => i.nome === item.nome && i.observacoes === item.observacoes
      )

      if (itemExistenteIndex !== -1) {
        const novosItens = [...prev]
        novosItens[itemExistenteIndex].quantidade += 1
        return novosItens
      } else {
        return [...prev, { ...item, id: gerarId(), quantidade: 1 }]
      }
    })
  }

  const removerItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id))
  }

  const atualizarQuantidade = (id: string, quantidade: number) => {
    if (quantidade < 1) {
      removerItem(id)
      return
    }

    setItens(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantidade } : item
      )
    )
  }

  const adicionarObservacao = (id: string, observacoes: string) => {
    setItens(prev =>
      prev.map(item =>
        item.id === id ? { ...item, observacoes } : item
      )
    )
  }

  const limparCarrinho = () => {
    setItens([])
  }

  // Alinha o carrinho com o cardápio atual (o admin pode ter mudado preços ou tirado produtos
  // do ar depois que o cliente adicionou o item). Promoções ficam de fora: não são do cardápio.
  const sincronizarComCardapio: CarrinhoContextType['sincronizarComCardapio'] = (produtos) => {
    const precoPorNome = new Map(produtos.map((produto) => [produto.nome, produto.preco]))
    const removidos: string[] = []
    const reajustados: string[] = []

    const atualizados = itens.flatMap((item) => {
      if (item.categoria === 'promocao') return [item]

      const precoAtual = precoPorNome.get(item.nome)
      if (precoAtual === undefined) {
        removidos.push(item.nome)
        return []
      }
      if (Math.abs(precoAtual - item.preco) > 0.001) {
        reajustados.push(item.nome)
        return [{ ...item, preco: precoAtual }]
      }
      return [item]
    })

    if (removidos.length > 0 || reajustados.length > 0) setItens(atualizados)
    return { removidos, reajustados }
  }

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        total,
        quantidadeTotal,
        adicionarItem,
        removerItem,
        atualizarQuantidade,
        adicionarObservacao,
        limparCarrinho,
        sincronizarComCardapio
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  )
}