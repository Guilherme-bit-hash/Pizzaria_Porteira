// ============================================================================
// Toast - sistema de avisos temporários ("toasts") que aparecem no canto da tela.
// Como funciona: `showToast()` pode ser chamado de QUALQUER lugar do código (mesmo
// fora de componentes); ele guarda o aviso numa lista global e avisa os
// componentes que estão "ouvindo". O <ToastContainer /> desenha essa lista.
// Usado em: App.tsx (<ToastContainer />, montado uma vez) e, via showToast, em
// Pages/*, PrimeiraCompraToast, PromocaoDiaToast, PromocoesLandingToast e
// services/emailService.
// Estilos: styles/toast.css.
// ============================================================================
import { useState, useEffect } from 'react'
import { sendPromoEmail, sendWhatsAppMessage, copyToClipboard } from '../services/emailService'
import { WHATSAPP_NUMBER } from '../config/whatsapp'
import '../styles/toast.css'

// Props/dados de um toast (exportado para quem precisar do tipo).
export interface ToastProps {
  // Identificador único, gerado automaticamente por showToast.
  id: string
  // Texto exibido (\n quebra linha).
  message: string
  // Tipo do aviso; define a cor via classe `toast--<type>`.
  type: 'success' | 'info' | 'warning' | 'error' | 'promocao'
  // Tempo em ms até sumir; 0 = não fecha sozinho; padrão 4000.
  duration?: number
  // Emoji mostrado à esquerda (há um padrão por tipo).
  emoji?: string
  onClose?: () => void
  // Mostra os botões WhatsApp / Email / Copiar (só para o tipo 'promocao').
  showShareButtons?: boolean
  // Textos usados ao compartilhar a promoção.
  promoDetails?: {
    whatsappMessage?: string
    emailSubject?: string
    emailBody?: string
  }
}

// Toast + flag interna para a animação de saída.
interface ToastInstance extends ToastProps {
  isExiting?: boolean
}

// ---- Estado global (fica fora dos componentes, por isso funciona em qualquer lugar) ----
// Contador para gerar ids únicos.
let toastId = 0
// Toasts atualmente ativos, indexados pelo id.
const toasts: Map<string, ToastInstance> = new Map()
// Funções inscritas para serem avisadas a cada mudança (uma por ToastContainer montado).
const listeners: Set<(toasts: Map<string, ToastInstance>) => void> = new Set()

// Cria e exibe um toast. Devolve o id, que permite fechá-lo depois com removeToast.
export const showToast = (props: Omit<ToastProps, 'id'>) => {
  const id = `toast-${toastId++}`
  const toast: ToastInstance = { id, ...props }
  toasts.set(id, toast)
  notifyListeners()

  // Agenda o fechamento automático, salvo se duration for 0.
  if (props.duration !== 0) {
    setTimeout(() => removeToast(id), props.duration || 4000)
  }

  return id
}

// Fecha um toast: primeiro marca a saída (dispara a animação CSS) e, 300 ms depois,
// remove de fato da lista (tempo compatível com a animação em toast.css).
export const removeToast = (id: string) => {
  const toast = toasts.get(id)
  if (toast) {
    toast.isExiting = true
    notifyListeners()
    setTimeout(() => {
      toasts.delete(id)
      notifyListeners()
    }, 300)
  }
}

// Avisa todos os "ouvintes" enviando uma cópia da lista (cópia nova faz o React perceber a mudança).
const notifyListeners = () => {
  listeners.forEach(listener => listener(new Map(toasts)))
}

// Hook que entrega a lista atual de toasts e se re-renderiza quando ela muda.
export const useToasts = () => {
  // useState: memória do componente, iniciada com a lista atual.
  const [activeToasts, setActiveToasts] = useState<Map<string, ToastInstance>>(new Map(toasts))

  // useEffect: ao montar, inscreve o setter como ouvinte; a função devolvida
  // (cleanup) desinscreve quando o componente sai da tela.
  useEffect(() => {
    listeners.add(setActiveToasts)
    return () => {
      listeners.delete(setActiveToasts)
    }
  }, [])

  return activeToasts
}

// Componente que desenha todos os toasts ativos (montado uma vez no App.tsx).
export function ToastContainer() {
  const toastList = useToasts()
  // Em vez do prompt() nativo do navegador (bloqueia a thread, é inacessível e pode ser
  // desabilitado pelo navegador), o botão "Email" abre um formulário inline dentro do
  // próprio toast. Guardamos aqui qual toast está com o formulário aberto e o valor digitado.
  const [emailFormAberto, setEmailFormAberto] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')

  // Handler: abre o WhatsApp com o texto da promoção.
  const sendWhatsApp = (toast: ToastInstance) => {
    const message = toast.promoDetails?.whatsappMessage || toast.message
    sendWhatsAppMessage(message, WHATSAPP_NUMBER)
  }

  // Handler: mostra o formulário de e-mail dentro do toast escolhido.
  const abrirFormularioEmail = (toastId: string) => {
    setEmailFormAberto(toastId)
    setEmailInput('')
  }

  // Handler: fecha o formulário sem enviar.
  const cancelarFormularioEmail = () => {
    setEmailFormAberto(null)
    setEmailInput('')
  }

  // Handler: envia a promoção para o e-mail digitado e fecha o formulário.
  const confirmarEnvioEmail = (toast: ToastInstance) => {
    const subject = toast.promoDetails?.emailSubject || 'Promoção Pizzaria Porteira'
    const body = toast.promoDetails?.emailBody || toast.message

    sendPromoEmail({
      userEmail: emailInput.trim(),
      subject,
      body,
      promoMessage: toast.message
    })

    setEmailFormAberto(null)
    setEmailInput('')
  }

  // Handler: copia o texto da promoção para a área de transferência.
  const handleCopyToClipboard = (text: string) => {
    copyToClipboard(text)
  }

  return (
    <div className="toast-container">
      {/* Um bloco por toast ativo; a classe `toast--exiting` dispara a animação de saída */}
      {Array.from(toastList.values()).map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}${toast.isExiting ? ' toast--exiting' : ''}`}
        >
          {/* EMOJI */}
          <span className="toast__emoji">
            {toast.emoji || (toast.type === 'promocao' ? '🎯' : '✓')}
          </span>

          {/* CONTEÚDO */}
          <div className="toast__conteudo">
            <div>{toast.message}</div>

            {/* BOTÕES DE COMPARTILHAMENTO */}
            {/* Mostra o formulário de e-mail (se aberto neste toast) ou os 3 botões de ação */}
            {toast.showShareButtons && toast.type === 'promocao' && (
              emailFormAberto === toast.id ? (
                <form
                  className="toast__form-email"
                  onSubmit={(e) => {
                    e.preventDefault()
                    confirmarEnvioEmail(toast)
                  }}
                >
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="seu@email.com"
                    aria-label="Seu email para receber a promoção"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="toast__input-email"
                  />
                  <button type="submit" className="toast__botao-acao">
                    Enviar
                  </button>
                  <button type="button" className="toast__botao-acao" onClick={cancelarFormularioEmail}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="toast__acoes">
                  <button className="toast__botao-acao" onClick={() => sendWhatsApp(toast)}>
                    📱 WhatsApp
                  </button>

                  <button className="toast__botao-acao" onClick={() => abrirFormularioEmail(toast.id)}>
                    ✉️ Email
                  </button>

                  <button
                    className="toast__botao-acao"
                    onClick={() => handleCopyToClipboard(toast.promoDetails?.whatsappMessage || toast.message)}
                  >
                    📋 Copiar
                  </button>
                </div>
              )
            )}
          </div>

          {/* BOTÃO FECHAR */}
          <button className="toast__botao-fechar" onClick={() => removeToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
