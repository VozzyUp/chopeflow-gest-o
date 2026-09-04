-- ChopeControl — automações do banco (MySQL 8)
-- Importe DEPOIS de schema.sql. No phpMyAdmin use a aba SQL e cole o conteúdo inteiro.

DROP TRIGGER IF EXISTS trg_consignacao_status_ins;
DROP TRIGGER IF EXISTS trg_consignacao_status_upd;
DROP TRIGGER IF EXISTS trg_conta_valores_ins;
DROP TRIGGER IF EXISTS trg_conta_valores_upd;
DROP TRIGGER IF EXISTS trg_pagamento_ins;
DROP TRIGGER IF EXISTS trg_pagamento_upd;
DROP TRIGGER IF EXISTS trg_pagamento_del;

DELIMITER $$

CREATE TRIGGER trg_consignacao_status_ins BEFORE INSERT ON consignacoes FOR EACH ROW
BEGIN
  IF NEW.quantidade_acertada <= 0 THEN SET NEW.status = 'ABERTA';
  ELSEIF NEW.quantidade_acertada >= NEW.quantidade_entregue THEN SET NEW.status = 'ACERTADA';
  ELSE SET NEW.status = 'PARCIAL'; END IF;
END$$

CREATE TRIGGER trg_consignacao_status_upd BEFORE UPDATE ON consignacoes FOR EACH ROW
BEGIN
  IF NEW.quantidade_acertada <= 0 THEN SET NEW.status = 'ABERTA';
  ELSEIF NEW.quantidade_acertada >= NEW.quantidade_entregue THEN SET NEW.status = 'ACERTADA';
  ELSE SET NEW.status = 'PARCIAL'; END IF;
END$$

CREATE TRIGGER trg_conta_valores_ins BEFORE INSERT ON contas_receber FOR EACH ROW
BEGIN
  SET NEW.saldo = GREATEST(NEW.valor_total - NEW.valor_pago, 0);
  IF NEW.saldo <= 0 THEN SET NEW.status = 'PAGO';
  ELSEIF NEW.vencimento < CURDATE() THEN SET NEW.status = 'VENCIDO';
  ELSEIF NEW.valor_pago > 0 THEN SET NEW.status = 'PARCIAL';
  ELSE SET NEW.status = 'ABERTO'; END IF;
END$$

CREATE TRIGGER trg_conta_valores_upd BEFORE UPDATE ON contas_receber FOR EACH ROW
BEGIN
  SET NEW.saldo = GREATEST(NEW.valor_total - NEW.valor_pago, 0);
  IF NEW.saldo <= 0 THEN SET NEW.status = 'PAGO';
  ELSEIF NEW.vencimento < CURDATE() THEN SET NEW.status = 'VENCIDO';
  ELSEIF NEW.valor_pago > 0 THEN SET NEW.status = 'PARCIAL';
  ELSE SET NEW.status = 'ABERTO'; END IF;
END$$

CREATE TRIGGER trg_pagamento_ins AFTER INSERT ON pagamentos FOR EACH ROW
BEGIN
  UPDATE contas_receber c
     SET c.valor_pago = COALESCE((SELECT SUM(p.valor) FROM pagamentos p WHERE p.conta_id = NEW.conta_id), 0),
         c.data_pagamento = (SELECT MAX(p.data) FROM pagamentos p WHERE p.conta_id = NEW.conta_id)
   WHERE c.id = NEW.conta_id;
END$$

CREATE TRIGGER trg_pagamento_upd AFTER UPDATE ON pagamentos FOR EACH ROW
BEGIN
  UPDATE contas_receber c
     SET c.valor_pago = COALESCE((SELECT SUM(p.valor) FROM pagamentos p WHERE p.conta_id = NEW.conta_id), 0),
         c.data_pagamento = (SELECT MAX(p.data) FROM pagamentos p WHERE p.conta_id = NEW.conta_id)
   WHERE c.id = NEW.conta_id;
END$$

CREATE TRIGGER trg_pagamento_del AFTER DELETE ON pagamentos FOR EACH ROW
BEGIN
  UPDATE contas_receber c
     SET c.valor_pago = COALESCE((SELECT SUM(p.valor) FROM pagamentos p WHERE p.conta_id = OLD.conta_id), 0),
         c.data_pagamento = (SELECT MAX(p.data) FROM pagamentos p WHERE p.conta_id = OLD.conta_id)
   WHERE c.id = OLD.conta_id;
END$$

DELIMITER ;
