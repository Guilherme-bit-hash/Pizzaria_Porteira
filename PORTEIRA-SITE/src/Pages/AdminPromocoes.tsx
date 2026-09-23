import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminToken, limparAdminToken } from '../services/pedidoService'
import { atualizarPromocao, listarPromocoes, type DadosPromocao } from '../services/promocaoService'
import { promocoesPadrao, type Promocao } from '../hooks/usePromocaoDoDia'
import { showToast } from '../components/Toast'
import AdminNav from '../components/AdminNav'
import '../styles/admin.css'

const NOMES_DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

export default function AdminPromocoes() {
  const navigate = useNavigate()
  const [promocoes, setPromocoes] = useState<Record<number, Promocao>>(promocoesPadrao)
  const [carregando, setCarregando] = useState(true)
  const [erroGeral, setErroGeral] = useState('')
  const [salvandoDia, setSalvandoDia] = useState<number | null>(null)
  const [mensagemPorDia, setMensagemPorDia] = useState<Record<number, string>>({})

  const carregarPromocoes = useCallback(async () => {
    setCarregando(true)
    const dados = await listarPromocoes()
    if (!dados) {
      setErroGeral('Não foi possível carregar as promoções do servidor. Mostrando valores padrão.')
    } else {
      setErroGeral('')
      setPromocoes((atuais) => {
        const atualizadas = { ...atuais }
        for (const promocao of dados) {
          atualizadas[promocao.diaSemana] = {
            nome: promocao.nome,
            descricao: promocao.descricao,
            preco: promocao.preco,
            destaque: promocao.destaque,
            cor: promocao.cor,
            whatsappMessage: promocao.whatsappMessage ?? undefined,
            emailSubject: promocao.emailSubject ?? undefined,
            emailBody: promocao.emailBody ?? undefined,
          }
        }
        return atualizadas
      })
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregarPromocoes()
  }, [navigate, carregarPromocoes])

  const handleCampoChange = (dia: number, campo: keyof Promocao, valor: string | number | boolean) => {
    setPromocoes((atuais) => ({
      ...atuais,
      [dia]: { ...atuais[dia], [campo]: valor },
    }))
  }

  const handleSalvar = async (dia: number) => {
    const promocao = promocoes[dia]
    setSalvandoDia(dia)
    setMensagemPorDia((atuais) => ({ ...atuais, [dia]: '' }))

    try {
      const dados: DadosPromocao = {
        nome: promocao.nome,
        descricao: promocao.descricao,
        preco: promocao.preco,
        destaque: promocao.destaque,
        cor: promocao.cor,
        whatsappMessage: promocao.whatsappMessage ?? null,
        emailSubject: promocao.emailSubject ?? null,
        emailBody: promocao.emailBody ?? null,
      }
      await atualizarPromocao(dia, dados)
      setMensagemPorDia((atuais) => ({ ...atuais, [dia]: '✅ Salvo com sucesso!' }))
      showToast({
        message: `Promoção de ${NOMES_DIAS[dia]} salva com sucesso!`,
        type: 'success',
        emoji: '✅',
        duration: 2500,
      })
    } catch (error) {
      if (error instanceof Error && /token/i.test(error.message)) {
        limparAdminToken()
        navigate('/admin')
        return
      }
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao salvar promoção.'
      setMensagemPorDia((atuais) => ({ ...atuais, [dia]: `❌ ${mensagemErro}` }))
      showToast({ message: mensagemErro, type: 'error', emoji: '⚠️' })
    } finally {
      setSalvandoDia(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header admin-header--estreito">
        <h1 className="admin-header__titulo">🎯 Promoções</h1>
        <AdminNav atual="promocoes" />
      </header>

      <div className="admin-conteudo admin-conteudo--estreito">
        {erroGeral && <p className="admin-mensagem-erro">{erroGeral}</p>}

        {carregando && <p className="admin-mensagem-neutra">Carregando promoções...</p>}

        {!carregando && NOMES_DIAS.map((nomeDia, dia) => {
          const promocao = promocoes[dia]
          const mensagem = mensagemPorDia[dia]

          return (
            <div key={dia} className="admin-promo-card">
              <h3 className="admin-promo-card__titulo">{nomeDia}</h3>

              <div className="admin-form-grid">
                <div>
                  <label className="admin-label">Nome da promoção</label>
                  <input
                    className="admin-input"
                    value={promocao.nome}
                    onChange={(e) => handleCampoChange(dia, 'nome', e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label">Preço (R$, 0 = sem preço fixo)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="admin-input"
                    value={promocao.preco}
                    onChange={(e) => handleCampoChange(dia, 'preco', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="admin-label">Cor de destaque</label>
                  <input
                    type="color"
                    className="admin-input admin-color-input"
                    value={promocao.cor}
                    onChange={(e) => handleCampoChange(dia, 'cor', e.target.value)}
                  />
                </div>
                <div className="admin-checkbox-campo">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={promocao.destaque}
                      onChange={(e) => handleCampoChange(dia, 'destaque', e.target.checked)}
                    />
                    Em destaque
                  </label>
                </div>
              </div>

              <div className="admin-campo-simples">
                <label className="admin-label">Descrição</label>
                <input
                  className="admin-input"
                  value={promocao.descricao}
                  onChange={(e) => handleCampoChange(dia, 'descricao', e.target.value)}
                />
              </div>

              <div className="admin-campo-simples">
                <label className="admin-label">Mensagem do WhatsApp</label>
                <textarea
                  className="admin-input admin-textarea"
                  value={promocao.whatsappMessage ?? ''}
                  onChange={(e) => handleCampoChange(dia, 'whatsappMessage', e.target.value)}
                />
              </div>

              <div className="admin-form-grid">
                <div>
                  <label className="admin-label">Assunto do e-mail</label>
                  <input
                    className="admin-input"
                    value={promocao.emailSubject ?? ''}
                    onChange={(e) => handleCampoChange(dia, 'emailSubject', e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-campo-simples admin-campo-simples--final">
                <label className="admin-label">Corpo do e-mail</label>
                <textarea
                  className="admin-input admin-textarea"
                  value={promocao.emailBody ?? ''}
                  onChange={(e) => handleCampoChange(dia, 'emailBody', e.target.value)}
                />
              </div>

              <div className="admin-promo-card__rodape">
                <button
                  onClick={() => handleSalvar(dia)}
                  disabled={salvandoDia === dia}
                  className="admin-botao-avancar"
                >
                  {salvandoDia === dia ? 'Salvando...' : 'Salvar'}
                </button>
                {mensagem && (
                  <span
                    className={`admin-mensagem-status${mensagem.startsWith('❌') ? ' admin-mensagem-status--erro' : ''}`}
                  >
                    {mensagem}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
