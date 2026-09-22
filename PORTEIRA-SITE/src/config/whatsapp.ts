// Número de WhatsApp da pizzaria, no formato internacional sem símbolos (ex: 5511999999999).
// Configure em VITE_WHATSAPP_NUMBER no .env.
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

// Formata o número para exibição, ex: "5511999999999" -> "+55 (11) 99999-9999".
// Retorna o número original se não bater no formato DDI+DDD+telefone esperado.
export function formatarWhatsApp(numero: string): string {
  const digitos = numero.replace(/\D/g, '')
  const match = digitos.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/)
  if (!match) return numero

  const [, ddi, ddd, parte1, parte2] = match
  return `+${ddi} (${ddd}) ${parte1}-${parte2}`
}
