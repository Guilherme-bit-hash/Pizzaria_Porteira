// src/Pages/AdminCampanhas.tsx
// Painel de CAMPANHAS POR E-MAIL do administrador, servido na rota "/admin/campanhas" (definida em App.tsx).
// Permite escrever (ou puxar de uma promoção do dia) um e-mail e enviá-lo para os clientes que aceitaram
// promoções. Há um envio de teste para o próprio admin antes do envio em massa.
// Backend: GET /api/campanhas/status e POST /api/campanhas/email (services/campanhaService.ts)
// e GET /api/promocoes (services/promocaoService.ts).
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNav from '../components/AdminNav'
import { showToast } from '../components/Toast'
import { getAdminToken, limparAdminToken } from '../services/pedidoService'
import { listarPromocoes, type PromocaoApi } from '../services/promocaoService'
import { enviarCampanhaEmail, obterStatusCampanha, type StatusCampanha } from '../services/campanhaService'
import '../styles/admin.css'

// Nomes dos dias da semana; a posição na lista é o número do dia (0 = domingo).
const NOMES_DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default function AdminCampanhas() {
  const navigate = useNavigate()

  // Estados de dados vindos do backend
  // status: e-mail configurado? quantos destinatários? (null enquanto carrega)
  const [status, setStatus] = useState<StatusCampanha | null>(null)
  // promocoes: usadas para pré-preencher o e-mail
  const [promocoes, setPromocoes] = useState<PromocaoApi[]>([])
  // Estados do formulário
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [emailTeste, setEmailTeste] = useState('')
  // Estados de envio: em andamento e texto do último resultado
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState('')

  // Tratamento comum de erros das chamadas ao backend:
  // token inválido -> volta ao login; qualquer outro erro -> notificação (toast).
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

  // Roda ao abrir a tela: exige login e carrega o status da campanha e as promoções.
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

  // Dispara o envio. paraTeste = true manda só para o e-mail de teste; false manda para todos os destinatários.
  const enviar = async (paraTeste: boolean) => {
    // Envio em massa não pode ser desfeito: pede confirmação antes
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

  // Só libera os botões de envio quando assunto e mensagem estão preenchidos
  const formularioCompleto = assunto.trim() !== '' && mensagem.trim() !== ''

  return (
    <div className="admin-page">
      {/* Cabeçalho com título e menu do admin */}
      <header className="admin-header admin-header--estreito">
        <h1 className="admin-header__titulo">📧 Campanhas por e-mail</h1>
        <AdminNav atual="campanhas" />
      </header>

      <div className="admin-conteudo admin-conteudo--estreito">
        {/* Aviso quando o servidor de e-mail (SMTP) do backend ainda não foi configurado */}
        {status && !status.emailConfigurado && (
          <p className="admin-mensagem-erro">
            O envio de e-mail ainda não está configurado no servidor. Preencha SMTP_HOST, SMTP_USER, SMTP_PASS e
            SMTP_FROM no arquivo .env do backend.
          </p>
        )}

        {/* Cartão: quantos clientes vão receber */}
        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Destinatários</h3>
          <p className="admin-mensagem-neutra">
            {status
              ? `${status.totalDestinatarios} cliente(s) aceitaram receber promoções e têm e-mail cadastrado.`
              : 'Carregando...'}
          </p>
        </div>

        {/* Cartão: edição da mensagem */}
        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Mensagem</h3>

          {/* Atalho opcional: copia o texto de e-mail da promoção do dia escolhido */}
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

          {/* Assunto do e-mail */}
          <div className="admin-campo-simples">
            <label className="admin-label">Assunto</label>
            <input className="admin-input" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
          </div>

          {/* Corpo do e-mail */}
          <div className="admin-campo-simples">
            <label className="admin-label">Mensagem (o link para sair da lista é adicionado automaticamente)</label>
            <textarea
              className="admin-input admin-textarea"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>
        </div>

        {/* Cartão: envio (primeiro o teste, depois o envio para todos) */}
        <div className="admin-promo-card">
          <h3 className="admin-promo-card__titulo">Enviar</h3>

          {/* E-mail que receberá o teste */}
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

          {/* Botões de envio e resultado */}
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
