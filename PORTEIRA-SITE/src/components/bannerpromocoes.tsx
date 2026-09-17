// src/components/BannerPromocoes.tsx
import { Link } from 'react-router-dom'; // Importação necessária
import '../styles/bannerPromocoes.css'

export const promocoesDestaque = [
  { id: 1, titulo: '🎁 Primeira Compra', descricao: '10% OFF no seu primeiro pedido', codigo: 'BEMVINDO10' },
  { id: 2, titulo: '📦 Delivery Grátis', descricao: 'Frete grátis acima de R$ 50', codigo: 'FRETEGRATIS' },
  { id: 3, titulo: '🎯 Combo do Dia', descricao: 'Confira nossa promoção especial de hoje!' }
]

export default function BannerPromocoes() {
  const promocoes = promocoesDestaque

  return (
    <div className="banner-promocoes">
      <div className="banner-promocoes__faixa-topo" />

      <h2 className="banner-promocoes__titulo">
        🎪 Promoções Exclusivas
      </h2>

      <div className="banner-promocoes__grid">
        {promocoes.map((promo) => (
          <div key={promo.id} className="banner-promocoes__card">
            <h3 className="banner-promocoes__card-titulo">
              {promo.titulo}
            </h3>
            <p className="banner-promocoes__card-descricao">
              {promo.descricao}
            </p>
            {promo.codigo && (
              <div className="banner-promocoes__codigo">
                Código: {promo.codigo}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="banner-promocoes__rodape">
        <Link to="/cardapio" className="banner-promocoes__botao">
          🍕 Ver Cardápio Completo
        </Link>
      </div>
    </div>
  )
}
