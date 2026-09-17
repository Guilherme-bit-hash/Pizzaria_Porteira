// src/Pages/Cardapio.tsx - VERSÃO COMPLETA ATUALIZADA
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCarrinho } from '../contexts/CarrinhoContexts'
import Navbar from '../components/Navbar'
import TabsNavigation from '../components/TabsNavigation'
import { usePromocaoDoDia } from '../hooks/usePromocaoDoDia'
import { showToast } from '../components/Toast'
import Sidebar from '../components/Sidebar'
import MenuButton from '../components/MenuButton'
import '../styles/cardapio.css'

type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

export default function Cardapio() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('pizzas')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const { adicionarItem } = useCarrinho()
  const { promocaoAtual: promocaoDoDia, nomeDia: nomeDiaAtual } = usePromocaoDoDia()

  // Função para gerar imagens placeholder dinâmicas
  const getPlaceholderImage = (nome: string, categoria: TabType) => {
    const cores = {
      pizzas: 'FF6B35',
      hamburgueres: '8B4513',
      bebidas: '4A90E2',
      sobremesas: 'C2185B',
      promocoes: 'FFD700'
    }

    const emojis = {
      pizzas: '🍕',
      hamburgueres: '🍔',
      bebidas: '🥤',
      sobremesas: '🍰',
      promocoes: '🎯'
    }

    const texto = encodeURIComponent(`${emojis[categoria]} ${nome}`)
    return `https://placehold.co/600x400/${cores[categoria]}/white?text=${texto}&font=montserrat`
  }

  // Dados do cardápio com URLs de imagens
  const cardapio = {
    pizzas: [
      {
        nome: 'Mussarela',
        descricao: 'Mussarela, molho de tomate, orégano',
        preco: 32.9,
        imagem: getPlaceholderImage('Mussarela', 'pizzas')
      },
      {
        nome: 'Portuguesa',
        descricao: 'Presunto, ovo, cebola, pimentão, azeitonas, mussarela',
        preco: 39.9,
        imagem: getPlaceholderImage('Portuguesa', 'pizzas')
      },
      {
        nome: 'Calabresa',
        descricao: 'Calabresa, cebola, mussarela, orégano',
        preco: 34.9,
        imagem: getPlaceholderImage('Calabresa', 'pizzas')
      },
      {
        nome: 'Frango com Catupiry',
        descricao: 'Frango desfiado, Catupiry, milho, mussarela',
        preco: 42.9,
        imagem: getPlaceholderImage('Frango Catupiry', 'pizzas')
      },
      {
        nome: 'Margherita',
        descricao: 'Mussarela, tomate, manjericão, azeite',
        preco: 35.9,
        imagem: getPlaceholderImage('Margherita', 'pizzas')
      },
      {
        nome: '4 Queijos',
        descricao: 'Mussarela, provolone, parmesão, gorgonzola',
        preco: 44.9,
        imagem: getPlaceholderImage('4 Queijos', 'pizzas')
      }
    ],
    hamburgueres: [
      {
        nome: 'Clássico',
        descricao: 'Carne 150g, queijo, alface, tomate, maionese',
        preco: 26.9,
        imagem: getPlaceholderImage('Hambúrguer Clássico', 'hamburgueres')
      },
      {
        nome: 'Porteira',
        descricao: 'Carne 180g, bacon, cheddar, cebola caramelizada',
        preco: 29.9,
        imagem: getPlaceholderImage('Hambúrguer Porteira', 'hamburgueres')
      },
      {
        nome: 'Double Bacon',
        descricao: '2 carnes, bacon extra, queijo cheddar, molho especial',
        preco: 34.9,
        imagem: getPlaceholderImage('Double Bacon', 'hamburgueres')
      },
      {
        nome: 'Vegetariano',
        descricao: 'Hambúrguer de grão de bico, queijo, alface, tomate',
        preco: 28.9,
        imagem: getPlaceholderImage('Vegetariano', 'hamburgueres')
      }
    ],
    bebidas: [
      {
        nome: 'Refrigerante lata',
        descricao: 'Coca-Cola, Guaraná, Fanta Laranja, Sprite',
        preco: 6,
        imagem: getPlaceholderImage('Refrigerante', 'bebidas')
      },
      {
        nome: 'Suco natural',
        descricao: 'Laranja, limão, maracujá, abacaxi com hortelã',
        preco: 8,
        imagem: getPlaceholderImage('Suco Natural', 'bebidas')
      },
      {
        nome: 'Água mineral',
        descricao: 'Água com/sem gás 500ml',
        preco: 4,
        imagem: getPlaceholderImage('Água', 'bebidas')
      },
      {
        nome: 'Cerveja artesanal',
        descricao: 'IPA, Pilsen, Weiss 500ml',
        preco: 12,
        imagem: getPlaceholderImage('Cerveja', 'bebidas')
      }
    ],
    sobremesas: [
      {
        nome: 'Pudim',
        descricao: 'Pudim de leite condensado tradicional',
        preco: 12,
        imagem: getPlaceholderImage('Pudim', 'sobremesas')
      },
      {
        nome: 'Mousse de chocolate',
        descricao: 'Chocolate meio amargo com raspas de chocolate',
        preco: 10,
        imagem: getPlaceholderImage('Mousse', 'sobremesas')
      },
      {
        nome: 'Brownie com sorvete',
        descricao: 'Brownie quente com bola de sorvete de creme',
        preco: 16,
        imagem: getPlaceholderImage('Brownie', 'sobremesas')
      },
      {
        nome: 'Cheesecake',
        descricao: 'Cheesecake de frutas vermelhas',
        preco: 14,
        imagem: getPlaceholderImage('Cheesecake', 'sobremesas')
      }
    ],
    promocoes: [
      {
        nome: 'Pizza + Refri 2L',
        descricao: 'Pizza média + refrigerante 2 litros',
        preco: 59.9,
        imagem: getPlaceholderImage('Pizza + Refri', 'promocoes')
      },
      {
        nome: 'Combo Família',
        descricao: '2 pizzas grandes + 2 refrigerantes 2L',
        preco: 99.9,
        imagem: getPlaceholderImage('Combo Família', 'promocoes')
      },
      {
        nome: 'Hambúrguer + Batata',
        descricao: 'Hambúrguer + porção de batata frita + refri lata',
        preco: 34.9,
        imagem: getPlaceholderImage('Combo Hamburguer', 'promocoes')
      }
    ]
  }

  const abas: { id: TabType; label: string; icon: string }[] = [
    { id: 'pizzas', label: 'Pizzas', icon: '🍕' },
    { id: 'hamburgueres', label: 'Hambúrgueres', icon: '🍔' },
    { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
    { id: 'sobremesas', label: 'Sobremesas', icon: '🍰' },
    { id: 'promocoes', label: 'Promoção do Dia', icon: '🎯' }
  ]

  // Mapear categorias para o contexto
  const categoriaMap = {
    pizzas: 'pizza',
    hamburgueres: 'hamburguer',
    bebidas: 'bebida',
    sobremesas: 'sobremesa',
    promocoes: 'promocao'
  } as const

  // Função para adicionar ao carrinho
  const handleAdicionarAoCarrinho = (item: typeof cardapio.pizzas[0]) => {
    adicionarItem({
      nome: item.nome,
      descricao: item.descricao,
      preco: item.preco,
      categoria: categoriaMap[abaAtiva]
    })

    // Feedback visual com novo sistema de Toast
    showToast({
      message: `${item.nome} adicionado ao carrinho!`,
      type: 'success',
      emoji: '🛒',
      duration: 3000
    })
  }

  // Remove scroll horizontal e bordas
  useEffect(() => {
    document.documentElement.style.overflowX = 'hidden'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.margin = '0'
    document.body.style.margin = '0'
    document.documentElement.style.padding = '0'
    document.body.style.padding = '0'

    return () => {
      document.documentElement.style.overflowX = ''
      document.body.style.overflowX = ''
      document.documentElement.style.margin = ''
      document.body.style.margin = ''
      document.documentElement.style.padding = ''
      document.body.style.padding = ''
    }
  }, [])

  if (!promocaoDoDia) return null

  return (
    <main className="cardapio-page">
      {/* SIDEBAR RESPONSIVA (mobile) */}
      <MenuButton onClick={() => setSidebarAberta(true)} />
      <Sidebar
        tabs={abas}
        abaAtiva={abaAtiva}
        onTabChange={setAbaAtiva}
        isOpen={sidebarAberta}
        onClose={() => setSidebarAberta(false)}
      />

      {/* NAVBAR RESPONSIVA */}
      <Navbar showBackButton={true} backTo="/" />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="cardapio-conteudo">
        {/* TÍTULO E DESCRIÇÃO */}
        <div className="cardapio-titulo-wrap">
          <h1 className="cardapio-titulo">Nosso Cardápio</h1>
          <p className="cardapio-subtitulo">
            Deliciosas opções feitas com ingredientes selecionados.
            Clique nas abas para explorar nosso menu completo!
          </p>
        </div>

        {/* ABAS RESPONSIVAS (desktop - a Sidebar assume o mobile) */}
        <div className="tabs-desktop">
          <TabsNavigation tabs={abas} activeTab={abaAtiva} onTabChange={setAbaAtiva} />
        </div>

        {/* SEÇÃO DA PROMOÇÃO DO DIA (APENAS NA ABA PROMOÇÕES) */}
        {abaAtiva === 'promocoes' && (
          <div className="cardapio-promo-secao">
            {/* BANNER PRINCIPAL DA PROMOÇÃO DO DIA */}
            <div
              className="cardapio-promo-banner"
              style={{ '--promo-cor': promocaoDoDia.cor } as React.CSSProperties}
            >
              {/* EFEITO DE BRILHO */}
              <div className="cardapio-promo-banner__brilho" />

              {/* CABEÇALHO DA PROMOÇÃO */}
              <div className="cardapio-promo-banner__cabecalho">
                <span className="cardapio-promo-banner__emoji">
                  {promocaoDoDia.nome.split(' ')[0]}
                </span>
                <div className="cardapio-promo-banner__dia-badge">
                  {nomeDiaAtual}
                </div>
              </div>

              {/* TÍTULO DA PROMOÇÃO */}
              <h2 className="cardapio-promo-banner__titulo">
                {promocaoDoDia.nome}
              </h2>

              {/* DESCRIÇÃO */}
              <p className="cardapio-promo-banner__descricao">
                {promocaoDoDia.descricao}
              </p>

              {/* PREÇO OU MENSAGEM ESPECIAL */}
              <div className="cardapio-promo-banner__preco">
                {promocaoDoDia.preco > 0 ? (
                  <div className="cardapio-promo-banner__preco--valor">
                    R$ {promocaoDoDia.preco.toFixed(2).replace('.', ',')}
                  </div>
                ) : (
                  <div className="cardapio-promo-banner__preco--especial">
                    🎁 Preço especial no dia!
                  </div>
                )}
              </div>

              {/* BADGES */}
              <div className="cardapio-promo-banner__badges">
                <span className="cardapio-promo-banner__badge">⏰ Válido apenas hoje</span>
                <span className="cardapio-promo-banner__badge">🔥 Mais vendido</span>
                <span className="cardapio-promo-banner__badge">⭐ 4.8/5.0</span>
              </div>

              {/* BOTÃO DE AÇÃO */}
              <div className="cardapio-promo-banner__acao">
                <button
                  onClick={() => {
                    adicionarItem({
                      nome: promocaoDoDia.nome,
                      descricao: promocaoDoDia.descricao,
                      preco: promocaoDoDia.preco > 0 ? promocaoDoDia.preco : 0,
                      categoria: 'promocao'
                    })

                    // Feedback visual com novo sistema
                    showToast({
                      message: `${promocaoDoDia.nome} adicionada ao carrinho!`,
                      type: 'success',
                      emoji: '🎉',
                      duration: 3000
                    })
                  }}
                  className="cardapio-promo-banner__botao"
                >
                  <span className="cardapio-promo-banner__botao-icone">🛒</span>
                  Adicionar Promoção ao Carrinho
                </button>
              </div>
            </div>

            {/* TODAS AS PROMOÇÕES DA SEMANA */}
            <div className="cardapio-semana">
              <h3 className="cardapio-semana__titulo">📅 Promoções da Semana</h3>

              <div className="cardapio-semana__grid">
                {[
                  { dia: 'Domingo', promocao: '2 Pizzas + Refri 2L por R$ 89,90', emoji: '👨‍👩‍👧‍👦', cor: '#FF6B35' },
                  { dia: 'Segunda', promocao: '20% OFF em todas as pizzas', emoji: '🎯', cor: '#4A90E2' },
                  { dia: 'Terça', promocao: 'Hambúrguer + Batata + Refri R$ 29,90', emoji: '🍔', cor: '#8B4513' },
                  { dia: 'Quarta', promocao: 'Rodízio de Pizza R$ 39,90', emoji: '🎪', cor: '#9C27B0' },
                  { dia: 'Quinta', promocao: 'Refri 2L por R$ 8,90', emoji: '🥤', cor: '#2196F3' },
                  { dia: 'Sexta', promocao: 'Combo Casal R$ 59,90', emoji: '🎉', cor: '#FF9800' },
                  { dia: 'Sábado', promocao: 'Promoção surpresa!', emoji: '🌟', cor: '#FFD700' }
                ].map((item, index) => {
                  const hoje = new Date().getDay()
                  const ehHoje = index === hoje
                  return (
                    <div
                      key={item.dia}
                      className={`cardapio-semana__card${ehHoje ? ' cardapio-semana__card--hoje' : ''}`}
                      style={{ '--dia-cor': item.cor } as React.CSSProperties}
                      onClick={() => {
                        // Se clicar em um dia futuro, mostra mensagem
                        if (!ehHoje) {
                          alert(`Esta promoção estará disponível na ${item.dia}!`)
                        }
                      }}
                    >
                      {ehHoje && (
                        <div className="cardapio-semana__card-badge-hoje">HOJE</div>
                      )}

                      <div className="cardapio-semana__card-topo">
                        <span className="cardapio-semana__card-emoji">{item.emoji}</span>
                        <div>
                          <div className="cardapio-semana__card-dia">{item.dia}</div>
                          <div className="cardapio-semana__card-status">
                            {ehHoje ? 'Promoção ativa!' : 'Aguardando...'}
                          </div>
                        </div>
                      </div>
                      <p className="cardapio-semana__card-descricao">{item.promocao}</p>

                      {ehHoje && (
                        <div className="cardapio-semana__card-rodape">
                          <span className="cardapio-semana__card-disponivel">⏰ Disponível agora</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              adicionarItem({
                                nome: `${item.dia} - ${item.promocao.split(' por')[0]}`,
                                descricao: item.promocao,
                                preco: item.promocao.includes('R$')
                                  ? parseFloat(item.promocao.match(/R\$ (\d+[,.]\d+)/)?.[1].replace(',', '.') || '0')
                                  : 0,
                                categoria: 'promocao'
                              })
                            }}
                            className="cardapio-semana__card-adicionar"
                          >
                            Adicionar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO NORMAL PARA OUTRAS ABAS */}
        {abaAtiva !== 'promocoes' && (
          <>
            {/* CONTADOR DE ITENS */}
            <div className="cardapio-contador">
              {cardapio[abaAtiva].length} {abaAtiva === 'pizzas' ? 'sabores de pizza' :
                abaAtiva === 'hamburgueres' ? 'tipos de hambúrguer' :
                  abaAtiva === 'bebidas' ? 'bebidas disponíveis' :
                    abaAtiva === 'sobremesas' ? 'sobremesas deliciosas' : 'combos especiais'}
            </div>

            {/* LISTA DE ITENS COM IMAGENS */}
            <div className="cardapio-grid">
              {cardapio[abaAtiva].map((item) => (
                <div key={item.nome} className="cardapio-card">
                  {/* IMAGEM DO PRODUTO */}
                  <div className="cardapio-card__imagem-wrap">
                    <img src={item.imagem} alt={item.nome} className="cardapio-card__imagem" />

                    {/* OVERLAY GRADIENTE */}
                    <div className="cardapio-card__imagem-overlay" />

                    {/* BADGE DE CATEGORIA */}
                    <div className="cardapio-card__categoria-badge">
                      {abaAtiva === 'pizzas' ? '🍕 Pizza' :
                        abaAtiva === 'hamburgueres' ? '🍔 Lanche' :
                          abaAtiva === 'bebidas' ? '🥤 Bebida' :
                            abaAtiva === 'sobremesas' ? '🍰 Sobremesa' : '🎯 Combo'}
                    </div>
                  </div>

                  {/* INFORMAÇÕES DO PRODUTO */}
                  <div className="cardapio-card__info">
                    <div className="cardapio-card__cabecalho">
                      <div>
                        <h3 className="cardapio-card__nome">{item.nome}</h3>
                        <div className="cardapio-card__badges">
                          <span className="cardapio-card__badge cardapio-card__badge--avaliacao">⭐ 4.8</span>
                          <span className="cardapio-card__badge cardapio-card__badge--tempo">🚀 15-25 min</span>
                        </div>
                      </div>

                      <span className="cardapio-card__preco">
                        R$ {item.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {item.descricao && (
                      <p className="cardapio-card__descricao">{item.descricao}</p>
                    )}

                    {/* BOTÃO ADICIONAR AO CARRINHO */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAdicionarAoCarrinho(item)
                      }}
                      className="cardapio-card__botao"
                    >
                      <span className="cardapio-card__botao-icone">🛒</span>
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SEÇÃO DE DESTAQUE (APENAS PARA ABAS NÃO-PROMOÇÕES) */}
        {abaAtiva !== 'promocoes' && (
          <div className="cardapio-dica">
            <h2 className="cardapio-dica__titulo">🎯 Dica do Chefe</h2>
            <p className="cardapio-dica__texto">
              Experimente nossa <strong>Pizza Portuguesa</strong> acompanhada de um
              <strong> suco natural de laranja</strong>. Combinação perfeita!
            </p>
            <div className="cardapio-dica__badges">
              <span className="cardapio-dica__badge">🕒 Entrega 30 min</span>
              <span className="cardapio-dica__badge">💳 Aceitamos todos cartões</span>
              <span className="cardapio-dica__badge">🎁 10% off no primeiro pedido</span>
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <footer className="cardapio-rodape">
          <img src="/logo.jpeg" alt="Logo Porteira" className="cardapio-rodape__logo" />
          <p className="cardapio-rodape__texto">📞 (11) 99999-9999</p>
          <p className="cardapio-rodape__texto">📍 Rua da Pizzaria, 123 - Centro</p>
          <p className="cardapio-rodape__texto cardapio-rodape__texto--final">
            ⏰ 18h às 23h • Todos os dias
          </p>
          <div className="cardapio-rodape__redes">
            <a href="#" className="cardapio-rodape__rede-link">📱</a>
            <a href="#" className="cardapio-rodape__rede-link">📸</a>
            <a href="#" className="cardapio-rodape__rede-link">📘</a>
            <a href="#" className="cardapio-rodape__rede-link">🐦</a>
          </div>
          <Link to="/" className="cardapio-rodape__botao-home">
            Voltar para Home
          </Link>
        </footer>
      </div>
    </main>
  )
}
