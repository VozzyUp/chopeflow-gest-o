# ChopeFlow Gestão

Crie um sistema web completo de gestão para uma DISTRIBUIDORA DE CHOPE brasileira. Nome do app: "ChopeControl". Todo o sistema em português do Brasil, moeda R$, datas dd/MM/yyyy.

## CONTEXTO DO NEGÓCIO (leia com atenção, o domínio é específico)

A empresa opera em 3 frentes simultâneas:
1. **Locação para festas/eventos**: aluga chopeira + barris para pessoa física, cobra caução, entrega e depois coleta o equipamento e os vasilhames.
2. **Bares e convênios (comodato + consignação)**: cede a chopeira em COMODATO (equipamento fica no bar sem custo, em troca de consumo mínimo de barris) e deixa barris CONSIGNADOS — o bar só paga o barril quando consome. O barril vazio volta e é substituído.
3. **Venda avulsa de barris** para clientes eventuais.

A dor central do dono hoje: ele NÃO sabe quantos barris estão na rua, com quem, quantos foram consumidos, quanto está em aberto para receber e onde estão suas chopeiras. O sistema tem que responder isso em segundos.

## CONCEITOS QUE O SISTEMA PRECISA MODELAR CORRETAMENTE

- **Barril / vasilhame é ATIVO RETORNÁVEL**, não é mercadoria descartável. Um barril de 50L vazio tem valor e precisa voltar. O sistema controla o CICLO DE VIDA: Cheio no estoque → Entregue ao cliente → Vazio no cliente → Coletado → Em higienização → Cheio no estoque.
- **Chopeira** é patrimônio com número de série, precisa saber em qual cliente está, sob qual regime (comodato ou locação), desde quando, e quando foi a última higienização.
- **Cilindro de CO2 / Nitrogênio** também circula com o cliente (regime de troca) e precisa de controle próprio de saldo por cliente.
- **Consignado ≠ vendido**: barril entregue em consignação entra como "saldo em poder do cliente" e só vira receita no ACERTO (quando o cliente informa/devolve o vazio).
- **Contas a receber podem ser parciais**: um acerto de R$ 1.800 pode ser pago R$ 1.000 hoje e R$ 800 depois.

## MODELO DE DADOS (crie essas tabelas no banco, com RLS por usuário/organização)

**clientes** — tipo (bar_convenio | evento_pf | avulso), nome/razão social, CPF/CNPJ, telefone/WhatsApp, e-mail, endereço completo, contato responsável, condição de pagamento (à vista, 7/14/28 dias), tabela de preço aplicada, limite de crédito, status (ativo/inativo/bloqueado por inadimplência), observações.

**produtos_chope** — nome do estilo (Pilsen, IPA, Weiss, Lager, Red Ale...), fornecedor/cervejaria, volume do barril (30L, 50L, 20L), custo por barril, preço de venda por barril, preço de venda por litro, estoque mínimo de alerta, ativo.

**barris** — controle unitário por patrimônio: código/etiqueta, produto atual, volume, status (CHEIO_ESTOQUE, ENTREGUE_CLIENTE, VAZIO_NO_CLIENTE, EM_TRANSITO_RETORNO, EM_HIGIENIZACAO, MANUTENCAO, BAIXADO), cliente atual, data da última movimentação, número de ciclos. Também permitir controle por QUANTIDADE quando o dono não etiqueta barris — ou seja, o sistema deve funcionar nos dois modos (controle unitário e controle por saldo agregado).

**chopeiras** — código patrimonial, marca/modelo, nº de série, nº de torneiras, tipo (elétrica, a gelo, extratora), status (DISPONIVEL, EM_COMODATO, EM_LOCACAO, MANUTENCAO, BAIXADA), cliente atual, data de saída, data prevista de retorno, valor do equipamento, data da última higienização, próxima higienização.

**cilindros** — código, tipo (CO2 ou N2), capacidade em kg, status, cliente atual.

**contratos_comodato** — cliente, chopeira vinculada, data de início, vigência, consumo mínimo mensal acordado (em barris ou litros), valor de multa por descumprimento, valor do equipamento em garantia, status, PDF/termo anexado (campo de URL).

**locacoes_eventos** — cliente, data e hora do evento, endereço do evento, chopeira(s) alocada(s), barris alocados com produto e quantidade, valor da locação, valor da caução, forma de pagamento, status (ORCAMENTO, CONFIRMADO, ENTREGUE, COLETADO, FINALIZADO, CANCELADO), data de entrega, data de coleta, taxa de entrega, observações.

**movimentacoes** — o coração do sistema. Cada saída/retorno gera um registro: tipo (ENTREGA, COLETA, TROCA, VENDA_AVULSA, DEVOLUCAO, AJUSTE_INVENTARIO, PERDA), data, cliente, itens movimentados (barris cheios entregues, barris vazios coletados, chopeiras, cilindros), responsável/entregador, assinatura ou nome de quem recebeu, observação. Cada movimentação deve atualizar automaticamente o status dos ativos e o saldo em poder do cliente.

**consignacoes** — cliente, barril/produto, quantidade entregue, quantidade acertada, quantidade em aberto, data de entrega, data limite sugerida, status (ABERTA, PARCIAL, ACERTADA).

**acertos** — cliente, período, lista de barris consumidos com preço unitário, valor total, desconto, valor final, data do acerto, gera automaticamente uma conta a receber.

**contas_receber** — origem (acerto, locação, venda avulsa), cliente, valor total, valor pago, saldo, vencimento, status (ABERTO, PARCIAL, PAGO, VENCIDO), data de pagamento, forma (PIX, dinheiro, cartão, boleto), observação.

**pagamentos** — vinculados à conta a receber, permitindo múltiplos pagamentos parciais.

**higienizacoes_manutencoes** — ativo (chopeira/barril), tipo (higienização, manutenção corretiva, preventiva), data, custo, técnico, descrição, próxima data prevista.

**movimentacao_estoque_chope** — entradas de compra da cervejaria (nota, custo, quantidade) para o custo médio e a margem funcionarem.

## TELAS QUE PRECISAM EXISTIR

1. **Dashboard** — cards grandes e diretos: Barris na rua (total e por cliente), Barris cheios em estoque, Barris vazios a coletar, Chopeiras em comodato, Chopeiras disponíveis, Total a receber, Total vencido, Faturamento do mês, Barris consumidos no mês. Gráfico de vendas por mês, ranking dos 10 melhores clientes, alerta de estoque abaixo do mínimo, alerta de barris parados há mais de X dias no cliente, alerta de chopeira com higienização vencida.

2. **Clientes** — lista com busca e filtro por tipo/status. Ficha do cliente com abas: Dados, Ativos em poder dele (barris, chopeira, cilindro), Histórico de movimentações, Consignações abertas, Financeiro (aberto e histórico), Consumo médio mensal.

3. **Produtos / Chopes** — CRUD com preço, custo e margem calculada.

4. **Estoque e Ativos** — visão de barris (por status e por produto), chopeiras (com mapa de onde está cada uma) e cilindros. Botão de inventário/ajuste manual.

5. **Nova Movimentação (Romaneio de Entrega/Coleta)** — a tela mais usada. Fluxo rápido: escolhe cliente → escolhe o que sai (barris cheios por produto e quantidade, chopeira, cilindro) → escolhe o que volta (barris vazios, chopeira, cilindro) → define se é VENDA, CONSIGNAÇÃO ou LOCAÇÃO → salva e atualiza tudo. Gerar um comprovante/romaneio imprimível em PDF e um texto pronto para enviar no WhatsApp.

6. **Eventos / Locações** — calendário mensal dos eventos com status colorido, criação de orçamento, conversão em locação confirmada, checklist de entrega e de coleta, controle de caução (retida/devolvida).

7. **Consignação e Acertos** — lista de tudo que está consignado por cliente, com dias em aberto. Tela de acerto: seleciona os barris consumidos, aplica preço, gera a conta a receber.

8. **Financeiro** — contas a receber com filtros (aberto, vencido, pago, por cliente, por período), registro de pagamento parcial, DRE simplificado do mês (receita, custo dos barris, margem), fluxo de caixa previsto.

9. **Relatórios** — barris por cliente, giro de barril, tempo médio de retorno de vasilhame, ranking de consumo, inadimplência, rentabilidade por cliente e por produto. Exportação em CSV.

10. **Configurações** — dados da empresa, tabelas de preço, usuários e perfis (Admin, Operacional/Entregador, Financeiro), parâmetros de alerta.

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

- Toda entrega de barril reduz o estoque de cheios e aumenta o saldo em poder do cliente.
- Toda coleta de vazio reduz o saldo do cliente e joga o barril para higienização.
- Não permitir entregar barril acima do limite de crédito de cliente bloqueado — exibir aviso e exigir confirmação do admin.
- Consignação só vira receita no acerto.
- Conta a receber calcula automaticamente saldo = total - soma dos pagamentos, e muda para VENCIDO quando passa do vencimento.
- Ao finalizar uma locação de evento, o sistema deve cobrar barris consumidos e devolver a caução, mostrando o acerto final.
- Histórico auditável: nenhuma movimentação é apagada, apenas estornada com registro.

## DESIGN E EXPERIÊNCIA

- Visual moderno, escuro-âmbar/dourado remetendo a cerveja, mas profissional e limpo — não usar clichê de bar com madeira. Tipografia forte, números grandes e legíveis no dashboard.
- Totalmente responsivo e pensado para uso NO CELULAR pelo entregador na rua: botões grandes, fluxo de romaneio em poucos toques.
- Login com e-mail e senha, com perfis de acesso.
- Popular o banco com dados de exemplo realistas (uns 8 clientes, 5 tipos de chope, 40 barris, 6 chopeiras, movimentações e contas em aberto) para o sistema já abrir com o dashboard cheio e navegável.

Construa o sistema inteiro, funcional de ponta a ponta, com backend real e persistência — não crie protótipo com dados mockados no frontend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b667c101-9623-4310-be17-afe35bdd9568).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
