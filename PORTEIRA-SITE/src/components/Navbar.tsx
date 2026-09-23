// ============================================================================
// Navbar - barra superior do site (logo, botão voltar e menu hambúrguer no celular).
// Usado em: App.tsx, Pages/Cardapio.tsx e Pages/Pedido.tsx.
// Props: logo (imagem), showBackButton (mostra "Voltar") e backTo (destino do "Voltar").
// Estilos: styles/navbar.css.
// ============================================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/navbar.css'

// Props (todas opcionais, por causa do `?`; os padrões ficam na função abaixo).
interface NavbarProps {
  // Caminho da imagem do logo.
  logo?: string
  // Se true, exibe o link "← Voltar".
  showBackButton?: boolean
  // Rota para onde o "Voltar" leva.
  backTo?: string
}

export default function Navbar({ logo = '/logo.jpeg', showBackButton = false, backTo = '/' }: NavbarProps) {
  // useState: memória do componente. Guarda se o menu mobile está aberto;
  // ao chamar setIsMenuOpen o React redesenha o componente com o novo valor.
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Handler: alterna o menu entre aberto e fechado (usado pelo botão hambúrguer).
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      <header className="navbar">
        {/* BOTÃO VOLTAR - DESKTOP */}
        {showBackButton && (
          <Link to={backTo} className="navbar-back-desktop">
            ← Voltar
          </Link>
        )}

        {/* LOGO */}
        <div className="navbar__logo-wrap">
          <img src={logo} alt="Logo" className="navbar__logo-img" />
        </div>

        {/* HAMBURGER MENU - MOBILE */}
        <button
          onClick={toggleMenu}
          className="navbar-hamburger"
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* SIDEBAR MOBILE */}
      {/* Painel de links; cada link fecha o menu ao ser clicado */}
      {isMenuOpen && (
        <div className="navbar-sidebar-mobile">
          {showBackButton && (
            <Link to={backTo} onClick={() => setIsMenuOpen(false)} className="navbar__link">
              ← Voltar
            </Link>
          )}

          <Link to="/" onClick={() => setIsMenuOpen(false)} className="navbar__link">
            🏠 Home
          </Link>

          <Link to="/cardapio" onClick={() => setIsMenuOpen(false)} className="navbar__link">
            🍕 Cardápio
          </Link>

          <Link to="/sobre" onClick={() => setIsMenuOpen(false)} className="navbar__link">
            ℹ️ Sobre
          </Link>

          <Link to="/contato" onClick={() => setIsMenuOpen(false)} className="navbar__link">
            📞 Contato
          </Link>
        </div>
      )}

      {/* OVERLAY - FECHA MENU AO CLICAR */}
      {/* Fundo escurecido atrás do menu; clicar fora dele fecha o menu */}
      {isMenuOpen && (
        <div onClick={() => setIsMenuOpen(false)} className="navbar__overlay" />
      )}
    </>
  )
}
