// src/components/Sidebar.tsx
import '../styles/sidebar.css'

type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

interface Tab {
  id: TabType
  label: string
  icon: string
}

interface SidebarProps {
  tabs: Tab[]
  abaAtiva: TabType
  onTabChange: (tab: TabType) => void
  isOpen: boolean
  onClose: () => void
}

// Menu lateral mobile com as categorias do cardápio — aberto pelo MenuButton,
// substitui a TabsNavigation (que fica escondida em telas estreitas).
export default function Sidebar({ tabs, abaAtiva, onTabChange, isOpen, onClose }: SidebarProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <aside className="sidebar">
        <div className="sidebar__topo">
          <span className="sidebar__titulo">Categorias</span>
          <button onClick={onClose} aria-label="Fechar menu" className="sidebar__fechar">
            ✕
          </button>
        </div>

        <nav className="sidebar__lista">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id)
                onClose()
              }}
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
