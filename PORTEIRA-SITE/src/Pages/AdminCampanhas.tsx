import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNav from '../components/AdminNav'
import { showToast } from '../components/Toast'
import { getAdminToken, limparAdminToken } from '../services/pedidoService'
import { listarPromocoes, type PromocaoApi } from '../services/promocaoService'
import { enviarCampanhaEmail, obterStatusCampanha, type StatusCampanha } from '../services/campanhaService'
import '../styles/admin.css'

const NOMES_DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default function AdminCampanhas() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<StatusCampanha | null>(null)
  const [promocoes, setPromocoes] = useState<PromocaoApi[]>([])
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [emailTeste, setEmailTeste] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState('')

  const tratarErro = useCallback(
    (error: unknown, mensagemPadrao: string) => {
      if (error instanceof Error && /token/i.test(error.message)) {
        limparAdminToken()
        navigate('/admin')
        return
      }
      showToast({
        message: error instanceof Error ? error.message : mensagemPadrao,
        type: 'error',
        emoji: '⚠️',
      })
    },
    [navigate]
  )

  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    obterStatusCampanha().then(setStatus).catch((error) => tratarErro(error, 'Erro ao carregar dados da campanha.'))
    listarPromocoes().then((dados) => dados && setPromocoes(dados))
  }, [navigate, tratarErro])

  // Preenche assunto e mensagem com o texto de e-mail já cadastrado na promoção do dia escolhido
  const usarPromocaoDoDia = (dia: number) => {
    const promocao = promocoes.find((item) => item.diaSemana === dia)
    if (!promocao) return
    setAssunto(promocao.emailSubject ?? promocao.nome)
    setMensagem(promocao.emailBody ?? promocao.descricao)
  }

  const enviar = async (paraTeste: boolean) => {
    if (!paraTeste) {
      const confirmou = window.confirm(
        `Enviar esta promoção para ${status?.totalDestinatarios ?? 0} cliente(s)? Não dá para desfazer.`
      )
      if (!confirmou) return
    }

    setEnviando(true)
    setResultado('')
    try {
      const envio = await enviarCampanhaEmail(assunto, mensagem, paraTeste ? emailTeste : undefined)
      const texto = `${envio.teste ? 'Teste' : 'Campanha'}: ${envio.enviados} enviado(s), ${envio.falhas} falha(s).`
      setResultado(texto)
      showToast({ message: texto, type: envio.falhas ? 'warning' : 'success', emoji: '📧', duration: 4000 })
    } catch (error) {
      tratarErro(error, 'Erro ao enviar a campanha.')
    } finally {
      setEnviando(false)
    }
  }

  const formularioCompleto = assunto.trim() !== '' && mensagem.trim() !== ''

  return (
    <div className="admin-page">
      <header className="admin-header admin-header--estreito">
        <h1 className="admin-header__titulo">📧 Campanhas por e-mail</h1>
        <AdminNav atual="campanhas" />
      </header>

      <div className="admin-conteudo admin-conteudo--estreito">
        {status && !status.emailConfigurado && (
          <p className="admin-mensagem-erro">
            O envio de e-mail ainda não está configurado no servidor. Preencha SMTP_HOST, SMTP_USER, SMTP_PASS e
            SMTP_FROM no arquivo .env do backend.
          </p>
        )}

        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Destinatários</h3>
          <p className="admin-mensagem-neutra">
            {status
              ? `${status.totalDestinatarios} cliente(s) aceitaram receber promoções e têm e-mail cadastrado.`
              : 'Carregando...'}
          </p>
        </div>

        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Mensagem</h3>

          <div className="admin-campo-simples">
            <label className="admin-label">Começar pela promoção de:</label>
            <select
              className="admin-input"
              defaultValue=""
              onChange={(e) => e.target.value !== '' && usarPromocaoDoDia(Number(e.target.value))}
            >
              <option value="">— escolha um dia (opcional) —</option>
              {NOMES_DIAS.map((nome, dia) => (
                <option key={dia} value={dia}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-campo-simples">
            <label className="admin-label">Assunto</label>
            <input className="admin-input" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
          </div>

          <div className="admin-campo-simples">
            <label className="admin-label">Mensagem (o link para sair da lista é adicionado automaticamente)</label>
            <textarea
              className="admin-input admin-textarea"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Enviar</h3>

          <div className="admin-campo-simples">
            <label className="admin-label">1. Envie um teste para você primeiro</label>
            <input
              type="email"
              className="admin-input"
              placeholder="seuemail@exemplo.com"
              value={emailTeste}
              onChange={(e) => setEmailTeste(e.target.value)}
            />
          </div>

          <div className="admin-promo-card__rodape">
            <button
              onClick={() => enviar(true)}
              disabled={enviando || !formularioCompleto || !emailTeste.trim()}
              className="admin-botao-secundario"
            >
              Enviar teste
            </button>
            <button
              onClick={() => enviar(false)}
              disabled={enviando || !formularioCompleto || !status?.totalDestinatarios}
              className="admin-botao-avancar"
            >
              {enviando ? 'Enviando...' : '2. Enviar para todos'}
            </button>
            {resultado && <span className="admin-mensagem-status">{resultado}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
