// src/Pages/Pedidos.tsx - VERSÃO COMPLETA
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
import { WHATSAPP_NUMBER } from '../config/whatsapp'
import '../styles/pedido.css'

export default function Pedidos() {
  const {
    itens,
    total,
    quantidadeTotal,
    removerItem,
    atualizarQuantidade,
    limparCarrinho
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

  const [etapa, setEtapa] = useState<'carrinho' | 'entrega'>('carrinho')
  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    complemento: '',
    observacoes: ''
  })
  const [enviando, setEnviando] = useState(false)
  const [cupomElegivel, setCupomElegivel] = useState<boolean | null>(null)

  const telefoneDigits = dadosCliente.telefone.replace(/\D/g, '')
  const cupomDesbloqueadoPeloValor = total >= CUPOM_VALOR_MINIMO

  // Reconsulta o backend sempre que o telefone muda, com um pequeno atraso para não
  // disparar uma requisição a cada tecla digitada. A verdade definitiva sobre o cupom
  // só é decidida no servidor ao finalizar o pedido — isso aqui é só feedback visual.
  useEffect(() => {
    if (!cupomDesbloqueadoPeloValor || telefoneDigits.length < 10) {
      setCupomElegivel(null)
      return
    }

    let cancelado = false
    const timer = setTimeout(() => {
      verificarCupomPrimeiraCompra(dadosCliente.telefone).then((elegivel) => {
        if (!cancelado) setCupomElegivel(elegivel)
      })
    }, 600)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [telefoneDigits, cupomDesbloqueadoPeloValor, dadosCliente.telefone])

  const cupomConfirmado = cupomDesbloqueadoPeloValor && cupomElegivel === true
  const descontoPrevisto = cupomConfirmado ? Number((total * CUPOM_PERCENTUAL).toFixed(2)) : 0
  const totalComDesconto = Number((total - descontoPrevisto).toFixed(2))

  // Se carrinho vazio
  if (quantidadeTotal === 0) {
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
      })

      if (resultado) {
        resumoFinal = {
          subtotal: resultado.subtotal,
          desconto: resultado.desconto,
          total: resultado.total,
          cupom: resultado.cupom,
        }
      }
    } finally {
      setEnviando(false)
      marcarPedidoRealizado()
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(gerarMensagemWhatsApp(resumoFinal))}`
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
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

          {/* ETAPA 1: CARRINHO */}
          {etapa === 'carrinho' && (
            <>
              <div className="pedido-card">
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

              <form className="pedido-form">
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

                <div className="pedido-campo pedido-campo--ultimo">
                  <label className="pedido-label">Observações do Pedido</label>
                  <textarea
                    value={dadosCliente.observacoes}
                    onChange={(e) => setDadosCliente({...dadosCliente, observacoes: e.target.value})}
                    className="pedido-input pedido-textarea"
                    placeholder="Sem cebola, maionese à parte, trocar batata por salada..."
                  />
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

              {/* BOTÕES DE AÇÃO */}
              <div className="pedido-acoes">
                <button onClick={() => setEtapa('carrinho')} className="pedido-botao-voltar-carrinho">
                  ← Voltar ao Carrinho
                </button>

                <button
                  type="button"
                  onClick={handleFinalizarPedido}
                  disabled={enviando}
                  className="pedido-botao-finalizar"
                >
                  {enviando ? 'Enviando...' : '💬 Finalizar Pedido no WhatsApp'}
                </button>
              </div>

              <p className="pedido-aviso-whatsapp">
                ⚠️ Ao clicar em "Finalizar Pedido", você será redirecionado para o WhatsApp
                para confirmar seu pedido e combinar a forma de pagamento.
              </p>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <footer className="pedido-rodape">
          <p>© 2024 Pizzaria Porteira - Sistema de Pedidos</p>
          <p className="pedido-rodape__texto--espacado">
            Dúvidas? WhatsApp: (11) 99999-9999
          </p>
        </footer>
      </div>
    </>
  )
}
