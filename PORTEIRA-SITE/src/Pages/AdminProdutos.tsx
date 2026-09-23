import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNav from '../components/AdminNav'
import { showToast } from '../components/Toast'
import { getAdminToken, limparAdminToken } from '../services/pedidoService'
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
  listarProdutosAdmin,
  type CategoriaProduto,
  type DadosProduto,
  type Produto,
} from '../services/produtoService'
import '../styles/admin.css'

const CATEGORIAS: { id: CategoriaProduto; rotulo: string }[] = [
  { id: 'pizza', rotulo: '🍕 Pizzas' },
  { id: 'hamburguer', rotulo: '🍔 Hambúrgueres' },
  { id: 'bebida', rotulo: '🥤 Bebidas' },
  { id: 'sobremesa', rotulo: '🍰 Sobremesas' },
]

const PRODUTO_VAZIO: DadosProduto = {
  categoria: 'pizza',
  nome: '',
  descricao: '',
  preco: 0,
  imagemUrl: null,
  ativo: true,
  ordem: 0,
}

interface FormularioProps {
  inicial: DadosProduto
  produtoId?: number
  onSalvo: () => void
  onErroToken: () => void
}

// Formulário de um produto: serve tanto para criar (sem produtoId) quanto para editar.
function FormularioProduto({ inicial, produtoId, onSalvo, onErroToken }: FormularioProps) {
  const [dados, setDados] = useState<DadosProduto>(inicial)
  const [salvando, setSalvando] = useState(false)
  const editando = produtoId !== undefined

  const alterar = <K extends keyof DadosProduto>(campo: K, valor: DadosProduto[K]) =>
    setDados((atuais) => ({ ...atuais, [campo]: valor }))

  const tratarErro = (error: unknown, mensagemPadrao: string) => {
    if (error instanceof Error && /token/i.test(error.message)) {
      onErroToken()
      return
    }
    showToast({
      message: error instanceof Error ? error.message : mensagemPadrao,
      type: 'error',
      emoji: '⚠️',
    })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const paraEnviar = { ...dados, imagemUrl: dados.imagemUrl?.trim() || null }
      if (editando) {
        await atualizarProduto(produtoId, paraEnviar)
      } else {
        await criarProduto(paraEnviar)
        setDados(PRODUTO_VAZIO)
      }
      showToast({
        message: editando ? `"${dados.nome}" atualizado!` : `"${dados.nome}" adicionado ao cardápio!`,
        type: 'success',
        emoji: '✅',
        duration: 2500,
      })
      onSalvo()
    } catch (error) {
      tratarErro(error, 'Erro ao salvar produto.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!editando || !window.confirm(`Excluir "${dados.nome}" do cardápio? Isso não pode ser desfeito.`)) return
    try {
      await excluirProduto(produtoId)
      showToast({ message: `"${dados.nome}" excluído.`, type: 'warning', emoji: '🗑️', duration: 2500 })
      onSalvo()
    } catch (error) {
      tratarErro(error, 'Erro ao excluir produto.')
    }
  }

  return (
    <div className="admin-promo-card">
      <h3 className="admin-promo-card__titulo">{editando ? dados.nome || 'Produto' : '➕ Novo produto'}</h3>

      <div className="admin-form-grid">
        <div>
          <label className="admin-label">Nome</label>
          <input className="admin-input" value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} />
        </div>
        <div>
          <label className="admin-label">Categoria</label>
          <select
            className="admin-input"
            value={dados.categoria}
            onChange={(e) => alterar('categoria', e.target.value as CategoriaProduto)}
          >
            {CATEGORIAS.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-label">Preço (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="admin-input"
            value={dados.preco || ''}
            onChange={(e) => alterar('preco', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="admin-label">Ordem na lista (menor aparece primeiro)</label>
          <input
            type="number"
            step="1"
            className="admin-input"
            value={dados.ordem}
            onChange={(e) => alterar('ordem', Math.trunc(Number(e.target.value)) || 0)}
          />
        </div>
      </div>

      <div className="admin-campo-simples">
        <label className="admin-label">Descrição / ingredientes</label>
        <input
          className="admin-input"
          value={dados.descricao}
          onChange={(e) => alterar('descricao', e.target.value)}
        />
      </div>

      <div className="admin-campo-simples">
        <label className="admin-label">Link da imagem (opcional — sem link, usa uma imagem padrão)</label>
        <input
          className="admin-input"
          placeholder="https://..."
          value={dados.imagemUrl ?? ''}
          onChange={(e) => alterar('imagemUrl', e.target.value)}
        />
      </div>

      <div className="admin-checkbox-campo">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={dados.ativo} onChange={(e) => alterar('ativo', e.target.checked)} />
          Disponível no cardápio (desmarque para esconder sem excluir)
        </label>
      </div>

      <div className="admin-promo-card__rodape">
        <button onClick={handleSalvar} disabled={salvando} className="admin-botao-avancar">
          {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Adicionar ao cardápio'}
        </button>
        {editando && (
          <button onClick={handleExcluir} className="admin-botao-cancelar">
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminProdutos() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const sairPorToken = useCallback(() => {
    limparAdminToken()
    navigate('/admin')
  }, [navigate])

  const carregar = useCallback(async () => {
    try {
      setProdutos(await listarProdutosAdmin())
      setErro('')
    } catch (error) {
      if (error instanceof Error && /token/i.test(error.message)) {
        sairPorToken()
        return
      }
      setErro(error instanceof Error ? error.message : 'Erro ao carregar o cardápio.')
    } finally {
      setCarregando(false)
    }
  }, [sairPorToken])

  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregar()
  }, [navigate, carregar])

  return (
    <div className="admin-page">
      <header className="admin-header admin-header--estreito">
        <h1 className="admin-header__titulo">🍕 Cardápio</h1>
        <AdminNav atual="produtos" />
      </header>

      <div className="admin-conteudo admin-conteudo--estreito">
        {erro && <p className="admin-mensagem-erro">{erro}</p>}
        {carregando && <p className="admin-mensagem-neutra">Carregando cardápio...</p>}

        {!carregando && (
          <>
            <FormularioProduto inicial={PRODUTO_VAZIO} onSalvo={carregar} onErroToken={sairPorToken} />

            {CATEGORIAS.map((categoria) => {
              const doGrupo = produtos.filter((produto) => produto.categoria === categoria.id)
              return (
                <section key={categoria.id}>
                  <h2 className="admin-header__titulo">
                    {categoria.rotulo} ({doGrupo.length})
                  </h2>
                  {doGrupo.length === 0 && (
                    <p className="admin-mensagem-neutra">Nenhum produto nesta categoria.</p>
                  )}
                  {doGrupo.map((produto) => (
                    <FormularioProduto
                      key={`${produto.id}-${produto.preco}-${produto.nome}-${produto.ativo}`}
                      inicial={produto}
                      produtoId={produto.id}
                      onSalvo={carregar}
                      onErroToken={sairPorToken}
                    />
                  ))}
                </section>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
