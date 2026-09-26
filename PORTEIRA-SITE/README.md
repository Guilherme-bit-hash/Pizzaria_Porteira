# 🍕 Pizzaria Porteira — Site

Front-end do site da Pizzaria Porteira: cardápio, carrinho de compras, checkout com pagamento por WhatsApp ou PIX, e painel administrativo de pedidos e promoções.

Feito com **React + TypeScript + Vite**.

## Funcionalidades

- Landing page com frases de efeito: dá para "abrir a porteira" deslizando/arrastando para cima, girando o mouse, com a seta para baixo ou pelo botão "Ver Cardápio". A porteira de madeira sobe cobrindo a tela e continua subindo no cardápio (`src/components/PorteiraTransicao.tsx`; respeita "reduzir movimento")
- Cardápio editável pelo painel admin, em abas (pizzas, hambúrgueres, bebidas, sobremesas) e menu lateral no celular (`src/Pages/Cardapio.tsx`); começa a carregar já na landing page
- Layout responsivo em qualquer tela, inclusive iPhone (área do entalhe, `100dvh`)
- Carrinho de compras persistido no navegador (`localStorage`) — não se perde ao recarregar a página
- Checkout em etapas (carrinho → dados de entrega → pagamento) que registra o pedido no [backend](../backend)
  - **WhatsApp**: finaliza o pedido combinando o pagamento por mensagem, como antes
  - **PIX**: gera um QR code na hora via Mercado Pago; o checkout acompanha a confirmação automaticamente
- **Encomenda programada**: no carrinho, aba "Encomenda programada" com data e hora (60 min a 30 dias de antecedência), paga por PIX (valor total ou sinal de 50%)
- Cupom de 10% OFF na primeira compra (`BEMVINDO10`), validado pelo backend por telefone
- Promoção do dia, com dados vindos do backend (editáveis pelo painel admin) e fallback local se a API estiver fora do ar; envio por email (Formspree) ou WhatsApp
- Painel administrativo (`/admin`):
  - `/admin/dashboard`: métricas do dia e botão de abrir/fechar a loja
  - `/admin/pedidos`: acompanha e atualiza o status dos pedidos, o pagamento PIX e as encomendas; toca um aviso sonoro a cada pedido novo
  - `/admin/promocoes`, `/admin/produtos`, `/admin/clientes`, `/admin/campanhas`: promoções, cardápio, base de clientes e campanhas por e-mail

## Pré-requisitos

- Node.js 18+
- O [backend da API](../backend) rodando (necessário para salvar pedidos, pagamento PIX e usar o painel admin)

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
   - `VITE_WHATSAPP_NUMBER`: número de WhatsApp da pizzaria, formato internacional sem símbolos (ex: `5511999999999`). Usado em `src/config/whatsapp.ts`, de onde é importado por todo o app.
3. Configure o Formspree para o envio de promoções por email (veja [CONFIG_EMAIL.md](./CONFIG_EMAIL.md)) — atualmente usa um valor de exemplo em `src/services/emailService.ts` (`FORMSPREE_ID`).
4. Para o pagamento PIX funcionar, configure `MP_ACCESS_TOKEN` no [backend](../backend) (veja o README de lá). Sem isso, a opção de PIX no checkout mostra um erro amigável e o cliente ainda consegue finalizar pelo WhatsApp normalmente.

## Rodando localmente

```bash
npm run dev
```

Acesse `http://localhost:5273`.

## Build de produção

```bash
npm run build
npm run preview
```

## Painel administrativo

Acesse `/admin`, faça login com o usuário/senha configurados no backend (`ADMIN_USER` / `ADMIN_PASSWORD_HASH`).

- **Pedidos** (`/admin/pedidos`): avança o status do pedido (recebido → preparando → saiu para entrega → entregue), cancela, e mostra se o pagamento foi por WhatsApp ou PIX (e, no caso do PIX, se já foi pago).
- **Promoções** (`/admin/promocoes`): edita nome, descrição, preço, cor e mensagens de cada promoção do dia.

## Estrutura

```
src/
  Pages/         # Páginas (Home, Cardápio, Pedido, Admin)
  components/    # Componentes reutilizáveis (Navbar, Toast, botões flutuantes etc.)
  config/        # Configuração compartilhada (ex: número de WhatsApp)
  contexts/      # Estado global do carrinho
  hooks/         # Hooks customizados (ex: promoção do dia)
  utils/         # Funções de apoio (ex.: som de pedido novo, imagem dos produtos)
  services/      # Integração com a API do backend (pedidos, pagamento, promoções), email e WhatsApp
  styles/        # Estilos por página/componente
```

## O que ainda falta / próximos passos

- Configurar o `VITE_WHATSAPP_NUMBER`, o Formspree e o `MP_ACCESS_TOKEN` reais da pizzaria (veja acima e o README do backend)
- Trocar o Access Token de teste do Mercado Pago pelo de produção quando for cobrar de verdade
