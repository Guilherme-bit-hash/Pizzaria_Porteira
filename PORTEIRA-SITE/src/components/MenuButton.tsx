// src/components/MenuButton.tsx
// ============================================================================
// MenuButton - botão de "três pontinhos" que abre o menu lateral (Sidebar).
// Usado em: Pages/Cardapio.tsx.
// Estilos: styles/menuButton.css.
// ============================================================================
import '../styles/menuButton.css'

// Props: dados que o pai passa ao componente.
interface MenuButtonProps {
  // Função chamada ao clicar (o pai decide o que fazer, ex.: abrir a Sidebar).
  onClick: () => void
}

export default function MenuButton({ onClick }: MenuButtonProps) {
  return (
    // aria-label: texto lido por leitores de tela, já que o botão só tem desenhos
    <button onClick={onClick} aria-label="Abrir menu" className="menu-button">
      {/* Os três pontos (estilizados via CSS) */}
      <span className="menu-button__ponto" />
      <span className="menu-button__ponto" />
      <span className="menu-button__ponto" />
    </button>
  )
}
