// src/components/MenuButton.tsx
import '../styles/menuButton.css'

interface MenuButtonProps {
  onClick: () => void
}

export default function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <button onClick={onClick} aria-label="Abrir menu" className="menu-button">
      <span className="menu-button__ponto" />
      <span className="menu-button__ponto" />
      <span className="menu-button__ponto" />
    </button>
  )
}
