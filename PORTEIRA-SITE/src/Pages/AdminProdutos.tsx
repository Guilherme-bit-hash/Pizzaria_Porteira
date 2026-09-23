// src/Pages/AdminProdutos.tsx
// Painel de CARDÁPIO (produtos) do administrador, servido na rota "/admin/produtos" (definida em App.tsx).
// Permite criar, editar, esconder (desativar) e excluir pizzas, hambúrgueres, bebidas e sobremesas.
// O cardápio público (Pages/Cardapio.tsx) mostra o que for salvo aqui.
// Backend: /api/produtos/* (via services/produtoService.ts), com token de admin.
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

// Categorias do cardápio: id usado no banco e rótulo mostrado na tela (também define a ordem das seções).
const CATEGORIAS: { id: CategoriaProduto; rotulo: string }[] = [
  { id: 'pizza', rotulo: '🍕 Pizzas' },
  { id: 'hamburguer', rotulo: '🍔 Hambúrgueres' },
  { id: 'bebida', rotulo: '🥤 Bebidas' },
  { id: 'sobremesa', rotulo: '🍰 Sobremesas' },
]

// Valores iniciais do formulário de "Novo produto".
const PRODUTO_VAZIO: DadosProduto = {
  categoria: 'pizza',
  nome: '',
  descricao: '',
  preco: 0,
  imagemUrl: null,
  ativo: true,
  ordem: 0,
}

// Props (parâmetros) do componente FormularioProduto.
interface FormularioProps {
  // Dados com que o formulário começa
  inicial: DadosProduto
  // Se informado, o formulário edita esse produto; se ausente, cria um novo
  produtoId?: number
  // Chamado após salvar/excluir, para a tela pai recarregar a lista
  onSalvo: () => void
  // Chamado quando o token de admin é rejeitado (a tela pai volta ao login)
  onErroToken: () => void
}

// Formulário de um produto: serve tanto para criar (sem produtoId) quanto para editar.
function FormularioProduto({ inicial, produtoId, onSalvo, onErroToken }: FormularioProps) {
  // Estado: campos do formulário e se está salvando (desativa o botão)
  const [dados, setDados] = useState<DadosProduto>(inicial)
  const [salvando, setSalvando] = useState(false)
  // true = editando produto existente; false = criando novo
  const editando = produtoId !== undefined

  // Altera um único campo do formulário mantendo os demais
  const alterar = <K extends keyof DadosProduto>(campo: K, valor: DadosProduto[K]) =>
    setDados((atuais) => ({ ...atuais, [campo]: valor }))

  // Erro de token -> avisa o pai (volta ao login); outros erros -> toast
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

  // Botão "Salvar"/"Adicionar": atualiza o produto (PUT) ou cria um novo (POST).
  const handleSalvar = async () => {
    setSalvando(true)
    try {
      // Link de imagem vazio vira null (o cardápio usa a imagem padrão)
      const paraEnviar = { ...dados, imagemUrl: dados.imagemUrl?.trim() || null }
      if (editando) {
        await atualizarProduto(produtoId, paraEnviar)
      } else {
        await criarProduto(paraEnviar)
        // Limpa o formulário de "novo produto" para cadastrar o próximo
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

  // Botão "Excluir": pede confirmação e remove o produto do banco.
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

      {/* Campos curtos: nome, categoria, preço e ordem de exibição */}
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

      {/* Descrição / ingredientes mostrados no cardápio */}
      <div className="admin-campo-simples">
        <label className="admin-label">Descrição / ingredientes</label>
        <input
          className="admin-input"
          value={dados.descricao}
          onChange={(e) => alterar('descricao', e.target.value)}
        />
      </div>

      {/* Imagem do produto (opcional) */}
      <div className="admin-campo-simples">
        <label className="admin-label">Link da imagem (opcional — sem link, usa uma imagem padrão)</label>
        <input
          className="admin-input"
          placeholder="https://..."
          value={dados.imagemUrl ?? ''}
          onChange={(e) => alterar('imagemUrl', e.target.value)}
        />
      </div>

      {/* Ativo/inativo: produto inativo some do cardápio público sem ser excluído */}
      <div className="admin-checkbox-campo">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={dados.ativo} onChange={(e) => alterar('ativo', e.target.checked)} />
          Disponível no cardápio (desmarque para esconder sem excluir)
        </label>
      </div>

      {/* Botões: salvar/adicionar e (só na edição) excluir */}
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

// Página: monta o formulário de novo produto e a lista de produtos agrupada por categoria.
export default function AdminProdutos() {
  const navigate = useNavigate()
  // Estados: todos os produtos (inclusive inativos), carregamento e erro
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Token rejeitado: apaga-o e volta ao login
  const sairPorToken = useCallback(() => {
    limparAdminToken()
    navigate('/admin')
  }, [navigate])

  // Busca todos os produtos (inclusive inativos) no backend.
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

  // Roda ao abrir a tela: exige login e carrega os produtos.
  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin')
      return
    }
    carregar()
  }, [navigate, carregar])

  return (
    <div className="admin-page">
      {/* Cabeçalho com título e menu do admin */}
      <header className="admin-header admin-header--estreito">
        <h1 className="admin-header__titulo">🍕 Cardápio</h1>
        <AdminNav atual="produtos" />
      </header>

      <div className="admin-conteudo admin-conteudo--estreito">
        {/* Mensagens de estado: erro e carregando */}
        {erro && <p className="admin-mensagem-erro">{erro}</p>}
        {carregando && <p className="admin-mensagem-neutra">Carregando cardápio...</p>}

        {!carregando && (
          <>
            {/* Formulário para cadastrar um produto novo */}
            <FormularioProduto inicial={PRODUTO_VAZIO} onSalvo={carregar} onErroToken={sairPorToken} />

            {/* Uma seção por categoria, cada produto com seu formulário de edição */}
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
                  {/* A key muda quando o produto muda, forçando o formulário a reiniciar com os dados novos */}
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
