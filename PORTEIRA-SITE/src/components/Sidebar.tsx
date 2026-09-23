// src/components/Sidebar.tsx
// ============================================================================
// Sidebar - menu lateral (gaveta) com as categorias do cardápio, para celular.
// Usado em: Pages/Cardapio.tsx.
// Props: tabs, abaAtiva, onTabChange, isOpen, onClose (detalhadas abaixo).
// Estilos: styles/sidebar.css.
// ============================================================================
import '../styles/sidebar.css'

// Categorias possíveis do cardápio.
type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

// Uma categoria exibida na lista.
interface Tab {
  id: TabType
  label: string
  icon: string
}

// Props recebidas do pai (Cardapio).
interface SidebarProps {
  // Lista de categorias a exibir.
  tabs: Tab[]
  // Categoria selecionada no momento (recebe destaque visual).
  abaAtiva: TabType
  // Chamada ao escolher uma categoria.
  onTabChange: (tab: TabType) => void
  // Controla se a gaveta está visível (o estado vive no pai).
  isOpen: boolean
  // Pede ao pai para fechar a gaveta.
  onClose: () => void
}

// Menu lateral mobile com as categorias do cardápio — aberto pelo MenuButton,
// substitui a TabsNavigation (que fica escondida em telas estreitas).
export default function Sidebar({ tabs, abaAtiva, onTabChange, isOpen, onClose }: SidebarProps) {
  // Fechada: não renderiza nada.
  if (!isOpen) return null

  return (
    <>
      {/* Fundo escurecido; clicar nele fecha a gaveta */}
      <div className="sidebar-overlay" onClick={onClose} />
      <aside className="sidebar">
        {/* Cabeçalho com título e botão de fechar */}
        <div className="sidebar__topo">
          <span className="sidebar__titulo">Categorias</span>
          <button onClick={onClose} aria-label="Fechar menu" className="sidebar__fechar">
            ✕
          </button>
        </div>

        {/* Lista de categorias; escolher uma troca a aba e fecha a gaveta */}
        <nav className="sidebar__lista">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id)
                onClose()
              }}
              // Classe por categoria (cor própria) + classe "ativo" na selecionada
              className={`sidebar__item sidebar__item--${tab.id}${tab.id === abaAtiva ? ' sidebar__item--ativo' : ''}`}
            >
              <span className="sidebar__item-icone">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
