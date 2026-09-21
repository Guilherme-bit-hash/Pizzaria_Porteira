// src/components/WhatsAppFlutuante.tsx
import '../styles/whatsappFlutuante.css'
import { WHATSAPP_NUMBER } from '../config/whatsapp'

export default function WhatsAppFlutuante() {
  const mensagemPadrao = encodeURIComponent(
    "Olá! Gostaria de fazer um pedido ou tirar uma dúvida sobre o cardápio da Pizzaria Porteira."
  )

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${mensagemPadrao}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
      className="whatsapp-flutuante"
    >
      <svg
        viewBox="0 0 32 32"
        width="30"
        height="30"
        fill="white"
        aria-hidden="true"
        className="whatsapp-flutuante__icone"
      >
        <path d="M16.004 2.667c-7.363 0-13.333 5.97-13.333 13.333 0 2.352.615 4.646 1.784 6.664L2.667 29.333l6.83-1.76a13.27 13.27 0 0 0 6.507 1.76h.006c7.362 0 13.333-5.97 13.333-13.333s-5.977-13.333-13.339-13.333Zm0 24.4a11.03 11.03 0 0 1-5.63-1.54l-.404-.24-4.053 1.045 1.08-3.949-.263-.406a11.04 11.04 0 0 1-1.696-5.877c0-6.106 4.968-11.067 11.072-11.067 2.958 0 5.738 1.152 7.829 3.245a10.994 10.994 0 0 1 3.238 7.829c0 6.106-4.968 11.067-11.073 11.067v-.107Zm6.06-8.284c-.332-.166-1.965-.97-2.27-1.08-.305-.11-.527-.166-.75.166-.221.332-.858 1.08-1.052 1.302-.194.221-.388.249-.72.083-.332-.166-1.402-.517-2.671-1.65-.987-.882-1.654-1.972-1.848-2.304-.194-.332-.02-.512.146-.677.15-.15.332-.388.499-.582.166-.194.221-.332.332-.554.11-.221.055-.415-.028-.582-.083-.166-.75-1.808-1.028-2.475-.271-.652-.546-.564-.75-.574-.194-.009-.416-.011-.638-.011-.221 0-.582.083-.887.415-.305.332-1.163 1.137-1.163 2.773 0 1.637 1.19 3.218 1.356 3.44.166.221 2.343 3.578 5.677 5.017.793.343 1.412.548 1.894.701.796.253 1.52.217 2.093.132.639-.095 1.965-.803 2.242-1.579.277-.775.277-1.44.194-1.579-.083-.138-.305-.221-.638-.387Z" />
      </svg>
    </a>
  )
}
