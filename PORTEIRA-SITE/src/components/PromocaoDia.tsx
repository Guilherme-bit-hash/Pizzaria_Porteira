// ============================================================================
// PromocaoDia - cartão colorido com a promoção fixa de cada dia da semana.
// Usado em: atualmente não é importado por nenhuma página (componente disponível
// para uso futuro; a promoção do dia exibida hoje vem do PromocaoDiaToast).
// Props: nenhuma - o dia é calculado a partir da data do computador do cliente.
// Estilos: styles/promocaoDia.css.
// ============================================================================
import { useState } from 'react'
import '../styles/promocaoDia.css'

// Formato de uma promoção diária.
interface Promocao {
  titulo: string
  descricao: string
  // Cor de destaque do cartão (repassada ao CSS pela variável --promo-cor).
  cor: string
  emoji: string
  // Rota do cardápio para onde a promoção aponta.
  link: string
}

// Tabela de promoções: a posição no array é o número do dia (0 = domingo ... 6 = sábado),
// o mesmo valor devolvido por Date.getDay().
const promocoesPorDia: Promocao[] = [
  {
    titulo: '🍕 Domingo em Família',
    descricao: '2 Pizzas Grandes + Refri 2L por R$ 89,90',
    cor: '#FF6B35',
    emoji: '👨‍👩‍👧‍👦',
    link: '/cardapio?promo=domingo'
  },
  {
    titulo: '🎯 Segunda da Pizza',
    descricao: 'Todas as pizzas com 20% OFF',
    cor: '#4A90E2',
    emoji: '🍕',
    link: '/cardapio?categoria=pizzas'
  },
  {
    titulo: '🍔 Terça do Hambúrguer',
    descricao: 'Hambúrguer + Batata + Refri por R$ 29,90',
    cor: '#8B4513',
    emoji: '🍔',
    link: '/cardapio?categoria=hamburgueres'
  },
  {
    titulo: '🎪 Quarta do Rodízio',
    descricao: 'Rodízio de Pizza por R$ 39,90',
    cor: '#9C27B0',
    emoji: '🎪',
    link: '/cardapio?promo=rodizio'
  },
  {
    titulo: '🥤 Quinta da Bebida',
    descricao: 'Refrigerante 2L por R$ 8,90',
    cor: '#2196F3',
    emoji: '🥤',
    link: '/cardapio?categoria=bebidas'
  },
  {
    titulo: '🎉 Sexta Feliz',
    descricao: 'Combo Casal: Pizza + 2 Refris por R$ 59,90',
    cor: '#FF9800',
    emoji: '🎉',
    link: '/cardapio?promo=sexta'
  },
  {
    titulo: '🌟 Sábado Especial',
    descricao: 'Promoção surpresa! Pergunte no WhatsApp',
    cor: '#FFD700',
    emoji: '🌟',
    link: '/cardapio'
  }
]

// Nomes dos dias, na mesma ordem de getDay() (0 = domingo).
const diasDaSemana = [
  'Domingo', 'Segunda-feira', 'Terça-feira',
  'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
]

export default function PromocaoDia() {
  // useState: memória do componente; `isClosed` vira true quando o cliente clica no "✕".
  const [isClosed, setIsClosed] = useState(false)
  // Descobre a promoção e o nome do dia de hoje.
  const hoje = new Date()
  const diaDaSemana = hoje.getDay()
  const promocao = promocoesPorDia[diaDaSemana]
  const nomeDia = diasDaSemana[diaDaSemana]

  // Nada para mostrar se não há promoção ou se o cliente fechou o cartão.
  if (!promocao || isClosed) {
    return null
  }

  return (
    <div className="promocao-dia">
      {/* Cartão principal; injeta a cor do dia como variável CSS --promo-cor */}
      <div
        className="promocao-dia__card"
        style={{ '--promo-cor': promocao.cor } as React.CSSProperties}
      >
        {/* Efeito de luz animado */}
        <div className="promocao-dia__brilho" />

        {/* Conteúdo */}
        <div className="promocao-dia__conteudo">
          {/* Lado esquerdo */}
          <div className="promocao-dia__lado-esquerdo">
            {/* Emoji + etiqueta com o nome do dia */}
            <div className="promocao-dia__topo">
              <span className="promocao-dia__emoji">{promocao.emoji}</span>
              <span className="promocao-dia__tag-dia">{nomeDia.toUpperCase()}</span>
            </div>

            {/* Título da promoção */}
            <h3 className="promocao-dia__titulo">{promocao.titulo}</h3>

            {/* Descrição da oferta */}
            <p className="promocao-dia__descricao">{promocao.descricao}</p>
          </div>

          {/* Lado direito - Ícone animado */}
          <div className="promocao-dia__icone-lateral">🔥</div>
        </div>

        {/* Badge de horário */}
        <div className="promocao-dia__badge-horario">⏰ Apenas hoje</div>

        {/* Botão fechar */}
        <button onClick={() => setIsClosed(true)} className="promocao-dia__fechar">
          ✕
        </button>
      </div>
    </div>
  )
}
