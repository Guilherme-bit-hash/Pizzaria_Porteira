// ============================================================================
// TabsNavigation - abas de categorias do cardápio (Pizzas, Hambúrgueres, ...).
// Usado em: Pages/Cardapio.tsx (em telas estreitas a Sidebar faz esse papel).
// Props: tabs, activeTab, onTabChange (detalhadas abaixo).
// Estilos: styles/tabsNavigation.css.
// ============================================================================
import { useState } from 'react'
import '../styles/tabsNavigation.css'

// Categorias possíveis do cardápio.
type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

// Uma aba exibida na barra.
interface Tab {
  id: TabType
  label: string
  icon: string
}

// Props recebidas do pai (Cardapio).
interface TabsNavigationProps {
  // Lista de abas a desenhar.
  tabs: Tab[]
  // Aba atualmente selecionada.
  activeTab: TabType
  // Chamada quando o cliente clica em outra aba.
  onTabChange: (tab: TabType) => void
}

export default function TabsNavigation({ tabs, activeTab, onTabChange }: TabsNavigationProps) {
  // useState: memória do componente. `showAllTabs` hoje não altera a tela
  // (o `void` abaixo só evita o aviso de variável não usada).
  const [showAllTabs, setShowAllTabs] = useState(false)
  void showAllTabs

  // Função auxiliar que desenha um botão para cada aba recebida.
  const renderTabs = (tabsToShow: Tab[]) => (
    <>
      {tabsToShow.map((aba) => (
        <button
          key={aba.id}
          // Ao clicar: avisa o pai da nova aba e reseta o estado local
          onClick={() => {
            onTabChange(aba.id)
            setShowAllTabs(false)
          }}
          // Classe por categoria (cor própria) + "ativa" na aba selecionada
          className={`tab-button tab-button--${aba.id}${activeTab === aba.id ? ' tab-button--ativa' : ''}`}
        >
          <span className="tab-button__icone">{aba.icon}</span>
          <span className="tab-label">{aba.label}</span>
        </button>
      ))}
    </>
  )

  return (
    <div className="tabs-navigation">
      {/* CONTAINER PRINCIPAL COM SCROLL HORIZONTAL EM MOBILE */}
      <div className="tabs-scroll-container">
        {renderTabs(tabs)}
      </div>

      {/* INDICADOR DE SCROLL (MOBILE) */}
      <div className="scroll-hint">
        ← Deslize para ver mais →
      </div>
    </div>
  )
}
