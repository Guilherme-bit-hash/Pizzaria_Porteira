import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePromocaoDoDia } from '../hooks/usePromocaoDoDia'
import { showToast } from './Toast'

// Renderizado uma única vez, globalmente, em App.tsx — assim aparece em
// qualquer página do site (exceto no painel admin, onde não faz sentido).
export default function PromocaoDiaToast() {
  const { promocaoAtual } = usePromocaoDoDia()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (promocaoAtual && !isAdmin) {
      // Mostrar toast apenas uma vez por sessão
      const toastMostrado = sessionStorage.getItem('promocao-toast-mostrado')
      if (!toastMostrado) {
        // Aguardar um pouco para a página carregar completamente
        const timer = setTimeout(() => {
          showToast({
            message: `${promocaoAtual.nome}\n${promocaoAtual.descricao}`,
            type: 'promocao',
            emoji: promocaoAtual.nome.split(' ')[0],
            duration: 0, // Não fecha automaticamente
            showShareButtons: true,
            promoDetails: {
              whatsappMessage: promocaoAtual.whatsappMessage,
              emailSubject: promocaoAtual.emailSubject,
              emailBody: promocaoAtual.emailBody
            }
          })

          sessionStorage.setItem('promocao-toast-mostrado', 'true')
        }, 800)

        return () => clearTimeout(timer)
      }
    }
  }, [promocaoAtual, isAdmin])

  // Este componente não renderiza nada visualmente
  return null
}
