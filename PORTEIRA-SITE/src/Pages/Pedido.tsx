// src/Pages/Pedido.tsx
// Página de CHECKOUT (carrinho + entrega + pagamento), servida na rota "/pedido" (definida em App.tsx).
// Tem 3 etapas controladas pelo estado "etapa": 1) revisar o carrinho, 2) dados de entrega e forma de
// pagamento, 3) pagamento via PIX. O cliente pode finalizar pelo WhatsApp ou pagar com PIX.
// Backend: POST /api/pedidos, GET /api/pedidos/cupom-primeira-compra/elegivel (services/pedidoService.ts),
// /api/pedidos/:id/pagamento/* (services/pagamentoService.ts) e GET /api/produtos (services/produtoService.ts).
// O carrinho vem do contexto (contexts/CarrinhoContexts.tsx).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCarrinho, type ItemCarrinho } from '../contexts/CarrinhoContexts'
import Navbar from '../components/Navbar'
import { showToast } from '../components/Toast'
import {
  criarPedido,
  marcarPedidoRealizado,
  verificarCupomPrimeiraCompra,
  CUPOM_PRIMEIRA_COMPRA,
  CUPOM_PERCENTUAL,
  CUPOM_VALOR_MINIMO,
} from '../services/pedidoService'
import {
  criarPagamentoPix,
  consultarStatusPagamento,
  type PagamentoPix,
  type StatusPagamento,
} from '../services/pagamentoService'
import { listarCardapio } from '../services/produtoService'
import { consultarStatusLoja } from '../services/lojaService'
import LojaFechadaBanner from '../components/LojaFechadaBanner'
import { WHATSAPP_NUMBER, formatarWhatsApp } from '../config/whatsapp'
import '../styles/pedido.css'

// Componente da página de pedido (nome interno "Pedidos"; importado como "Pedido" em App.tsx).
export default function Pedidos() {
  // Dados e ações do carrinho vindos do contexto global (useCarrinho)
  const {
    itens,
    total,
    quantidadeTotal,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
    sincronizarComCardapio
  } = useCarrinho()

  // Feedback em toast para as ações do carrinho (remover, limpar, mudar quantidade)
  const handleRemoverItem = (item: ItemCarrinho) => {
    removerItem(item.id)
    showToast({ message: `${item.nome} removido do carrinho`, type: 'info', emoji: '🗑️', duration: 2000 })
  }

  const handleLimparCarrinho = () => {
    limparCarrinho()
    showToast({ message: 'Carrinho esvaziado', type: 'info', emoji: '🧹', duration: 2000 })
  }

  const handleAtualizarQuantidade = (item: ItemCarrinho, novaQuantidade: number) => {
    atualizarQuantidade(item.id, novaQuantidade)
    if (novaQuantidade < 1) {
      showToast({ message: `${item.nome} removido do carrinho`, type: 'info', emoji: '🗑️', duration: 2000 })
    } else {
      showToast({ message: `${item.nome}: ${novaQuantidade}x`, type: 'info', emoji: '🔢', duration: 1200 })
    }
  }

  // ---- Estados da página (useState: ao mudarem, a tela é redesenhada) ----
  // Etapa atual do checkout
  const [etapa, setEtapa] = useState<'carrinho' | 'entrega' | 'pagamento'>('carrinho')
  // Campos do formulário de entrega
  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    complemento: '',
    observacoes: ''
  })
  // Requisição em andamento (desativa os botões de finalizar)
  const [enviando, setEnviando] = useState(false)
  // Cupom de primeira compra: null = ainda não verificado, true = vale, false = telefone já comprou antes
  const [cupomElegivel, setCupomElegivel] = useState<boolean | null>(null)
  // Escolha do cliente: combinar no WhatsApp ou pagar com PIX
  const [formaPagamento, setFormaPagamento] = useState<'whatsapp' | 'pix'>('whatsapp')
  // E-mail opcional e consentimento (LGPD) para receber promoções
  const [emailCliente, setEmailCliente] = useState('')
  const [aceitaPromocoes, setAceitaPromocoes] = useState(false)
  // Dados do fluxo PIX: id do pedido criado, QR code recebido, status do pagamento e mensagem de erro
  const [pedidoId, setPedidoId] = useState<number | null>(null)
  const [pixData, setPixData] = useState<PagamentoPix | null>(null)
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>('pendente')
  const [erroPix, setErroPix] = useState('')
  const [lojaAberta, setLojaAberta] = useState(true)

  // Consulta se a loja está aceitando pedidos, pra avisar e travar os botões de finalizar
  // antes mesmo de tentar — a checagem que realmente vale é feita de novo no servidor.
  useEffect(() => {
    consultarStatusLoja().then(setLojaAberta)
  }, [])

  // Ao abrir o carrinho, confere com o cardápio atual: se o admin mudou um preço ou tirou um
  // produto do ar, o carrinho é corrigido e o cliente é avisado (senão o pedido seria recusado
  // pelo servidor por divergência de preço).
  // Roda uma única vez, quando a página abre (lista de dependências vazia).
  useEffect(() => {
    listarCardapio({ forcar: true })
      .then((produtos) => {
        const { removidos, reajustados } = sincronizarComCardapio(produtos)
        if (removidos.length > 0) {
          showToast({
            message: `Removido do carrinho (indisponível): ${removidos.join(', ')}`,
            type: 'warning',
            emoji: '⚠️',
            duration: 5000,
          })
        }
        if (reajustados.length > 0) {
          showToast({
            message: `Preço atualizado: ${reajustados.join(', ')}`,
            type: 'info',
            emoji: '💲',
            duration: 5000,
          })
        }
      })
      .catch(() => {
        // Sem conexão com o backend não há o que sincronizar; o fluxo segue normalmente.
      })
  }, [])

  // Telefone só com dígitos, e se o valor do carrinho já atingiu o mínimo do cupom
  const telefoneDigits = dadosCliente.telefone.replace(/\D/g, '')
  const cupomDesbloqueadoPeloValor = total >= CUPOM_VALOR_MINIMO

  // Reconsulta o backend sempre que o telefone muda, com um pequeno atraso para não
  // disparar uma requisição a cada tecla digitada. A verdade definitiva sobre o cupom
  // só é decidida no servidor ao finalizar o pedido — isso aqui é só feedback visual.
  // Roda quando o telefone ou o desbloqueio do cupom mudam.
  useEffect(() => {
    if (!cupomDesbloqueadoPeloValor || telefoneDigits.length < 10) {
      setCupomElegivel(null)
      return
    }

    // "cancelado" evita usar uma resposta antiga se o telefone mudou de novo enquanto esperava
    let cancelado = false
    const timer = setTimeout(() => {
      verificarCupomPrimeiraCompra(dadosCliente.telefone).then((elegivel) => {
        if (!cancelado) setCupomElegivel(elegivel)
      })
    }, 600)

    // Limpeza: cancela o timer e ignora respostas pendentes
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [telefoneDigits, cupomDesbloqueadoPeloValor, dadosCliente.telefone])

  // Valores calculados só para exibição (o servidor recalcula tudo ao criar o pedido)
  const cupomConfirmado = cupomDesbloqueadoPeloValor && cupomElegivel === true
  const descontoPrevisto = cupomConfirmado ? Number((total * CUPOM_PERCENTUAL).toFixed(2)) : 0
  const totalComDesconto = Number((total - descontoPrevisto).toFixed(2))

  // Enquanto aprovado, o pagamento PIX esvazia o carrinho — sem essa exceção, a tela de
  // sucesso seria substituída pela de "carrinho vazio" assim que isso acontecesse.
  // Roda quando o status do pagamento muda: ao ser aprovado, marca "já fez pedido" e limpa o carrinho.
  useEffect(() => {
    if (statusPagamento === 'aprovado') {
      marcarPedidoRealizado()
      limparCarrinho()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusPagamento])

  // Consulta o status do PIX periodicamente enquanto o pedido estiver pendente de pagamento.
  // (polling: a cada 4s pergunta ao backend se o cliente já pagou). Só ativo na etapa "pagamento".
  useEffect(() => {
    if (etapa !== 'pagamento' || !pedidoId || statusPagamento !== 'pendente') return

    const intervalo = setInterval(async () => {
      try {
        const status = await consultarStatusPagamento(pedidoId)
        setStatusPagamento(status)
      } catch {
        // Falha pontual de rede no polling — tenta de novo no próximo tick.
      }
    }, 4000)

    // Limpeza: para o polling quando a etapa/status muda ou a página fecha
    return () => clearInterval(intervalo)
  }, [etapa, pedidoId, statusPagamento])

  // Se carrinho vazio (mostra um aviso com link para o cardápio em vez do checkout)
  if (quantidadeTotal === 0 && etapa !== 'pagamento') {
    return (
      <>
        <Navbar showBackButton={true} backTo="/cardapio" />
        <div className="pedido-vazio-page">
          <div className="pedido-vazio-card">
            <h1 className="pedido-vazio-titulo">🛒 Carrinho Vazio</h1>
            <p className="pedido-vazio-texto">
              Seu carrinho está vazio. Adicione alguns itens deliciosos!
            </p>
            <Link to="/cardapio" className="pedido-vazio-botao">
              Ver Cardápio
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Gerar mensagem do WhatsApp a partir do resumo confirmado pelo backend
  // (subtotal/desconto/total ali já refletem se o cupom foi de fato aplicado)
  const gerarMensagemWhatsApp = (resumo: { subtotal: number; desconto: number; total: number; cupom: string | null }) => {
    // Monta o texto linha a linha (os *asteriscos* deixam em negrito no WhatsApp)
    let mensagem = `*NOVO PEDIDO - PIZZARIA PORTEIRA*\n\n`
    mensagem += `*Cliente:* ${dadosCliente.nome}\n`
    mensagem += `*Telefone:* ${dadosCliente.telefone}\n`
    mensagem += `*Endereço:* ${dadosCliente.endereco}\n`
    if (dadosCliente.complemento) {
      mensagem += `*Complemento:* ${dadosCliente.complemento}\n`
    }
    mensagem += `\n*ITENS DO PEDIDO:*\n`

    itens.forEach((item, index) => {
      mensagem += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2)}\n`
      if (item.observacoes) {
        mensagem += `   Obs: ${item.observacoes}\n`
      }
    })

    mensagem += `\n*Subtotal: R$ ${resumo.subtotal.toFixed(2)}*\n`
    if (resumo.cupom) {
      mensagem += `*Cupom ${resumo.cupom}: -R$ ${resumo.desconto.toFixed(2)} (10% OFF primeira compra)*\n`
    }
    mensagem += `*TOTAL: R$ ${resumo.total.toFixed(2)}*\n\n`

    if (dadosCliente.observacoes) {
      mensagem += `*Observações do pedido:*\n${dadosCliente.observacoes}\n\n`
    }

    mensagem += `Pedido realizado via Site Pizzaria Porteira`

    return mensagem
  }

  // Registra o pedido no backend (se disponível) e então abre o WhatsApp para confirmação.
  // O desconto do cupom só é considerado "de verdade" aplicado quando o backend confirma —
  // se o backend estiver fora do ar ou recusar o cupom, o pedido segue sem desconto.
  const handleFinalizarPedido = async () => {
    setEnviando(true)

    // Resumo padrão (sem desconto), usado se o backend não responder
    let resumoFinal: { subtotal: number; desconto: number; total: number; cupom: string | null } = {
      subtotal: total,
      desconto: 0,
      total,
      cupom: null,
    }

    try {
      const resultado = await criarPedido({
        nome: dadosCliente.nome,
        telefone: dadosCliente.telefone,
        endereco: dadosCliente.endereco,
        complemento: dadosCliente.complemento,
        observacoes: dadosCliente.observacoes,
        itens,
        cupom: cupomDesbloqueadoPeloValor ? CUPOM_PRIMEIRA_COMPRA : undefined,
        email: emailCliente.trim() || undefined,
        aceitaPromocoes,
      })

      // Backend respondeu: usa os valores oficiais calculados pelo servidor
      if (resultado) {
        resumoFinal = {
          subtotal: resultado.subtotal,
          desconto: resultado.desconto,
          total: resultado.total,
          cupom: resultado.cupom,
        }
      }
    } finally {
      // Sempre abre o WhatsApp, mesmo se o backend falhou, para o pedido não se perder
      setEnviando(false)
      marcarPedidoRealizado()
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(gerarMensagemWhatsApp(resumoFinal))}`
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Registra o pedido no backend e, em seguida, gera a cobrança PIX no Mercado Pago.
  // Diferente do fluxo por WhatsApp, aqui o pedido só avança se o backend confirmar —
  // sem um id de pedido real não há como cobrar o PIX.
  const handleGerarPix = async () => {
    setEnviando(true)
    setErroPix('')

    try {
      const resultado = await criarPedido({
        nome: dadosCliente.nome,
        telefone: dadosCliente.telefone,
        endereco: dadosCliente.endereco,
        complemento: dadosCliente.complemento,
        observacoes: dadosCliente.observacoes,
        itens,
        cupom: cupomDesbloqueadoPeloValor ? CUPOM_PRIMEIRA_COMPRA : undefined,
        email: emailCliente.trim() || undefined,
        aceitaPromocoes,
      })

      // Sem id de pedido não há como cobrar: mostra erro e para
      if (!resultado) {
        setErroPix('Não foi possível registrar o pedido agora. Tente novamente ou finalize pelo WhatsApp.')
        return
      }

      // Guarda o id, pede o QR code PIX e avança para a etapa de pagamento
      setPedidoId(resultado.id)
      const pix = await criarPagamentoPix(resultado.id, emailCliente || undefined)
      setPixData(pix)
      setStatusPagamento(pix.status)
      setEtapa('pagamento')
    } catch (error) {
      setErroPix(
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar o PIX. Tente novamente ou finalize pelo WhatsApp.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Navbar showBackButton={true} backTo="/cardapio" />
      <div className="pedido-page">

        {/* CABEÇALHO */}
        <header className="pedido-cabecalho">
          <h1 className="pedido-cabecalho__titulo">
            {etapa === 'carrinho' ? '🛒 Seu Carrinho' : '📍 Dados de Entrega'}
          </h1>
          {/* Indicador de etapas (destaca a etapa atual) */}
          <div className="pedido-cabecalho__etapas">
            <div className={`pedido-etapa-badge${etapa === 'carrinho' ? ' pedido-etapa-badge--ativa' : ''}`}>
              1. Carrinho
            </div>
            <div className="pedido-cabecalho__seta">→</div>
            <div className={`pedido-etapa-badge${etapa === 'entrega' ? ' pedido-etapa-badge--ativa' : ''}`}>
              2. Entrega
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="pedido-conteudo">
          {!lojaAberta && <LojaFechadaBanner />}

          {/* ETAPA 1: CARRINHO */}
          {etapa === 'carrinho' && (
            <>
              <div className="pedido-card">
                {/* Título com contagem de itens e botão para esvaziar o carrinho */}
                <div className="pedido-card__topo">
                  <h2 className="pedido-card__titulo">
                    Itens no Carrinho ({quantidadeTotal})
                  </h2>
                  <button onClick={handleLimparCarrinho} className="pedido-botao-limpar">
                    🗑️ Limpar Tudo
                  </button>
                </div>

                {/* LISTA DE ITENS */}
                <div className="pedido-itens-lista">
                  {itens.map((item) => (
                    <div key={item.id} className="pedido-item">
                      <div className="pedido-item__info">
                        <div className="pedido-item__cabecalho">
                          <h3 className="pedido-item__nome">{item.nome}</h3>
                          <span className="pedido-item__preco">
                            R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <p className="pedido-item__descricao">{item.descricao}</p>
                        {item.observacoes && (
                          <p className="pedido-item__observacao">
                            <strong>Obs:</strong> {item.observacoes}
                          </p>
                        )}
                      </div>

                      {/* CONTROLES DE QUANTIDADE */}
                      <div className="pedido-item__controles">
                        <div className="pedido-item__quantidade-grupo">
                          <button
                            onClick={() => handleAtualizarQuantidade(item, item.quantidade - 1)}
                            className="pedido-item__botao-qtd"
                          >
                            -
                          </button>

                          <span className="pedido-item__quantidade-valor">{item.quantidade}</span>

                          <button
                            onClick={() => handleAtualizarQuantidade(item, item.quantidade + 1)}
                            className="pedido-item__botao-qtd"
                          >
                            +
                          </button>
                        </div>

                        <button onClick={() => handleRemoverItem(item)} className="pedido-item__botao-remover">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CUPOM DE PRIMEIRA COMPRA */}
                {cupomDesbloqueadoPeloValor && (
                  <div className="pedido-cupom-banner">
                    <span className="pedido-cupom-banner__icone">🎁</span>
                    <span>
                      Cupom <strong>{CUPOM_PRIMEIRA_COMPRA}</strong> desbloqueado: {(CUPOM_PERCENTUAL * 100).toFixed(0)}% OFF na primeira compra.
                      Informe seu telefone na próxima etapa para aplicar.
                    </span>
                  </div>
                )}

                {/* RESUMO */}
                <div className="pedido-resumo">
                  <div className="pedido-resumo__linha">
                    <span>Subtotal ({quantidadeTotal} itens):</span>
                    <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="pedido-resumo__linha">
                    <span>Taxa de entrega:</span>
                    <span>Grátis</span>
                  </div>
                  <div className="pedido-resumo__total">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* Avança para a etapa 2 */}
                <button onClick={() => setEtapa('entrega')} className="pedido-botao-continuar">
                  Continuar para Entrega →
                </button>
              </div>

              <Link to="/cardapio" className="pedido-link-voltar-cardapio">
                ← Adicionar mais itens ao carrinho
              </Link>
            </>
          )}

          {/* ETAPA 2: ENTREGA */}
          {etapa === 'entrega' && (
            <div className="pedido-card">
              <h2 className="pedido-card__titulo">📍 Dados para Entrega</h2>

              {/* Formulário de entrega: cada campo atualiza o estado dadosCliente */}
              <form className="pedido-form">
                {/* Nome */}
                <div className="pedido-campo">
                  <label className="pedido-label">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={dadosCliente.nome}
                    onChange={(e) => setDadosCliente({...dadosCliente, nome: e.target.value})}
                    className="pedido-input"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                {/* Telefone (também usado para verificar o cupom de primeira compra) */}
                <div className="pedido-campo">
                  <label className="pedido-label">Telefone (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={dadosCliente.telefone}
                    onChange={(e) => setDadosCliente({...dadosCliente, telefone: e.target.value})}
                    className="pedido-input"
                    placeholder="(11) 99999-9999"
                  />
                  {/* Feedback do cupom: verificando / aplicado / indisponível */}
                  {cupomDesbloqueadoPeloValor && telefoneDigits.length >= 10 && (
                    <p
                      className={`pedido-cupom-feedback${cupomElegivel === false ? ' pedido-cupom-feedback--indisponivel' : ''}`}
                    >
                      {cupomElegivel === null && 'Verificando cupom BEMVINDO10...'}
                      {cupomElegivel === true && `✅ Cupom BEMVINDO10 aplicado: -R$ ${descontoPrevisto.toFixed(2).replace('.', ',')} (10% OFF)`}
                      {cupomElegivel === false && '⚠️ O cupom BEMVINDO10 é válido só na primeira compra — este telefone já fez um pedido antes.'}
                    </p>
                  )}
                </div>

                {/* Endereço */}
                <div className="pedido-campo">
                  <label className="pedido-label">Endereço Completo *</label>
                  <input
                    type="text"
                    required
                    value={dadosCliente.endereco}
                    onChange={(e) => setDadosCliente({...dadosCliente, endereco: e.target.value})}
                    className="pedido-input"
                    placeholder="Rua, número, bairro"
                  />
                </div>

                {/* Complemento (opcional) */}
                <div className="pedido-campo">
                  <label className="pedido-label">Complemento</label>
                  <input
                    type="text"
                    value={dadosCliente.complemento}
                    onChange={(e) => setDadosCliente({...dadosCliente, complemento: e.target.value})}
                    className="pedido-input"
                    placeholder="Apto, bloco, ponto de referência"
                  />
                </div>

                {/* Observações gerais do pedido (opcional) */}
                <div className="pedido-campo">
                  <label className="pedido-label">Observações do Pedido</label>
                  <textarea
                    value={dadosCliente.observacoes}
                    onChange={(e) => setDadosCliente({...dadosCliente, observacoes: e.target.value})}
                    className="pedido-input pedido-textarea"
                    placeholder="Sem cebola, maionese à parte, trocar batata por salada..."
                  />
                </div>

                {/* E-mail (opcional): recibo do PIX e campanhas */}
                <div className="pedido-campo">
                  <label className="pedido-label">E-mail (opcional — recibo do PIX e novidades)</label>
                  <input
                    type="email"
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    className="pedido-input"
                    placeholder="seuemail@exemplo.com"
                  />
                </div>

                {/* Consentimento (LGPD): começa desmarcado, o cliente precisa marcar de propósito */}
                <div className="pedido-campo pedido-campo--ultimo">
                  <label className="pedido-consentimento">
                    <input
                      type="checkbox"
                      checked={aceitaPromocoes}
                      onChange={(e) => setAceitaPromocoes(e.target.checked)}
                    />
                    <span>
                      Quero receber promoções da Pizzaria Porteira por WhatsApp e e-mail. Posso pedir para
                      parar a qualquer momento.
                    </span>
                  </label>
                  <p className="pedido-consentimento__nota">
                    Usamos seus dados para entregar o pedido e, só se você marcar acima, para enviar promoções.
                  </p>
                </div>
              </form>

              {/* RESUMO FINAL */}
              <div className="pedido-resumo">
                <h3 className="pedido-resumo__titulo">Resumo do Pedido</h3>
                <div className="pedido-resumo__itens">
                  <strong>Itens:</strong>
                  <ul className="pedido-resumo__lista">
                    {itens.map((item, index) => (
                      <li key={index} className="pedido-resumo__lista-item">
                        {item.quantidade}x {item.nome} - R$ {(item.preco * item.quantidade).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pedido-resumo__linha pedido-resumo__linha--compacta">
                  <span>Subtotal:</span>
                  <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                {cupomConfirmado && (
                  <div className="pedido-resumo__linha pedido-resumo__linha--compacta pedido-resumo__linha--desconto">
                    <span>Cupom {CUPOM_PRIMEIRA_COMPRA} (10% OFF):</span>
                    <span>-R$ {descontoPrevisto.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="pedido-resumo__total">
                  <span>Total a pagar:</span>
                  <span>R$ {totalComDesconto.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* FORMA DE PAGAMENTO (escolha entre WhatsApp e PIX) */}
              <div className="pedido-forma-pagamento">
                <h3 className="pedido-resumo__titulo">Como você quer pagar?</h3>
                <div className="pedido-forma-pagamento__opcoes">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('whatsapp')}
                    className={`pedido-forma-pagamento__opcao${formaPagamento === 'whatsapp' ? ' pedido-forma-pagamento__opcao--ativa' : ''}`}
                  >
                    💬 Combinar no WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('pix')}
                    className={`pedido-forma-pagamento__opcao${formaPagamento === 'pix' ? ' pedido-forma-pagamento__opcao--ativa' : ''}`}
                  >
                    ⚡ Pagar agora com PIX
                  </button>
                </div>

              </div>

              {/* BOTÕES DE AÇÃO: voltar e finalizar (o botão muda conforme a forma de pagamento) */}
              <div className="pedido-acoes">
                <button onClick={() => setEtapa('carrinho')} className="pedido-botao-voltar-carrinho">
                  ← Voltar ao Carrinho
                </button>

                {formaPagamento === 'whatsapp' ? (
                  <button
                    type="button"
                    onClick={handleFinalizarPedido}
                    disabled={enviando || !lojaAberta}
                    className="pedido-botao-finalizar"
                  >
                    {!lojaAberta ? '🔒 Loja fechada' : enviando ? 'Enviando...' : '💬 Finalizar Pedido no WhatsApp'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGerarPix}
                    disabled={enviando || !lojaAberta}
                    className="pedido-botao-finalizar pedido-botao-finalizar--pix"
                  >
                    {!lojaAberta ? '🔒 Loja fechada' : enviando ? 'Gerando PIX...' : '⚡ Gerar PIX e Pagar'}
                  </button>
                )}
              </div>

              {/* Erro ao gerar o PIX */}
              {erroPix && (
                <p className="pedido-cupom-feedback pedido-cupom-feedback--indisponivel">{erroPix}</p>
              )}

              {/* Aviso explicando o que acontece ao finalizar */}
              <p className="pedido-aviso-whatsapp">
                {formaPagamento === 'whatsapp'
                  ? '⚠️ Ao clicar em "Finalizar Pedido", você será redirecionado para o WhatsApp para confirmar seu pedido e combinar a forma de pagamento.'
                  : '⚡ Você vai receber um QR code PIX pra pagar na hora. Assim que o pagamento for confirmado, o pedido já entra como pago.'}
              </p>
            </div>
          )}

          {/* ETAPA 3: PAGAMENTO PIX */}
          {etapa === 'pagamento' && pixData && (
            <div className="pedido-card pedido-pix">
              {/* Aguardando pagamento: QR code e código "copia e cola" */}
              {statusPagamento === 'pendente' && (
                <>
                  <h2 className="pedido-card__titulo">⚡ Pague com PIX</h2>
                  <p className="pedido-pix__instrucao">
                    Escaneie o QR code no app do seu banco ou copie o código abaixo.
                  </p>

                  {pixData.qrCodeBase64 && (
                    <img
                      className="pedido-pix__qrcode"
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR code do PIX"
                    />
                  )}

                  {pixData.qrCode && (
                    <div className="pedido-pix__copia-cola">
                      <input
                        readOnly
                        value={pixData.qrCode}
                        className="pedido-input"
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        className="pedido-pix__botao-copiar"
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.qrCode || '')
                          showToast({ message: 'Código PIX copiado!', type: 'success', emoji: '📋', duration: 2000 })
                        }}
                      >
                        Copiar código
                      </button>
                    </div>
                  )}

                  <p className="pedido-pix__aguardando">⏳ Aguardando confirmação do pagamento...</p>

                  <div className="pedido-resumo">
                    <div className="pedido-resumo__total">
                      <span>Total:</span>
                      <span>R$ {totalComDesconto.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Pagamento aprovado: confirmação e atalho para avisar a pizzaria */}
              {statusPagamento === 'aprovado' && (
                <div className="pedido-pix__resultado">
                  <h2 className="pedido-card__titulo">✅ Pagamento confirmado!</h2>
                  <p>Seu pedido #{pedidoId} foi pago com sucesso. Já vamos começar a preparar!</p>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Acabei de pagar o pedido #${pedidoId} via PIX no site. 🍕`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pedido-botao-finalizar"
                  >
                    💬 Avisar a pizzaria no WhatsApp
                  </a>
                  <Link to="/cardapio" className="pedido-link-voltar-cardapio">
                    Voltar ao cardápio
                  </Link>
                </div>
              )}

              {/* PIX recusado ou expirado: permite voltar e tentar de novo */}
              {(statusPagamento === 'recusado' || statusPagamento === 'expirado') && (
                <div className="pedido-pix__resultado">
                  <h2 className="pedido-card__titulo">⚠️ Pagamento não concluído</h2>
                  <p>
                    O PIX {statusPagamento === 'expirado' ? 'expirou' : 'foi recusado'}. Você pode tentar
                    novamente ou finalizar pelo WhatsApp.
                  </p>
                  <div className="pedido-acoes">
                    <button
                      type="button"
                      className="pedido-botao-voltar-carrinho"
                      onClick={() => {
                        setEtapa('entrega')
                        setPixData(null)
                        setPedidoId(null)
                        setStatusPagamento('pendente')
                      }}
                    >
                      ← Tentar de novo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <footer className="pedido-rodape">
          <p>© 2024 Pizzaria Porteira - Sistema de Pedidos</p>
          <p className="pedido-rodape__texto--espacado">
            Dúvidas? WhatsApp: {formatarWhatsApp(WHATSAPP_NUMBER)}
          </p>
        </footer>
      </div>
    </>
  )
}
