import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/pedidoService'
import { showToast } from '../components/Toast'
import '../styles/admin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    try {
      await loginAdmin(usuario, senha)
      navigate('/admin/pedidos')
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Erro ao fazer login.',
        type: 'error',
        emoji: '⚠️',
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="admin-page admin-page--login">
      <form onSubmit={handleSubmit} className="admin-form">
        <h1 className="admin-form__titulo">
          🔒 Painel Administrativo
        </h1>

        <div className="admin-campo">
          <label className="admin-label">Usuário</label>
          <input
            type="text"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="admin-input"
          />
        </div>

        <div className="admin-campo admin-campo--ultimo">
          <label className="admin-label">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="admin-input"
          />
        </div>

        <button type="submit" disabled={carregando} className="admin-botao-primario">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
