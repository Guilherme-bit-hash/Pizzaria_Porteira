-- =====================================================================================
-- schema.sql — estrutura do banco de dados (banco e tabelas).
--
-- Executado por db/migrate.js. Todos os comandos usam IF NOT EXISTS / INSERT IGNORE, então
-- rodar de novo é seguro. Tabelas: pedidos, produtos (cardápio), clientes e promocoes
-- (promoção de cada dia da semana). A coluna pedidos.cliente_id (vínculo com clientes) é
-- criada pelo migrate.js, não aqui.
-- Convenções: criado_em/atualizado_em são preenchidos automaticamente pelo MySQL; colunas
-- NULL são opcionais e NOT NULL são obrigatórias; DECIMAL(10, 2) guarda dinheiro sem erro de
-- arredondamento.
-- =====================================================================================

-- O banco em si (utf8mb4, que suporta acentos e emojis) é criado/selecionado pelo migrate.js
-- a partir de DB_NAME, porque em hospedagens de MySQL o banco já vem criado com outro nome.

-- Pedidos feitos pelo checkout do site (usada por routes/pedidos.js).
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY, -- identificador gerado automaticamente
  -- Dados do cliente e da entrega, copiados no momento do pedido (histórico fiel).
  cliente_nome VARCHAR(150) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  complemento VARCHAR(150) NULL,
  observacoes TEXT NULL,
  -- Itens do pedido (nome, preço e quantidade) guardados como JSON, para que o pedido
  -- não mude se o cardápio for editado depois.
  itens JSON NOT NULL,
  -- Valores: subtotal dos itens, desconto do cupom e total final a pagar.
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cupom VARCHAR(50) NULL,
  total DECIMAL(10, 2) NOT NULL,
  -- Andamento do pedido, atualizado pelo admin.
  status ENUM('recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado')
    NOT NULL DEFAULT 'recebido',
  -- Pagamento: forma escolhida, situação do PIX e id do pagamento no Mercado Pago.
  forma_pagamento ENUM('whatsapp', 'pix') NOT NULL DEFAULT 'whatsapp',
  pagamento_status ENUM('pendente', 'aprovado', 'recusado', 'expirado') NULL,
  mp_payment_id VARCHAR(50) NULL,
  -- Datas: criação e última alteração (esta se atualiza sozinha a cada UPDATE).
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cardápio editável pelo painel admin. Os produtos iniciais são inseridos pelo migrate.js
-- (só quando a tabela está vazia), para uma renomeação feita no painel não ser desfeita.
-- (usada por routes/produtos.js e conferida em routes/pedidos.js)
CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria ENUM('pizza', 'hamburguer', 'bebida', 'sobremesa') NOT NULL,
  nome VARCHAR(150) NOT NULL,
  descricao VARCHAR(255) NOT NULL DEFAULT '',
  preco DECIMAL(10, 2) NOT NULL,
  imagem_url VARCHAR(500) NULL,
  -- ativo = FALSE esconde o produto do site sem apagá-lo; ordem define a posição na listagem.
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Não permite dois produtos com o mesmo nome (o nome identifica o item nos pedidos).
  UNIQUE KEY uq_produtos_nome (nome)
);

-- Base de clientes, criada/atualizada automaticamente a cada pedido. `aceita_promocoes` só
-- vira TRUE quando o cliente marca o consentimento no checkout (LGPD) — é ele que deve
-- filtrar qualquer disparo de promoções por WhatsApp/e-mail.
-- (usada por routes/clientes.js, routes/campanhas.js e routes/pedidos.js)
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  -- Telefone só com dígitos: é a chave que identifica o cliente (ver índice UNIQUE abaixo).
  telefone_normalizado VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  endereco VARCHAR(255) NOT NULL,
  complemento VARCHAR(150) NULL,
  -- Consentimento LGPD para receber promoções e a data em que foi dado.
  aceita_promocoes BOOLEAN NOT NULL DEFAULT FALSE,
  consentimento_em TIMESTAMP NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Garante um único cliente por telefone; é o que permite o ON DUPLICATE KEY UPDATE
  -- do INSERT de clientes em routes/pedidos.js.
  UNIQUE KEY uq_clientes_telefone (telefone_normalizado)
);

-- Promoção de cada dia da semana (usada por routes/promocoes.js). A chave primária é o
-- próprio dia, então há no máximo uma promoção por dia.
CREATE TABLE IF NOT EXISTS promocoes (
  dia_semana TINYINT PRIMARY KEY, -- 0 = domingo ... 6 = sábado
  nome VARCHAR(150) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  preco DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- destaque e cor controlam a aparência da promoção no site.
  destaque BOOLEAN NOT NULL DEFAULT TRUE,
  cor VARCHAR(20) NOT NULL DEFAULT '#FFD700',
  -- Textos prontos para divulgar a promoção por WhatsApp e por e-mail.
  whatsapp_message TEXT NULL,
  email_subject VARCHAR(255) NULL,
  email_body TEXT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Impede gravar um dia fora do intervalo 0 a 6.
  CONSTRAINT chk_promocoes_dia_semana CHECK (dia_semana BETWEEN 0 AND 6)
);

-- Configuração da loja: hoje só guarda se está aceitando pedidos ou não (usada por
-- routes/loja.js e conferida em routes/pedidos.js ao criar um pedido). Tabela de uma
-- linha só (id sempre 1) em vez de uma tabela chave-valor genérica, porque só existe essa
-- configuração por enquanto — é mais simples de ler/escrever que inventar um formato genérico.
CREATE TABLE IF NOT EXISTS loja_config (
  id TINYINT PRIMARY KEY DEFAULT 1,
  aberta BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_loja_config_id_unico CHECK (id = 1)
);

-- Garante que a linha de configuração existe (começa aberta); INSERT IGNORE não sobrescreve
-- o valor se o admin já tiver fechado/aberto a loja numa migração anterior.
INSERT IGNORE INTO loja_config (id, aberta) VALUES (1, TRUE);

-- Semente com as promoções padrão de cada dia da semana (0 = domingo ... 6 = sábado).
-- INSERT IGNORE preserva edições já feitas pelo painel admin em migrações futuras.
INSERT IGNORE INTO promocoes
  (dia_semana, nome, descricao, preco, destaque, cor, whatsapp_message, email_subject, email_body)
VALUES
  (0, '🍕 Domingo em Família', '2 Pizzas Grandes + Refri 2L por R$ 89,90', 89.90, TRUE, '#FF6B35',
   '🍕 PROMOÇÃO DOMINGO EM FAMÍLIA! 👨‍👩‍👧‍👦\n\n2 Pizzas Grandes + Refri 2L por R$ 89,90\n\nVenha aproveitar esta oferta especial! 😋\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Promoção Domingo em Família - Pizzaria Porteira 🍕',
   'Olá! Este domingo aproveite nossa promoção especial:\n\n2 Pizzas Grandes + Refri 2L por R$ 89,90\n\nIdeall para reunir a família! Aproveite!'),
  (1, '🎯 Segunda da Pizza', 'Todas as pizzas com 20% OFF', 0, TRUE, '#4A90E2',
   '🍕 SEGUNDA DA PIZZA! 🎯\n\n20% OFF em TODAS as pizzas\n\nNão perca! Aproveite os melhores sabores com desconto especial 🔥\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Segunda da Pizza - 20% OFF em Todas as Pizzas 🍕',
   'Ótima notícia! Toda segunda-feira temos:\n\n20% OFF em TODAS as pizzas\n\nAproveite para experimentar nossos sabores especiais com desconto!'),
  (2, '🍔 Terça do Hambúrguer', 'Hambúrguer + Batata + Refri por R$ 29,90', 29.90, TRUE, '#8B4513',
   '🍔 TERÇA DO HAMBÚRGUER! 😋\n\nHambúrguer + Batata + Refri por R$ 29,90\n\nNossos hamburgueres são irresistíveis! Aproveite este preço especial 🔥\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Terça do Hambúrguer - Combo Especial 🍔',
   'Toda terça-feira temos a Terça do Hambúrguer:\n\nHambúrguer + Batata + Refri por R$ 29,90\n\nNão deixe de experimentar!'),
  (3, '🎪 Quarta do Rodízio', 'Rodízio de Pizza por R$ 39,90', 39.90, TRUE, '#9C27B0',
   '🎪 QUARTA DO RODÍZIO! 🍕\n\nRodízio de Pizza por R$ 39,90\n\nVenha experimentar diversos sabores! É festa garantida! 🎉\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Quarta do Rodízio - Rodízio de Pizza 🎪',
   'Toda quarta-feira temos a promoção do Rodízio de Pizza:\n\nRodízio de Pizza por R$ 39,90\n\nVenha com a família e aproveite!'),
  (4, '🥤 Quinta da Bebida', 'Refrigerante 2L por R$ 8,90', 8.90, TRUE, '#2196F3',
   '🥤 QUINTA DA BEBIDA! 🍹\n\nRefrigerante 2L por R$ 8,90\n\nAcompanhe sua pizza ou hambúrguer com nossas bebidas especiais! 😋\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Quinta da Bebida - Refrigerante com Desconto 🥤',
   'Toda quinta-feira aproveite nossas bebidas em promoção:\n\nRefrigerante 2L por R$ 8,90\n\nPerfecto para acompanhar seus pedidos!'),
  (5, '🎉 Sexta Feliz', 'Combo Casal: Pizza + 2 Refris por R$ 59,90', 59.90, TRUE, '#FF9800',
   '🎉 SEXTA FELIZ! 💑\n\nCombo Casal: Pizza + 2 Refris por R$ 59,90\n\nBeijo na testa e aproveite nosso combo perfeito! 😘\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Sexta Feliz - Combo Casal Especial 🎉',
   'Toda sexta-feira temos a Sexta Feliz:\n\nCombo Casal: Pizza + 2 Refris por R$ 59,90\n\nPerfecto para começar o fim de semana com a pessoa especial!'),
  (6, '🌟 Sábado Especial', 'Promoção surpresa! Pergunte no WhatsApp', 0, TRUE, '#FFD700',
   '🌟 SÁBADO ESPECIAL! 🎊\n\nPromoção SURPRESA este sábado! 🎁\n\nEntre em contato conosco e descubra a oferta exclusiva de hoje! 🔥\n\nPizzaria Porteira\n📞 (11) 99999-9999',
   'Sábado Especial - Promoção Surpresa 🌟',
   'Este sábado temos uma promoção SURPRESA para você!\n\nEntre em contato conosco pelo WhatsApp para descobrir a oferta exclusiva!');
