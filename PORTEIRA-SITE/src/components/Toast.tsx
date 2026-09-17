import { useState, useEffect } from 'react'
import { sendPromoEmail, sendWhatsAppMessage, copyToClipboard } from '../services/emailService'
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

  const sendWhatsApp = (toast: ToastInstance) => {
    const message = toast.promoDetails?.whatsappMessage || toast.message
    sendWhatsAppMessage(message, '5511999999999') // Substitua pelo número da pizzaria
  }

  const sendEmail = (toast: ToastInstance) => {
    const subject = toast.promoDetails?.emailSubject || 'Promoção Pizzaria Porteira'
    const body = toast.promoDetails?.emailBody || toast.message
    const userEmail = prompt('Digite seu email para receber a promoção:')
    if (userEmail) {
      sendPromoEmail({
        userEmail,
        subject,
        body,
        promoMessage: toast.message
      })
    }
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
              <div className="toast__acoes">
                <button className="toast__botao-acao" onClick={() => sendWhatsApp(toast)}>
                  📱 WhatsApp
                </button>

                <button className="toast__botao-acao" onClick={() => sendEmail(toast)}>
                  ✉️ Email
                </button>

                <button
                  className="toast__botao-acao"
                  onClick={() => handleCopyToClipboard(toast.promoDetails?.whatsappMessage || toast.message)}
                >
                  📋 Copiar
                </button>
              </div>
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
