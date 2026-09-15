import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/pedidoService'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await loginAdmin(usuario, senha)
      navigate('/admin/pedidos')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao fazer login.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D1B00 0%, #3A240F 30%, #4A2F15 60%, #5A3E2B 100%)',
      color: 'white',
      fontFamily: "'Montserrat', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '2.5rem',
          maxWidth: '400px',
          width: '100%',
          border: '2px solid rgba(255, 215, 0, 0.3)',
        }}
      >
        <h1 style={{ color: '#FFD700', fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          🔒 Painel Administrativo
        </h1>

        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700' }}>Usuário</label>
          <input
            type="text"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFD700' }}>Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
            }}
          />
        </div>

        {erro && (
          <p style={{ color: '#FF8888', marginBottom: '1rem', fontSize: '0.9rem' }}>{erro}</p>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#2D1B00',
            border: 'none',
            padding: '1rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.7 : 1,
          }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
