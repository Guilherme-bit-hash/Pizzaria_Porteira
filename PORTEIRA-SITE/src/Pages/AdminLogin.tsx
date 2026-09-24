// src/Pages/AdminLogin.tsx
// Tela de login do painel administrativo, servida na rota "/admin" (definida em App.tsx).
// Envia usuário e senha para o backend (POST /api/auth/login, via loginAdmin em services/pedidoService.ts).
// Se der certo, o token fica salvo no navegador e o usuário é levado para /admin/pedidos.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/pedidoService'
import { showToast } from '../components/Toast'
import '../styles/admin.css'

export default function AdminLogin() {
  // useNavigate: hook do react-router que devolve uma função para trocar de página por código
  const navigate = useNavigate()

  // useState guarda um valor que, ao mudar, faz o componente ser redesenhado.
  // Aqui: o que foi digitado nos campos do formulário...
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  // ...e se a requisição está em andamento (desativa o botão para evitar cliques duplos)
  const [carregando, setCarregando] = useState(false)

  // Chamado quando o formulário é enviado (clique em "Entrar" ou Enter)
  const handleSubmit = async (e: React.FormEvent) => {
    // Impede o comportamento padrão do navegador (recarregar a página ao enviar o form)
    e.preventDefault()
    setCarregando(true)
    try {
      // Chama o backend; em caso de sucesso o token já é salvo no localStorage por loginAdmin
      await loginAdmin(usuario, senha)
      navigate('/admin/dashboard')
    } catch (error) {
      // Credenciais erradas ou backend fora do ar: avisa com uma notificação
      showToast({
        message: error instanceof Error ? error.message : 'Erro ao fazer login.',
        type: 'error',
        emoji: '⚠️',
      })
    } finally {
      // Roda sempre, com sucesso ou erro: reabilita o botão
      setCarregando(false)
    }
  }

  return (
    <div className="admin-page admin-page--login">
      <form onSubmit={handleSubmit} className="admin-form">
        <h1 className="admin-form__titulo">
          🔒 Painel Administrativo
        </h1>

        {/* Campo de usuário (input "controlado": o valor vem do estado e cada tecla o atualiza) */}
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

        {/* Campo de senha (type="password" esconde os caracteres) */}
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

        {/* Botão de envio: mostra "Entrando..." e fica desativado durante a requisição */}
        <button type="submit" disabled={carregando} className="admin-botao-primario">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
