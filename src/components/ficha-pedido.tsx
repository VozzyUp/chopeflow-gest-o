import { brl, dataBr, num } from "@/lib/format";

export type FichaEmpresa = {
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
};

export type FichaPedido = {
  numero: number;
  cliente: string;
  documento: string | null;
  telefone: string | null;
  endereco: string | null;
  complemento: string | null;
  dataEntrega: string | null;
  dataRetirada: string | null;
  servicoEntrega: string;
  produtos: { descricao: string; quantidade: number; preco: number }[];
  equipamentos: string[];
  valorTotal: number;
  informacoes: string | null;
};

const TERMO =
  "Assumo integralmente a responsabilidade pela conservação destes bens, de modo que irei arcar com custos decorrentes de quebra, dano, extravio, furto, roubo, perda ou qualquer dano no valor unitário do mercado. O cliente é responsável pela devolução de todos os equipamentos listados acima nas perfeitas condições que lhe foram entregues, SUJEITO A COBRANÇA ADICIONAL EM CASO DE DESLOCAMENTO. Extensões e infraestrutura interna são de responsabilidade do CONTRATANTE. NÃO DEVOLVEMOS VALORES DE BARRIS PAGOS NÃO CONSUMIDOS, exceto em regime de consignação acordado. CONFIRA SEU PEDIDO NO ATO DA ENTREGA, NÃO ACEITAMOS RECLAMAÇÕES POSTERIORES. PAGAMENTO DEVERÁ SER FEITO ATÉ NO ATO DA INSTALAÇÃO, ou mandaremos boleto c/ protesto automático.";

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="ficha-linha">
      <span className="ficha-label">{label}</span>
      <span className="ficha-valor">{valor || "\u00a0"}</span>
    </div>
  );
}

/** Ficha de pedido A4 para entregar ao motorista (impressa pelo navegador). */
export function FichaPedidoPrint({ empresa, pedido }: { empresa: FichaEmpresa | null; pedido: FichaPedido }) {
  return (
    <div id="ficha-print" className="ficha">
      <header className="ficha-cabecalho">
        <h1>{empresa?.nome ?? "Distribuidora de chope"}</h1>
        {empresa?.telefone ? <p>WhatsApp: {empresa.telefone}</p> : null}
        <p>
          {empresa?.endereco ?? ""}
          {empresa?.cnpj ? `  ·  CNPJ: ${empresa.cnpj}` : ""}
        </p>
        <p className="ficha-numero">Ficha de pedido nº {pedido.numero}</p>
      </header>

      <section>
        <Linha label="Cliente:" valor={pedido.cliente} />
        <Linha label="CPF/CNPJ:" valor={pedido.documento ?? ""} />
        <Linha label="Telefone:" valor={pedido.telefone ?? ""} />
        <Linha label="Endereço/Bairro/nº:" valor={pedido.endereco ?? ""} />
        <Linha label="Complemento:" valor={pedido.complemento ?? ""} />
        <Linha label="Data da entrega:" valor={pedido.dataEntrega ? dataBr(pedido.dataEntrega) : ""} />
        <Linha label="Data da retirada:" valor={pedido.dataRetirada ? dataBr(pedido.dataRetirada) : ""} />
      </section>

      <hr />

      <section>
        <p className="ficha-bloco-titulo">Serviço de entrega:</p>
        <p className="ficha-bloco-texto">{pedido.servicoEntrega}</p>

        <p className="ficha-bloco-titulo">Produto:</p>
        {pedido.produtos.length === 0 ? (
          <p className="ficha-bloco-texto">—</p>
        ) : (
          <table className="ficha-tabela">
            <tbody>
              {pedido.produtos.map((p, i) => (
                <tr key={i}>
                  <td>{num(p.quantidade)}x</td>
                  <td>{p.descricao}</td>
                  <td className="ficha-td-direita">{p.preco > 0 ? brl(p.preco * p.quantidade) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="ficha-bloco-titulo">Equipamento:</p>
        <p className="ficha-bloco-texto">{pedido.equipamentos.length ? pedido.equipamentos.join(" · ") : "—"}</p>

        <p className="ficha-total">VALOR TOTAL DO PEDIDO: {brl(pedido.valorTotal)}</p>
      </section>

      <hr />

      <section>
        <p className="ficha-bloco-titulo">Informações adicionais:</p>
        <p className="ficha-bloco-texto">{pedido.informacoes || "—"}</p>
        <p className="ficha-termo">{TERMO}</p>
      </section>

      <hr />

      <p className="ficha-assinatura">ASSINATURA CLIENTE: ______________________________ CPF: __________________________</p>
    </div>
  );
}
