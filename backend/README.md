# 🍕 Pizzaria Porteira — API

Backend em **Node.js + Express + MySQL** responsável por registrar os pedidos feitos no site e alimentar o painel administrativo.

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
5. Crie o banco e as tabelas:
   ```bash
   npm run db:migrate
   ```

## Rodando localmente

```bash
npm run dev
```

A API sobe em `http://localhost:3001` (ou na porta definida em `PORT`).

## Endpoints

| Método | Rota                     | Autenticação | Descrição                          |
|--------|--------------------------|---------------|-------------------------------------|
| GET    | `/api/health`            | -             | Healthcheck                         |
| POST   | `/api/auth/login`        | -             | Login do admin, retorna um token JWT |
| POST   | `/api/pedidos`           | -             | Cria um novo pedido (usado pelo checkout do site) |
| GET    | `/api/pedidos`           | Admin (Bearer token) | Lista todos os pedidos |
| GET    | `/api/pedidos/:id`       | Admin (Bearer token) | Detalha um pedido |
| PATCH  | `/api/pedidos/:id/status`| Admin (Bearer token) | Atualiza o status do pedido (`recebido`, `preparando`, `saiu_para_entrega`, `entregue`, `cancelado`) |

Para rotas protegidas, envie o header `Authorization: Bearer <token>` obtido no login.

## O que ainda falta / próximos passos

- Pagamento online (hoje o pagamento é combinado manualmente pelo WhatsApp)
- Deploy em produção (hoje pensado para rodar localmente)
