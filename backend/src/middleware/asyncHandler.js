// =====================================================================================
// middleware/asyncHandler.js — utilitário usado por praticamente todas as rotas em routes/*.js.
//
// O Express 4 não captura sozinho erros de funções async (promessas rejeitadas). Este
// wrapper (embrulho) executa o handler e, se ele falhar, repassa o erro a next(), que o
// leva ao tratador global de erros definido em server.js (resposta 500). Sem isso, um
// erro de banco poderia deixar a requisição pendurada sem resposta.
// =====================================================================================
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
