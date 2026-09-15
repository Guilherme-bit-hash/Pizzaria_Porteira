# 🍕 Pizzaria Porteira — Site

Front-end do site da Pizzaria Porteira: cardápio, carrinho de compras, checkout via WhatsApp e painel administrativo de pedidos.

Feito com **React + TypeScript + Vite**.

## Funcionalidades

- Cardápio de pizzas, hambúrgueres, combos, bebidas e sobremesas (`src/Data/Cardapio.ts`)
- Carrinho de compras persistido no navegador (`localStorage`) — não se perde ao recarregar a página
- Checkout em duas etapas (carrinho → dados de entrega) que registra o pedido no [backend](../backend) e finaliza via WhatsApp
- Toast de promoção do dia, com envio por email (Formspree) ou WhatsApp
- Painel administrativo (`/admin`) para acompanhar e atualizar o status dos pedidos em tempo real

## Pré-requisitos

- Node.js 18+
- O [backend da API](../backend) rodando (necessário para salvar pedidos e usar o painel admin)

## Configuração

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de variáveis de ambiente e ajuste se necessário:
   ```bash
   cp .env.example .env
   ```
   - `VITE_API_URL`: URL da API do backend (padrão `http://localhost:3001/api`)
3. Configure o número de WhatsApp da pizzaria e o Formspree (veja [CONFIG_EMAIL.md](./CONFIG_EMAIL.md)) — atualmente usam valores de exemplo em:
   - `src/Pages/Pedido.tsx`
   - `src/components/WhatsaapFlutuante.tsx`
   - `src/components/Toast.tsx`
   - `src/services/emailService.ts`

## Rodando localmente

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## Painel administrativo

Acesse `/admin`, faça login com o usuário/senha configurados no backend (`ADMIN_USER` / `ADMIN_PASSWORD_HASH`) e acompanhe os pedidos em `/admin/pedidos`. É possível avançar o status do pedido (recebido → preparando → saiu para entrega → entregue) ou cancelá-lo.

## Estrutura

```
src/
  Data/         # Dados do cardápio
  Pages/        # Páginas (Home, Cardápio, Pedido, Admin)
  components/   # Componentes reutilizáveis (Navbar, Toast, carrinho flutuante etc.)
  contexts/      # Estado global do carrinho
  hooks/         # Hooks customizados (ex: promoção do dia)
  services/      # Integração com a API do backend, email e WhatsApp
  styles/        # Estilos globais
```

## O que ainda falta / próximos passos

- Pagamento online (hoje o pagamento é combinado manualmente pelo WhatsApp)
- Configurar o número de WhatsApp e o Formspree reais da pizzaria (veja acima)
