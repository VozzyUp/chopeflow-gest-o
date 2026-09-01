# Melhorias na movimentação, clientes e estoque

## 1. Tipos de cliente
Passam a ser exatamente três: **Bar**, **Delivery** e **Avulso**.
Clientes atuais são convertidos: "Bar / Convênio" → Bar, "Evento / PF" → Delivery, "Avulso" segue Avulso.
Filtros e telas que mostram o tipo são atualizados junto.

## 2. Cadastro de cliente
- Novo campo **Data de aniversário** (opcional) no cadastro/edição e na ficha do cliente.
- Lista de clientes ganha um destaque simples de aniversariantes do mês.

## 3. Nova movimentação
- **Busca de cliente**: campo de texto com sugestões por nome/telefone/documento no lugar do dropdown; mostra status e limite ao selecionar.
- **Endereço de entrega alternativo**: caixa "Entregar em outro endereço" que abre campos de endereço/bairro/nº/complemento; quando vazia usa o endereço do cadastro. O endereço usado fica gravado no romaneio e sai na ficha e no WhatsApp.
- **Blocos dinâmicos por tipo**:
  - Entrega, Venda avulsa → só **Saída**
  - Coleta, Devolução → só **Retorno**
  - Troca, Ajuste de inventário → Saída e Retorno
  - Perda → só Saída (baixa)
- **Foto da entrega/instalação**: botão que abre a câmera do celular (ou escolhe arquivo), com pré-visualização; as fotos são salvas no sistema e ficam visíveis no histórico do romaneio.
- **Compartilhar no WhatsApp**: botão que abre o WhatsApp com o texto do romaneio já montado (hoje o texto só é exibido para copiar).
- **Data de entrega e data de retirada** no cabeçalho do romaneio, para alimentar a ficha impressa.

## 4. Ficha PDF para o motorista
Ao concluir a movimentação, botão **Imprimir ficha**, no layout do modelo anexado:
- Cabeçalho com nome, WhatsApp, endereço e CNPJ vindos de Configurações (dados da empresa).
- Cliente, CPF/CNPJ, telefone, endereço/bairro/nº, complemento, data de entrega e data de retirada.
- Serviço de entrega, Produtos, Equipamentos e **valor total do pedido**.
- Informações adicionais + texto de responsabilidade pelos bens (igual ao modelo) e linha de assinatura do cliente com CPF.
Impressão em A4 pelo próprio navegador (gera PDF ao imprimir), sem depender de nada externo.

## 5. Controle de estoque de barris
Nova aba **Entradas do fabricante** em Estoque:
- Registrar recebimento: produto, quantidade de barris, nota fiscal, custo unitário, data e observação.
- Painel por produto: **recebido**, **retirado/entregue** (somado das movimentações de saída), **em estoque** e alerta de estoque mínimo.
- Exportação em CSV desse resumo.

## Detalhes técnicos
- Migração: novo enum de `cliente_tipo` (bar, delivery, avulso) com conversão dos dados existentes; `clientes.data_nascimento date`; `movimentacoes.endereco_entrega`, `complemento_entrega`, `data_entrega_prevista`, `data_retirada_prevista`; nova tabela `movimentacao_fotos` (romaneio, caminho da foto) com GRANTs e RLS igual às demais tabelas.
- Storage: bucket privado `romaneios` com políticas em `storage.objects` para usuários autenticados; upload via cliente do navegador e leitura por URL assinada.
- `src/lib/movimentacao.ts` passa a gravar os campos de endereço/datas; `src/lib/labels.ts` atualizado; `estoque.tsx` ganha a aba de entradas usando `movimentacao_estoque_chope`.
- Ficha impressa como componente com `@media print` dedicado (sem biblioteca de PDF).
- Correção de um aviso de hidratação na tela de login enquanto passo por ela.
