// src/utils/imagemProduto.ts
// Endereço da imagem de um produto: a foto cadastrada no painel admin ou, se não houver,
// uma imagem gerada pelo placehold.co (cor da categoria + nome do produto).
// Usado por Pages/Cardapio.tsx (para exibir) e services/produtoService.ts (para pré-carregar).
import type { CategoriaProduto, Produto } from '../services/produtoService'

// Cor de fundo (hexadecimal, sem #) do placeholder de cada categoria.
const CORES: Record<CategoriaProduto, string> = {
  pizza: 'FF6B35',
  hamburguer: '8B4513',
  bebida: '4A90E2',
  sobremesa: 'C2185B',
}

export function urlImagemProduto(produto: Pick<Produto, 'nome' | 'categoria' | 'imagemUrl'>): string {
  if (produto.imagemUrl) return produto.imagemUrl
  // Só o nome: o placehold.co não desenha emoji e mostrava um quadradinho (▯)
  const texto = encodeURIComponent(produto.nome)
  return `https://placehold.co/600x400/${CORES[produto.categoria]}/white?text=${texto}&font=montserrat`
}
