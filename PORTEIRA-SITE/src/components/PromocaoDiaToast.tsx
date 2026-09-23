// ============================================================================
// PromocaoDiaToast - componente "invisível" que exibe o toast da promoção do dia.
// Usado em: App.tsx (montado uma vez, vale para todas as páginas).
// Props: nenhuma - a promoção vem do hook usePromocaoDoDia.
// Sem CSS próprio (o visual vem de Toast / styles/toast.css).
// ============================================================================
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePromocaoDoDia } from '../hooks/usePromocaoDoDia'
import { showToast } from './Toast'

// Renderizado uma única vez, globalmente, em App.tsx — assim aparece em
// qualquer página do site (exceto no painel admin, onde não faz sentido).
export default function PromocaoDiaToast() {
  // Hook próprio que busca/calcula a promoção válida para hoje (pode ser nula).
  const { promocaoAtual } = usePromocaoDoDia()
  const location = useLocation()
  // Detecta se estamos numa rota do painel admin (onde o toast não faz sentido).
  const isAdmin = location.pathname.startsWith('/admin')

  // useEffect: roda quando a promoção carrega ou a rota muda (dependências no fim) e decide se o toast deve ser exibido agora.
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

          // Marca como já mostrado nesta sessão.
          sessionStorage.setItem('promocao-toast-mostrado', 'true')
        }, 800)

        // Cleanup: se o componente sair da tela antes dos 800 ms, cancela o agendamento.
        return () => clearTimeout(timer)
      }
    }
  }, [promocaoAtual, isAdmin])

  // Este componente não renderiza nada visualmente
  return null
}
