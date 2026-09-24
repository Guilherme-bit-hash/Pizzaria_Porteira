// =====================================================================================
// services/cache.js — cache em memória com prazo de validade (TTL).
//
// Usado nas rotas públicas de leitura (cardápio e promoções): milhares de visitas veem a
// mesma lista, então em vez de consultar o MySQL a cada visita, a resposta fica guardada por
// alguns segundos. Quando o admin edita algo, a rota chama limpar() e a próxima visita já
// busca o dado novo — o cache nunca mostra um cardápio desatualizado depois de uma edição.
// Vale por processo (uma instância só do servidor); reiniciar o servidor esvazia o cache.
// =====================================================================================
export function criarCache(ttlMs) {
  let valor
  let expiraEm = 0
  // Carga em andamento: se várias visitas chegam com o cache vazio, todas esperam a mesma
  // consulta em vez de cada uma disparar a sua no banco.
  let emAndamento = null
  // Sobe a cada limpar(); uma carga iniciada antes de uma limpeza não pode gravar o valor velho.
  let versao = 0

  return {
    // Devolve o valor guardado ou, se venceu/está vazio, chama `carregar()` e guarda o resultado.
    async obter(carregar) {
      if (Date.now() < expiraEm) return valor
      if (emAndamento) return emAndamento

      const versaoDaCarga = versao
      emAndamento = carregar()
        .then((resultado) => {
          if (versaoDaCarga === versao) {
            valor = resultado
            expiraEm = Date.now() + ttlMs
          }
          return resultado
        })
        .finally(() => {
          emAndamento = null
        })
      return emAndamento
    },

    // Invalida o cache (chamar depois de qualquer criação/edição/exclusão).
    limpar() {
      versao += 1
      expiraEm = 0
    },
  }
}
