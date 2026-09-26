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
   Esse comando é seguro de rodar de novo a qualquer momento — inclusive depois de atualizações que adicionam colunas novas (PIX, encomendas). **Rode-o sempre que atualizar o código**: pedidos e outras rotas falham se o banco estiver sem as colunas novas.
   Ele também converte tabelas antigas para `utf8mb4` (necessário para emojis e caracteres especiais; bancos hospedados costumam vir em `utf8` de 3 bytes) e repara promoções que perderam o emoji por causa disso.

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
| POST   | `/api/pedidos`                           | -                       | Cria um novo pedido (usado pelo checkout do site); recusa com 403 se a loja estiver fechada, exceto encomendas (`agendadoPara`, `pagarSinal`) |
| GET    | `/api/pedidos/cupom-primeira-compra/elegivel` | -                  | Verifica se um telefone ainda tem direito ao cupom de primeira compra |
| POST   | `/api/pedidos/:id/pagamento/pix`         | -                       | Gera a cobrança PIX (QR code) para um pedido já criado |
| GET    | `/api/pedidos/:id/pagamento/status`      | -                       | Consulta o status atual do pagamento (usado pelo polling no checkout) |
| GET    | `/api/pedidos/metricas/hoje`             | Admin (Bearer token)    | Números do dia para o dashboard: pedidos, faturamento, ticket médio e contagem por status |
| GET    | `/api/pedidos`                           | Admin (Bearer token)    | Lista todos os pedidos |
| GET    | `/api/pedidos/:id`                       | Admin (Bearer token)    | Detalha um pedido |
| PATCH  | `/api/pedidos/:id/status`                | Admin (Bearer token)    | Atualiza o status do pedido (`recebido`, `preparando`, `saiu_para_entrega`, `entregue`, `cancelado`) |
| GET    | `/api/loja/status`                       | -                       | Diz se a loja está aceitando pedidos novos |
| PUT    | `/api/loja/status`                       | Admin (Bearer token)    | Abre/fecha a loja (`{ "aberta": true \| false }`) |
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

## Encomendas programadas

- No carrinho o cliente escolhe **Pedir agora** ou **Encomenda programada** (data e hora). O site envia `agendadoPara` (ISO) e, opcionalmente, `pagarSinal: true`.
- Regras validadas no servidor: antecedência mínima de 60 minutos e máxima de 30 dias; data inválida é recusada com 400.
- Com `pagarSinal`, o sinal é **50% do total** (calculado no servidor) e é o valor cobrado no PIX; o restante é pago na entrega. Fica em `pedidos.sinal`; a data em `pedidos.agendado_para`.
- Encomendas são aceitas mesmo com a loja fechada. O painel admin mostra a data e o sinal de cada uma.

## Desempenho e resiliência

- **Cache em memória** (60 s) do cardápio, das promoções e dos preços usados para conferir pedidos, e (5 s) do status da loja. Toda edição feita no painel limpa o cache na hora, então o cliente nunca vê um preço velho.
- **Pool de conexões** configurável (`DB_CONNECTION_LIMIT`) e fila limitada (`DB_QUEUE_LIMIT`): sobrecarga responde `503` em vez de deixar o cliente pendurado.
- **Limites de requisição** por cliente (login, criar pedido, cupom). Atrás de proxy (Render), `TRUST_PROXY=1` faz cada cliente contar separado.
- Cabeçalhos de segurança com `helmet`.

## Produção (Render + Clever Cloud)

1. MySQL (ex.: Clever Cloud DEV, grátis): rode `npm run db:migrate` apontando para ele (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` como variáveis de ambiente) **a cada atualização do código**.
2. Web Service no Render com **Root Directory** `backend`, build `npm install`, start `npm start` e as variáveis do `.env.example`. Obrigatórias: `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `CORS_ORIGIN` (URL do site) e as `DB_*`; use `DB_CONNECTION_LIMIT=3` no plano gratuito do Clever Cloud.
3. **Troque a senha de teste do admin** antes de divulgar o site: gere o hash com `node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"` e coloque em `ADMIN_PASSWORD_HASH`.
4. Plano gratuito do Render "dorme" após ~15 min sem uso; um monitor (ex.: UptimeRobot em `/api/health` a cada 5 min) evita a demora da primeira visita.

## Dashboard e loja aberta/fechada

- O painel admin abre agora em **📊 Painel** (`/admin/dashboard`), com o botão de abrir/fechar a loja e o resumo do dia.
- Com a loja fechada, `POST /api/pedidos` responde 403 — o site mostra um aviso e desabilita os botões de finalizar, mas quem garante de verdade é o backend.
- O painel de Pedidos também toca um bipe e mostra uma notificação quando um pedido novo chega (detectado no polling de 15s).

## O que ainda falta / próximos passos

- Trocar o `MP_ACCESS_TOKEN` de teste pelo de produção quando for cobrar de verdade
