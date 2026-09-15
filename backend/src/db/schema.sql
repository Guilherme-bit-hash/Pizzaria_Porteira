CREATE DATABASE IF NOT EXISTS pizzaria_porteira
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pizzaria_porteira;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_nome VARCHAR(150) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  complemento VARCHAR(150) NULL,
  observacoes TEXT NULL,
  itens JSON NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('recebido', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado')
    NOT NULL DEFAULT 'recebido',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
