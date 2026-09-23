// src/Pages/Cardapio.tsx
// Página do CARDÁPIO, servida na rota "/cardapio" (definida em App.tsx; a Home leva para cá).
// Mostra os produtos em abas (pizzas, hambúrgueres, bebidas, sobremesas) com paginação e a aba
// "Promoção do Dia". O botão "Adicionar" coloca o item no carrinho (contexts/CarrinhoContexts.tsx).
// Backend: GET /api/produtos (services/produtoService.ts) e GET /api/promocoes (via hooks/usePromocaoDoDia.ts).
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useCarrinho } from '../contexts/CarrinhoContexts'
import Navbar from '../components/Navbar'
import TabsNavigation from '../components/TabsNavigation'
import { usePromocaoDoDia } from '../hooks/usePromocaoDoDia'
import { showToast } from '../components/Toast'
import Sidebar from '../components/Sidebar'
import MenuButton from '../components/MenuButton'
import { WHATSAPP_NUMBER } from '../config/whatsapp'
import { listarCardapio, type CategoriaProduto, type Produto } from '../services/produtoService'
import '../styles/cardapio.css'

// Identificadores das abas exibidas na tela
type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

// Liga cada aba (plural, usada na interface) à categoria do produto no banco (singular).
// A aba "promocoes" fica de fora porque não lista produtos do banco.
const CATEGORIA_DA_ABA: Record<Exclude<TabType, 'promocoes'>, CategoriaProduto> = {
  pizzas: 'pizza',
  hamburgueres: 'hamburguer',
  bebidas: 'bebida',
  sobremesas: 'sobremesa'
}

// Menor que a quantidade de itens de qualquer aba hoje (a maior tem 6), pra garantir que a
// paginação sempre apareça de fato — com um valor igual ou maior, uma aba com poucos itens
// nunca teria uma segunda página e os controles simplesmente não apareciam.
const ITENS_POR_PAGINA = 3
const PROMOCOES_POR_PAGINA = 4

// Grade fixa exibida em "Promoções da Semana" (texto de vitrine; a promoção do dia
// em destaque vem do backend via usePromocaoDoDia). A posição na lista é o dia (0 = domingo).
const DIAS_SEMANA_PROMOCOES = [
  { dia: 'Domingo', promocao: '2 Pizzas + Refri 2L por R$ 89,90', emoji: '👨‍👩‍👧‍👦', cor: '#FF6B35' },
  { dia: 'Segunda', promocao: '20% OFF em todas as pizzas', emoji: '🎯', cor: '#4A90E2' },
  { dia: 'Terça', promocao: 'Hambúrguer + Batata + Refri R$ 29,90', emoji: '🍔', cor: '#8B4513' },
  { dia: 'Quarta', promocao: 'Rodízio de Pizza R$ 39,90', emoji: '🎪', cor: '#9C27B0' },
  { dia: 'Quinta', promocao: 'Refri 2L por R$ 8,90', emoji: '🥤', cor: '#2196F3' },
  { dia: 'Sexta', promocao: 'Combo Casal R$ 59,90', emoji: '🎉', cor: '#FF9800' },
  { dia: 'Sábado', promocao: 'Promoção surpresa!', emoji: '🌟', cor: '#FFD700' }
]

// Componente reutilizável dos botões "Anterior / Próxima" com "Página X de Y".
// Recebe dados por "props" (parâmetros do componente): página atual, total e a função a chamar ao trocar.
function ControlesPaginacao({
  paginaAtual,
  totalPaginas,
  onMudarPagina
}: {
  paginaAtual: number
  totalPaginas: number
  onMudarPagina: (pagina: number) => void
}) {
  // Com uma página só, não há o que paginar: não desenha nada
  if (totalPaginas <= 1) return null

  return (
    <div className="cardapio-paginacao">
      {/* Botão Anterior (desativado na primeira página) */}
      <button
        type="button"
        onClick={() => onMudarPagina(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        className="cardapio-paginacao__botao"
        aria-label="Página anterior"
      >
        ← Anterior
      </button>
      {/* Indicador da página atual */}
      <span className="cardapio-paginacao__info">
        Página {paginaAtual} de {totalPaginas}
      </span>
      {/* Botão Próxima (desativado na última página) */}
      <button
        type="button"
        onClick={() => onMudarPagina(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        className="cardapio-paginacao__botao"
        aria-label="Próxima página"
      >
        Próxima →
      </button>
    </div>
  )
}

// Componente da página inteira.
export default function Cardapio() {
  // Estados da interface (useState: valores que, ao mudar, redesenham a tela):
  // aba selecionada, menu lateral (mobile) aberto/fechado e página atual de cada paginação
  const [abaAtiva, setAbaAtiva] = useState<TabType>('pizzas')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginaPromocoes, setPaginaPromocoes] = useState(1)
  // Função do contexto do carrinho para adicionar itens
  const { adicionarItem } = useCarrinho()
  // Promoção de hoje e nome do dia (hook que consulta o backend)
  const { promocaoAtual: promocaoDoDia, nomeDia: nomeDiaAtual } = usePromocaoDoDia()

  // Volta para a primeira página sempre que trocar de aba
  // (roda a cada mudança de "abaAtiva")
  useEffect(() => {
    setPaginaAtual(1)
  }, [abaAtiva])

  // Função para gerar imagens placeholder dinâmicas
  // (usada quando o produto não tem imagem cadastrada; cria uma imagem colorida com emoji e nome)
  const getPlaceholderImage = (nome: string, categoria: TabType) => {
    // Cor de fundo de cada categoria
    const cores = {
      pizzas: 'FF6B35',
      hamburgueres: '8B4513',
      bebidas: '4A90E2',
      sobremesas: 'C2185B',
      promocoes: 'FFD700'
    }

    // Emoji de cada categoria
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

  // Cardápio vindo da API (editável no painel admin), agrupado por aba
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregandoCardapio, setCarregandoCardapio] = useState(true)
  const [erroCardapio, setErroCardapio] = useState(false)

  // Busca o cardápio público no backend (GET /api/produtos) e controla os estados de carregando/erro.
  // Também é usada pelo botão "Tentar novamente".
  const carregarCardapio = useCallback(async () => {
    setCarregandoCardapio(true)
    setErroCardapio(false)
    try {
      setProdutos(await listarCardapio())
    } catch (error) {
      console.error('Não foi possível carregar o cardápio:', error)
      setErroCardapio(true)
    } finally {
      setCarregandoCardapio(false)
    }
  }, [])

  // Carrega o cardápio uma vez, quando a página abre.
  useEffect(() => {
    carregarCardapio()
  }, [carregarCardapio])

  // Filtra os produtos da categoria da aba e converte para o formato usado nos cards
  // (usa a imagem do produto ou, se não houver, a imagem placeholder).
  const itensDaAba = (aba: Exclude<TabType, 'promocoes'>) =>
    produtos
      .filter((produto) => produto.categoria === CATEGORIA_DA_ABA[aba])
      .map((produto) => ({
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        imagem: produto.imagemUrl || getPlaceholderImage(produto.nome, aba)
      }))

  // Itens já agrupados por aba, prontos para exibir
  const cardapio = {
    pizzas: itensDaAba('pizzas'),
    hamburgueres: itensDaAba('hamburgueres'),
    bebidas: itensDaAba('bebidas'),
    sobremesas: itensDaAba('sobremesas')
    // Sem chave "promocoes" aqui: a aba de promoções não usa esta lista — ela renderiza o
    // banner de `promocaoDoDia` (vindo do backend) e a grade semanal mais abaixo.
  }

  // Lista de abas (id, texto e ícone), usada tanto pelas abas de desktop quanto pela Sidebar do mobile
  const abas: { id: TabType; label: string; icon: string }[] = [
    { id: 'pizzas', label: 'Pizzas', icon: '🍕' },
    { id: 'hamburgueres', label: 'Hambúrgueres', icon: '🍔' },
    { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
    { id: 'sobremesas', label: 'Sobremesas', icon: '🍰' },
    { id: 'promocoes', label: 'Promoção do Dia', icon: '🎯' }
  ]

  // Mapear categorias (aba -> categoria aceita pelo carrinho)
  const categoriaMap = {
    pizzas: 'pizza',
    hamburgueres: 'hamburguer',
    bebidas: 'bebida',
    sobremesas: 'sobremesa',
    promocoes: 'promocao'
  } as const

  // Função para adicionar ao carrinho (clique em "Adicionar ao Carrinho" de um produto)
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
  // Roda uma vez ao entrar na página; a função retornada desfaz os estilos ao sair dela,
  // para não afetar as outras páginas.
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

  // Sem promoção para hoje, a página não é desenhada
  if (!promocaoDoDia) return null

  return (
    <main className="cardapio-page">
      {/* SIDEBAR RESPONSIVA (mobile): botão de menu abre a Sidebar com as mesmas abas */}
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
                {promocaoDoDia.preco > 0 ? (
                  <button
                    onClick={() => {
                      adicionarItem({
                        nome: promocaoDoDia.nome,
                        descricao: promocaoDoDia.descricao,
                        preco: promocaoDoDia.preco,
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
                ) : (
                  // Promoção sem preço fixo (ex: desconto percentual, "oferta surpresa") não
                  // pode virar um item de carrinho com preço 0 — combina direto no WhatsApp.
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Quero saber mais sobre a promoção "${promocaoDoDia.nome}": ${promocaoDoDia.descricao}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cardapio-promo-banner__botao"
                  >
                    <span className="cardapio-promo-banner__botao-icone">💬</span>
                    Combinar no WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* TODAS AS PROMOÇÕES DA SEMANA */}
            <div className="cardapio-semana">
              <h3 className="cardapio-semana__titulo">📅 Promoções da Semana</h3>

              {/* Cards dos dias, paginados; só o card de hoje permite adicionar ao carrinho */}
              <div className="cardapio-semana__grid">
                {DIAS_SEMANA_PROMOCOES
                  .map((item, index) => ({ ...item, indiceDia: index }))
                  .slice((paginaPromocoes - 1) * PROMOCOES_POR_PAGINA, paginaPromocoes * PROMOCOES_POR_PAGINA)
                  .map((item) => {
                  const hoje = new Date().getDay()
                  const ehHoje = item.indiceDia === hoje
                  return (
                    <div
                      key={item.dia}
                      className={`cardapio-semana__card${ehHoje ? ' cardapio-semana__card--hoje' : ''}`}
                      style={{ '--dia-cor': item.cor } as React.CSSProperties}
                      onClick={() => {
                        // Se clicar em um dia futuro, mostra mensagem (toast em vez de
                        // alert() nativo, pra manter a mesma UI usada no resto do site)
                        if (!ehHoje) {
                          showToast({
                            message: `Esta promoção estará disponível na ${item.dia}!`,
                            type: 'info',
                            emoji: '📅',
                            duration: 3000
                          })
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
                          {item.promocao.includes('R$') ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                adicionarItem({
                                  nome: `${item.dia} - ${item.promocao.split(' por')[0]}`,
                                  descricao: item.promocao,
                                  preco: parseFloat(item.promocao.match(/R\$ (\d+[,.]\d+)/)?.[1].replace(',', '.') || '0'),
                                  categoria: 'promocao'
                                })
                              }}
                              className="cardapio-semana__card-adicionar"
                            >
                              Adicionar
                            </button>
                          ) : (
                            // Sem preço fixo (desconto percentual, promoção surpresa) — não dá
                            // pra virar item de carrinho a R$0, então direciona pro WhatsApp.
                            <a
                              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Quero saber mais sobre a promoção de ${item.dia}: ${item.promocao}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="cardapio-semana__card-adicionar"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Paginação dos cards da semana */}
              <ControlesPaginacao
                paginaAtual={paginaPromocoes}
                totalPaginas={Math.ceil(DIAS_SEMANA_PROMOCOES.length / PROMOCOES_POR_PAGINA)}
                onMudarPagina={setPaginaPromocoes}
              />
            </div>
          </div>
        )}

        {/* ESTADOS DE CARREGAMENTO / ERRO / ABA VAZIA */}
        {abaAtiva !== 'promocoes' && carregandoCardapio && (
          <p className="cardapio-status">Carregando cardápio...</p>
        )}
        {abaAtiva !== 'promocoes' && !carregandoCardapio && erroCardapio && (
          <div className="cardapio-status">
            <p>Não foi possível carregar o cardápio agora.</p>
            <button type="button" onClick={carregarCardapio} className="cardapio-paginacao__botao">
              Tentar novamente
            </button>
          </div>
        )}
        {abaAtiva !== 'promocoes' && !carregandoCardapio && !erroCardapio && cardapio[abaAtiva].length === 0 && (
          <p className="cardapio-status">Nenhum item disponível nesta categoria no momento.</p>
        )}

        {/* SEÇÃO NORMAL PARA OUTRAS ABAS */}
        {abaAtiva !== 'promocoes' && !carregandoCardapio && !erroCardapio && cardapio[abaAtiva].length > 0 && (
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
              {cardapio[abaAtiva]
                .slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA)
                .map((item) => (
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

            {/* Paginação dos produtos */}
            <ControlesPaginacao
              paginaAtual={paginaAtual}
              totalPaginas={Math.ceil(cardapio[abaAtiva].length / ITENS_POR_PAGINA)}
              onMudarPagina={setPaginaAtual}
            />
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
          {/* TODO: trocar href="#" pelos links reais das redes sociais da pizzaria */}
          <div className="cardapio-rodape__redes">
            <a href="#" className="cardapio-rodape__rede-link" aria-label="WhatsApp">📱</a>
            <a href="#" className="cardapio-rodape__rede-link" aria-label="Instagram">📸</a>
            <a href="#" className="cardapio-rodape__rede-link" aria-label="Facebook">📘</a>
            <a href="#" className="cardapio-rodape__rede-link" aria-label="Twitter">🐦</a>
          </div>
          <Link to="/" className="cardapio-rodape__botao-home">
            Voltar para Home
          </Link>
        </footer>
      </div>
    </main>
  )
}
