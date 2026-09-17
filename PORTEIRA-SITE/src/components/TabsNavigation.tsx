import { useState } from 'react'
import '../styles/tabsNavigation.css'

type TabType = 'pizzas' | 'hamburgueres' | 'bebidas' | 'sobremesas' | 'promocoes'

interface Tab {
  id: TabType
  label: string
  icon: string
}

interface TabsNavigationProps {
  tabs: Tab[]
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function TabsNavigation({ tabs, activeTab, onTabChange }: TabsNavigationProps) {
  const [showAllTabs, setShowAllTabs] = useState(false)
  void showAllTabs

  const renderTabs = (tabsToShow: Tab[]) => (
    <>
      {tabsToShow.map((aba) => (
        <button
          key={aba.id}
          onClick={() => {
            onTabChange(aba.id)
            setShowAllTabs(false)
          }}
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
