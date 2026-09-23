# 🍕 Pizzaria Porteira — API

Backend em **Node.js + Express + MySQL** responsável por registrar os pedidos feitos no site, processar pagamentos PIX e alimentar o painel administrativo.

## Pré-requisitos

- Node.js 18+
- MySQL 8+ rodando localmente (ou acessível pela rede)

## Configuração

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de variáveis de ambiente e preencha com os dados do seu MySQL:
   ```bash
   cp .env.example .env
   ```
3. Gere o hash da senha do admin do painel:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"
   ```
   Cole o resultado em `ADMIN_PASSWORD_HASH` no `.env`, e defina `ADMIN_USER` com o usuário desejado.
4. Gere um `JWT_SECRET` aleatório (qualquer string longa e aleatória) e coloque no `.env`.
5. (Opcional, mas necessário para o pagamento por PIX) Crie uma conta em [mercadopago.com.br](https://www.mercadopago.com.br) → **Seu negócio → Credenciais** → copie o **Access Token** (comece com o de teste, prefixo `TEST-`) e coloque em `MP_ACCESS_TOKEN` no `.env`. Sem isso, o botão de PIX no site mostra um erro amigável e o cliente ainda consegue finalizar pelo WhatsApp normalmente.
6. Crie o banco e as tabelas:
   ```bash
   npm run db:migrate
   ```
   Esse comando é seguro de rodar de novo a qualquer momento (usa `IF NOT EXISTS` / `INSERT IGNORE`) — inclusive depois de atualizações que adicionam colunas novas, como as de pagamento PIX.

## Rodando localmente

```bash
npm run dev
```

A API sobe em `http://localhost:3001` (ou na porta definida em `PORT`).

## Endpoints

| Método | Rota                                    | Autenticação          | Descrição |
|--------|------------------------------------------|------------------------|-----------|
| GET    | `/api/health`                            | -                       | Healthcheck |
| POST   | `/api/auth/login`                        | -                       | Login do admin, retorna um token JWT |
| POST   | `/api/pedidos`                           | -                       | Cria um novo pedido (usado pelo checkout do site) |
| GET    | `/api/pedidos/cupom-primeira-compra/elegivel` | -                  | Verifica se um telefone ainda tem direito ao cupom de primeira compra |
| POST   | `/api/pedidos/:id/pagamento/pix`         | -                       | Gera a cobrança PIX (QR code) para um pedido já criado |
| GET    | `/api/pedidos/:id/pagamento/status`      | -                       | Consulta o status atual do pagamento (usado pelo polling no checkout) |
| GET    | `/api/pedidos`                           | Admin (Bearer token)    | Lista todos os pedidos |
| GET    | `/api/pedidos/:id`                       | Admin (Bearer token)    | Detalha um pedido |
| PATCH  | `/api/pedidos/:id/status`                | Admin (Bearer token)    | Atualiza o status do pedido (`recebido`, `preparando`, `saiu_para_entrega`, `entregue`, `cancelado`) |
| GET    | `/api/promocoes`                         | -                       | Lista as promoções da semana |
| PUT    | `/api/promocoes/:dia`                    | Admin (Bearer token)    | Cria/atualiza a promoção de um dia da semana (0 = domingo … 6 = sábado) |
| GET    | `/api/produtos`                          | -                       | Cardápio público (só produtos ativos) |
| GET    | `/api/produtos/admin`                    | Admin (Bearer token)    | Lista todos os produtos, inclusive desativados |
| POST   | `/api/produtos`                          | Admin (Bearer token)    | Cria um produto |
| PUT    | `/api/produtos/:id`                      | Admin (Bearer token)    | Edita um produto (nome, preço, categoria, imagem, ativo, ordem) |
| DELETE | `/api/produtos/:id`                      | Admin (Bearer token)    | Exclui um produto |
| GET    | `/api/clientes?busca=&promocoes=1`       | Admin (Bearer token)    | Lista clientes com total de pedidos/gasto; filtra por busca e por consentimento |
| GET    | `/api/clientes/exportar`                 | Admin (Bearer token)    | Baixa a base de clientes em CSV |
| GET    | `/api/clientes/:id`                      | Admin (Bearer token)    | Detalha um cliente com o histórico de pedidos |
| PATCH  | `/api/clientes/:id/consentimento`        | Admin (Bearer token)    | Registra/remove o consentimento para receber promoções |
| GET    | `/api/campanhas/status`                  | Admin (Bearer token)    | Informa se o SMTP está configurado e quantos clientes receberiam a campanha |
| POST   | `/api/campanhas/email`                   | Admin (Bearer token)    | Envia promoção por e-mail (`emailTeste` envia só para um endereço de teste) |
| GET    | `/api/campanhas/descadastrar?id=&token=` | - (token HMAC)          | Link de descadastro incluído em cada e-mail |
| POST   | `/api/pagamentos/webhook`                | -                       | Recebe as notificações de pagamento do Mercado Pago (só útil com o servidor acessível publicamente — veja abaixo) |

Para rotas protegidas, envie o header `Authorization: Bearer <token>` obtido no login.

## Pagamento PIX (Mercado Pago)

- O checkout do site chama `POST /api/pedidos/:id/pagamento/pix`, que cria a cobrança no Mercado Pago e devolve o QR code.
- O status do pagamento é confirmado de duas formas:
  - **Polling** (`GET /api/pedidos/:id/pagamento/status`): o próprio checkout consulta a cada poucos segundos — funciona em qualquer ambiente, inclusive localhost.
  - **Webhook** (`POST /api/pagamentos/webhook`): o Mercado Pago chama esse endpoint quando o pagamento muda de status — mais rápido, mas só funciona se o servidor estiver acessível publicamente (configure `MP_NOTIFICATION_URL` no `.env` ao fazer deploy).
- Em desenvolvimento local (sem URL pública), o polling já é suficiente para testar o fluxo completo.

## Campanhas por e-mail

- Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e `PUBLIC_API_URL` no `.env` (com Gmail, use uma "senha de app"). Sem isso o servidor sobe normalmente e só o envio fica indisponível.
- No painel, em **📧 Campanhas**, envie primeiro um teste para você e depois para todos.
- Só recebem clientes que marcaram o consentimento no checkout e têm e-mail. Todo e-mail leva um link de descadastro.
- WhatsApp em massa não está incluído: exige a API oficial do WhatsApp Business (paga, com modelos aprovados).

## O que ainda falta / próximos passos

- Deploy em produção (hoje pensado para rodar localmente)
- Trocar o `MP_ACCESS_TOKEN` de teste pelo de produção quando for cobrar de verdade
