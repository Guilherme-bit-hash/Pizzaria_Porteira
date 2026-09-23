// Catálogo de preços do cardápio, espelhando o objeto `cardapio` hardcoded dentro de
// PORTEIRA-SITE/src/Pages/Cardapio.tsx (é ESSE arquivo que a página realmente renderiza e
// usa para adicionar itens ao carrinho — PORTEIRA-SITE/src/Data/Cardapio.ts não é importado
// em lugar nenhum e não reflete o que é vendido de verdade). Ao mudar nome/preço de um item
// em Cardapio.tsx, atualize aqui também.
// Usado para revalidar o preço de cada item de pedido no servidor, já que o preço enviado
// pelo cliente nunca pode ser considerado confiável.
export const PRECOS_CARDAPIO = new Map(Object.entries({
  'Mussarela': 32.9,
  'Portuguesa': 39.9,
  'Calabresa': 34.9,
  'Frango com Catupiry': 42.9,
  'Margherita': 35.9,
  '4 Queijos': 44.9,

  'Clássico': 26.9,
  'Porteira': 29.9,
  'Double Bacon': 34.9,
  'Vegetariano': 28.9,

  'Refrigerante lata': 6,
  'Suco natural': 8,
  'Água mineral': 4,
  'Cerveja artesanal': 12,

  'Pudim': 12,
  'Mousse de chocolate': 10,
  'Brownie com sorvete': 16,
  'Cheesecake': 14,
}))
