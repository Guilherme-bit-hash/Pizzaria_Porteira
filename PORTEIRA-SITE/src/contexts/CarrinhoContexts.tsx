// src/contexts/CarrinhoContexts.tsx
// CARRINHO DE COMPRAS compartilhado por todo o site, usando "Context" do React.
// Context = uma caixa de dados global: o CarrinhoProvider (montado em App.tsx) guarda o estado
// e qualquer componente abaixo dele lê/altera o carrinho chamando o hook useCarrinho().
// Usado por Pages/Cardapio.tsx, Pages/Pedido.tsx, components/Navbar etc.
// O carrinho é salvo no localStorage do navegador, então sobrevive a recarregar a página.
// Não fala com o backend: o envio do pedido é feito em services/pedidoService.ts.
import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

// Chave sob a qual o carrinho é guardado no localStorage
const CARRINHO_STORAGE_KEY = 'pizzaria-porteira:carrinho'

// Um item dentro do carrinho.
export type ItemCarrinho = {
  // Identificador único da linha do carrinho (gerado aqui, não vem do banco)
  id: string
  nome: string
  descricao: string
  preco: number
  quantidade: number
  // 'promocao' é para itens vindos das promoções do dia (não fazem parte do cardápio)
  categoria: 'pizza' | 'hamburguer' | 'bebida' | 'sobremesa' | 'promocao'
  observacoes?: string
}

// Tudo o que o contexto oferece a quem chamar useCarrinho(): dados calculados e ações.
type CarrinhoContextType = {
  itens: ItemCarrinho[]
  // Soma em R$ de preco * quantidade
  total: number
  // Soma das quantidades (número exibido no ícone do carrinho)
  quantidadeTotal: number
  adicionarItem: (item: Omit<ItemCarrinho, 'id' | 'quantidade'>) => void
  removerItem: (id: string) => void
  atualizarQuantidade: (id: string, quantidade: number) => void
  adicionarObservacao: (id: string, observacoes: string) => void
  limparCarrinho: () => void
  // Ajusta o carrinho ao cardápio atual e informa o que foi removido/reajustado
  sincronizarComCardapio: (produtos: { nome: string; preco: number }[]) => {
    removidos: string[]
    reajustados: string[]
  }
}

// Cria o contexto. O valor inicial "undefined" serve para detectar uso fora do Provider (ver useCarrinho).
const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined)

// Hook para os componentes acessarem o carrinho: const { itens, adicionarItem } = useCarrinho()
export const useCarrinho = () => {
  const context = useContext(CarrinhoContext)
  if (!context) {
    throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider')
  }
  return context
}

// Provider: componente que guarda o estado do carrinho e o "distribui" aos filhos (children).
export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  // ESTADO do carrinho. useState devolve o valor atual e uma função para alterá-lo.
  // A função passada como valor inicial roda só na primeira renderização:
  // recupera o carrinho salvo no localStorage (ou começa vazio se não houver/der erro).
  const [itens, setItens] = useState<ItemCarrinho[]>(() => {
    try {
      const salvo = localStorage.getItem(CARRINHO_STORAGE_KEY)
      return salvo ? JSON.parse(salvo) : []
    } catch {
      return []
    }
  })

  // EFFECT: useEffect executa código "de efeito colateral" depois da renderização.
  // Este roda sempre que "itens" muda (lista de dependências no final) e grava o carrinho no localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens))
    } catch {
      // localStorage indisponível (modo privado, quota excedida etc.) — ignora
    }
  }, [itens])

  // Gera um id curto e aleatório para cada linha nova do carrinho
  const gerarId = () => Math.random().toString(36).slice(2, 11)

  // ---- Valores derivados (calculados a cada renderização a partir de "itens") ----
  const total = itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)

  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0)

  // ---- Ações que alteram o carrinho ----

  // Adiciona um item. Se já existe um igual (mesmo nome e mesma observação), só soma 1 na quantidade.
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

  // Tira uma linha do carrinho pelo id.
  const removerItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id))
  }

  // Define a quantidade de uma linha; abaixo de 1 equivale a remover o item.
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

  // Guarda a observação do cliente (ex.: "sem cebola") em uma linha do carrinho.
  const adicionarObservacao = (id: string, observacoes: string) => {
    setItens(prev =>
      prev.map(item =>
        item.id === id ? { ...item, observacoes } : item
      )
    )
  }

  // Esvazia o carrinho (usado após finalizar o pedido).
  const limparCarrinho = () => {
    setItens([])
  }

  // Alinha o carrinho com o cardápio atual (o admin pode ter mudado preços ou tirado produtos
  // do ar depois que o cliente adicionou o item). Promoções ficam de fora: não são do cardápio.
  const sincronizarComCardapio: CarrinhoContextType['sincronizarComCardapio'] = (produtos) => {
    // Mapa nome -> preço atual, para consulta rápida
    const precoPorNome = new Map(produtos.map((produto) => [produto.nome, produto.preco]))
    const removidos: string[] = []
    const reajustados: string[] = []

    const atualizados = itens.flatMap((item) => {
      if (item.categoria === 'promocao') return [item]

      const precoAtual = precoPorNome.get(item.nome)
      // Produto não existe mais no cardápio: sai do carrinho
      if (precoAtual === undefined) {
        removidos.push(item.nome)
        return []
      }
      // Preço mudou: atualiza o item para o preço novo
      if (Math.abs(precoAtual - item.preco) > 0.001) {
        reajustados.push(item.nome)
        return [{ ...item, preco: precoAtual }]
      }
      return [item]
    })

    // Só mexe no estado se algo mudou (evita renderização desnecessária)
    if (removidos.length > 0 || reajustados.length > 0) setItens(atualizados)
    return { removidos, reajustados }
  }

  return (
    // Provider publica o "value" abaixo para todos os componentes filhos
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
