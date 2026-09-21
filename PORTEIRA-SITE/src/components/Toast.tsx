import { useState, useEffect } from 'react'
import { sendPromoEmail, sendWhatsAppMessage, copyToClipboard } from '../services/emailService'
import { WHATSAPP_NUMBER } from '../config/whatsapp'
import '../styles/toast.css'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error' | 'promocao'
  duration?: number
  emoji?: string
  onClose?: () => void
  showShareButtons?: boolean
  promoDetails?: {
    whatsappMessage?: string
    emailSubject?: string
    emailBody?: string
  }
}

interface ToastInstance extends ToastProps {
  isExiting?: boolean
}

let toastId = 0
const toasts: Map<string, ToastInstance> = new Map()
const listeners: Set<(toasts: Map<string, ToastInstance>) => void> = new Set()

export const showToast = (props: Omit<ToastProps, 'id'>) => {
  const id = `toast-${toastId++}`
  const toast: ToastInstance = { id, ...props }
  toasts.set(id, toast)
  notifyListeners()

  if (props.duration !== 0) {
    setTimeout(() => removeToast(id), props.duration || 4000)
  }

  return id
}

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

const notifyListeners = () => {
  listeners.forEach(listener => listener(new Map(toasts)))
}

export const useToasts = () => {
  const [activeToasts, setActiveToasts] = useState<Map<string, ToastInstance>>(new Map(toasts))

  useEffect(() => {
    listeners.add(setActiveToasts)
    return () => {
      listeners.delete(setActiveToasts)
    }
  }, [])

  return activeToasts
}

export function ToastContainer() {
  const toastList = useToasts()
  // Em vez do prompt() nativo do navegador (bloqueia a thread, é inacessível e pode ser
  // desabilitado pelo navegador), o botão "Email" abre um formulário inline dentro do
  // próprio toast. Guardamos aqui qual toast está com o formulário aberto e o valor digitado.
  const [emailFormAberto, setEmailFormAberto] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')

  const sendWhatsApp = (toast: ToastInstance) => {
    const message = toast.promoDetails?.whatsappMessage || toast.message
    sendWhatsAppMessage(message, WHATSAPP_NUMBER)
  }

  const abrirFormularioEmail = (toastId: string) => {
    setEmailFormAberto(toastId)
    setEmailInput('')
  }

  const cancelarFormularioEmail = () => {
    setEmailFormAberto(null)
    setEmailInput('')
  }

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

  const handleCopyToClipboard = (text: string) => {
    copyToClipboard(text)
  }

  return (
    <div className="toast-container">
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
