import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/navbar.css'

interface NavbarProps {
  logo?: string
  showBackButton?: boolean
  backTo?: string
}

export default function Navbar({ logo = '/logo.jpeg', showBackButton = false, backTo = '/' }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
        <button onClick={toggleMenu} className="navbar-hamburger">
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* SIDEBAR MOBILE */}
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
      {isMenuOpen && (
        <div onClick={() => setIsMenuOpen(false)} className="navbar__overlay" />
      )}
    </>
  )
}
