// src/App.tsx
// COMPONENTE RAIZ do site. Define a "moldura" da aplicação e a TABELA DE ROTAS:
// qual página (src/Pages) aparece para cada URL do navegador.
// É importado por src/main.tsx. Não fala com o backend diretamente; cada página faz isso via src/services.
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CarrinhoProvider } from './contexts/CarrinhoContexts'
import BotoesFlutuantes from './components/BotoesFlutuantes'
import { ToastContainer } from './components/Toast'
import Navbar from './components/Navbar'
import PromocaoDiaToast from './components/PromocaoDiaToast'
import PrimeiraCompraToast from './components/PrimeiraCompraToast'
import Home from './Pages/Home'
import Cardapio from './Pages/Cardapio'
import Pedido from './Pages/Pedido'
import AdminLogin from './Pages/AdminLogin'
import AdminDashboard from './Pages/AdminDashboard'
import AdminPedidos from './Pages/AdminPedidos'
import AdminPromocoes from './Pages/AdminPromocoes'
import AdminProdutos from './Pages/AdminProdutos'
import AdminClientes from './Pages/AdminClientes'
import AdminCampanhas from './Pages/AdminCampanhas'
import { WHATSAPP_NUMBER, formatarWhatsApp } from './config/whatsapp'

// Importação de estilos globais do app
import './styles/App.css'

// Componente App: tudo que o usuário vê nasce daqui.
// Um "componente" React é uma função que devolve JSX (HTML escrito dentro do TypeScript).
function App() {
  return (
    // CarrinhoProvider: "context" do React. Deixa o carrinho de compras disponível
    // para qualquer componente filho (Cardapio, Pedido, Navbar...) sem passar props manualmente.
    <CarrinhoProvider>
      {/* BrowserRouter: habilita a navegação por URL (react-router) sem recarregar a página */}
      <BrowserRouter>
        {/* Toast Container: área onde aparecem as notificações (showToast) de qualquer lugar */}
        <ToastContainer />

        {/* Todos componentes dentro da estrutura principal */}
        <div className="app-container">
          {/* Routes/Route: a tabela de rotas. Só a rota que combina com a URL atual é renderizada */}
          <Routes>
            {/* Rotas públicas (clientes) */}
            <Route path="/" element={<Home />} />
            <Route path="/cardapio" element={<Cardapio />} />
            <Route path="/pedido" element={<Pedido />} />

            {/* Rotas do painel administrativo (exigem token, ver AdminLogin) */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/pedidos" element={<AdminPedidos />} />
            <Route path="/admin/promocoes" element={<AdminPromocoes />} />
            <Route path="/admin/produtos" element={<AdminProdutos />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
            <Route path="/admin/campanhas" element={<AdminCampanhas />} />

            {/* Páginas adicionais: simples e estáticas, por isso ficam definidas aqui mesmo */}
            {/* /promocoes: página de promoções (ainda sem conteúdo dinâmico) */}
            <Route path="/promocoes" element={
              <>
                <Navbar showBackButton={true} backTo="/" />
                <div className="page-container page-container--com-navbar">
                  <h1 className="page-title">🎪 Promoções Exclusivas</h1>
                  <p className="page-subtitle">Aproveite nossas ofertas especiais!</p>
                  {/* Aqui você pode adicionar o BannerPromocoes */}
                </div>
              </>
            } />

            {/* /sobre: texto institucional da pizzaria */}
            <Route path="/sobre" element={
              <>
                <Navbar showBackButton={true} backTo="/" />
                <div className="page-container page-container--com-navbar">
                  <h1 className="page-title">ℹ️ Sobre a Pizzaria Porteira</h1>
                  <div className="sobre-content">
                    <p>
                      Há mais de 15 anos, a <strong>Pizzaria Porteira</strong> traz o melhor
                      da tradição italiana com um toque brasileiro. Nossas pizzas são feitas
                      com ingredientes selecionados e massa preparada artesanalmente todos os dias.
                    </p>
                  </div>
                </div>
              </>
            } />

            {/* /contato: dados de contato; o WhatsApp vem de src/config/whatsapp.ts */}
            <Route path="/contato" element={
              <>
                <Navbar showBackButton={true} backTo="/" />
                <div className="page-container page-container--com-navbar">
                  <h1 className="page-title">📞 Entre em Contato</h1>
                  <div className="contato-info">
                    <p>WhatsApp: {formatarWhatsApp(WHATSAPP_NUMBER)}</p>
                    <p>Telefone: (11) 9999-9998</p>
                    <p>Endereço: Rua das Pizzas, 123 - Centro, São Paulo, SP</p>
                  </div>
                </div>
              </>
            } />
          </Routes>

          {/* Componentes Flutuantes: ficam fora do <Routes>, então aparecem em TODAS as páginas */}
          <BotoesFlutuantes />
          <PromocaoDiaToast />
          <PrimeiraCompraToast />
        </div>
      </BrowserRouter>
    </CarrinhoProvider>
  )
}

export default App
