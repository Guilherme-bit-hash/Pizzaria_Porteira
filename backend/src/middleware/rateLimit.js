import rateLimit from 'express-rate-limit'

// Login do admin: poucas tentativas por IP, para dificultar brute-force da senha.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
})

// Criação de pedidos: limite generoso (um cliente real não faz dezenas de pedidos em
// 15 minutos), só para impedir flood automatizado poluindo o banco.
export const criarPedidoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitos pedidos em pouco tempo. Tente novamente em alguns minutos.' },
})

// Checagem de elegibilidade do cupom (GET, sem autenticação, usada durante o checkout) diz
// se um telefone já fez pedido antes. Sem limite, isso vira um jeito barato de testar em
// massa quais telefones já são clientes. O site só chama esse endpoint algumas vezes por
// checkout (a cada telefone digitado), então um limite baixo não afeta o uso legítimo.
export const elegibilidadeCupomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas verificações em pouco tempo. Tente novamente em alguns minutos.' },
})
