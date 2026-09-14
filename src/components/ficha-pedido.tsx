import { brl, dataBr, num } from "@/lib/format";

export type FichaEmpresa = {
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email?: string | null;
  endereco: string | null;
};

export type FichaSaida = {
  quantidade: number;
  produto: string;
  detalhe: string | null;
  /** null = sem preço definido (consignação/comodato: cobrado no acerto). */
  precoUnitario: number | null;
};

export type FichaEquipamento = {
  quantidade: number;
  nome: string;
  serie: string | null;
  valor: number | null;
};

export type FichaRetorno = { quantidade: number; item: string };

export type FichaPedido = {
  numero: number;
  tipoLabel: string;
  natureza: string;
  naturezaLabel: string;
  data: string | null;
  cliente: string;
  documento: string | null;
  telefone: string | null;
  endereco: string | null;
  complemento: string | null;
  entregador: string | null;
  dataEntrega: string | null;
  dataRetirada: string | null;
  mostrarSaida: boolean;
  mostrarRetorno: boolean;
  saidas: FichaSaida[];
  equipamentos: FichaEquipamento[];
  retornos: FichaRetorno[];
  valorTotal: number;
  informacoes: string | null;
};

/** Explicação curta da natureza da operação, impressa no topo da ficha. */
const EXPLICACAO_NATUREZA: Record<string, string> = {
  CONSIGNACAO: "Os barris ficam em poder do cliente e são faturados no acerto, conforme o consumo apurado.",
  VENDA: "Venda faturada nesta entrega, conforme os valores desta ficha.",
  LOCACAO: "Equipamentos e barris cedidos para o evento, com devolução na data de retirada combinada.",
  COMODATO: "Equipamento cedido em comodato, vinculado ao consumo mínimo do contrato.",
  INTERNO: "Movimentação interna de controle, sem cobrança ao cliente.",
};

const CLAUSULAS: { titulo: string; texto: string }[] = [
  {
    titulo: "Conservação.",
    texto:
      "O cliente assume a responsabilidade pelos bens desta ficha e arca com o valor de mercado em caso de quebra, dano, extravio, furto, roubo ou perda.",
  },
  {
    titulo: "Devolução.",
    texto:
      "Os equipamentos devem voltar nas mesmas condições em que foram entregues. Coleta fora da data acordada está sujeita a cobrança de deslocamento.",
  },
  {
    titulo: "Infraestrutura.",
    texto:
      "Extensões elétricas, ponto de energia e infraestrutura interna do local são de responsabilidade do contratante.",
  },
  {
    titulo: "Barris pagos.",
    texto: "Não devolvemos valores de barris pagos e não consumidos, exceto em regime de consignação acordado.",
  },
  {
    titulo: "Conferência.",
    texto: "Confira o pedido no ato da entrega. Não aceitamos reclamações após a assinatura desta ficha.",
  },
  {
    titulo: "Pagamento.",
    texto: "Devido até o ato da instalação, salvo prazo em contrato. Em atraso, cobrança por boleto com protesto automático.",
  },
];

function Campo({ label, valor, largo }: { label: string; valor: string; largo?: boolean }) {
  return (
    <div className={largo ? "ficha-campo ficha-campo-largo" : "ficha-campo"}>
      <span className="ficha-campo-label">{label}</span>
      <span className="ficha-campo-valor">{valor || "—"}</span>
    </div>
  );
}

function SecaoTitulo({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <div className="ficha-secao-titulo">
      <h2>{titulo}</h2>
      <span>{nota}</span>
    </div>
  );
}

function Via({
  empresa,
  pedido,
  via,
}: {
  empresa: FichaEmpresa | null;
  pedido: FichaPedido;
  via: "cliente" | "empresa";
}) {
  const semCobranca = pedido.natureza === "CONSIGNACAO" || pedido.natureza === "COMODATO";
  const barris = pedido.saidas.reduce((s, l) => s + l.quantidade, 0);
  const contato = [empresa?.email, empresa?.telefone, empresa?.cnpj ? `CNPJ ${empresa.cnpj}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="ficha-via">
      <header className="ficha-topo">
        <div>
          <p className="ficha-marca">{empresa?.nome ?? "Distribuidora de chopp"}</p>
          {empresa?.endereco ? <p className="ficha-sub">{empresa.endereco}</p> : null}
          {contato ? <p className="ficha-sub">{contato}</p> : null}
        </div>
        <div className="ficha-topo-direita">
          <p className="ficha-sub">Ficha de pedido</p>
          <p className="ficha-numero">{pedido.numero}</p>
          <p className="ficha-tipo">
            {pedido.tipoLabel}
            {pedido.data ? ` · ${dataBr(pedido.data)}` : ""}
          </p>
        </div>
      </header>

      <div className="ficha-natureza">
        <strong>{pedido.naturezaLabel}</strong>
        <span>{EXPLICACAO_NATUREZA[pedido.natureza] ?? ""}</span>
      </div>

      <div className="ficha-dados">
        <div className="ficha-dados-col">
          <Campo label="Cliente" valor={pedido.cliente} largo />
          <Campo
            label="Endereço de entrega"
            valor={[pedido.endereco, pedido.complemento].filter(Boolean).join(" — ")}
            largo
          />
          <Campo label="Entregador" valor={pedido.entregador ?? "—"} largo />
        </div>
        <div className="ficha-dados-col">
          <Campo label="CPF / CNPJ" valor={pedido.documento ?? "—"} />
          <Campo label="Telefone" valor={pedido.telefone ?? "—"} />
          <Campo
            label={pedido.dataEntrega ? "Entrega / retirada" : "Retirada prevista"}
            valor={
              [
                pedido.dataEntrega ? dataBr(pedido.dataEntrega) : null,
                pedido.dataRetirada ? dataBr(pedido.dataRetirada) : "a combinar",
              ]
                .filter(Boolean)
                .join(" → ")
            }
          />
        </div>
      </div>

      {pedido.mostrarSaida ? (
        <section>
          <SecaoTitulo titulo="Saída" nota="Entregue ao cliente nesta visita" />
          <table className="ficha-tabela">
            <thead>
              <tr>
                <th className="ficha-col-qtd">Qtd</th>
                <th>Produto</th>
                <th className="ficha-direita">Unitário</th>
                <th className="ficha-direita">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedido.saidas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ficha-vazio">
                    Nenhum produto entregue nesta visita.
                  </td>
                </tr>
              ) : (
                pedido.saidas.map((l, i) => (
                  <tr key={i}>
                    <td className="ficha-col-qtd ficha-qtd">{num(l.quantidade)}</td>
                    <td>
                      <span className="ficha-item-nome">{l.produto}</span>
                      {l.detalhe ? <span className="ficha-item-detalhe">{l.detalhe}</span> : null}
                    </td>
                    <td className="ficha-direita">
                      {semCobranca || l.precoUnitario === null ? "a apurar" : brl(l.precoUnitario)}
                    </td>
                    <td className="ficha-direita ficha-forte">
                      {semCobranca || l.precoUnitario === null ? "no acerto" : brl(l.precoUnitario * l.quantidade)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      <section>
        <SecaoTitulo titulo="Equipamentos" nota="Permanecem no cliente sob responsabilidade dele" />
        <table className="ficha-tabela">
          <thead>
            <tr>
              <th className="ficha-col-qtd">Qtd</th>
              <th>Equipamento</th>
              <th>Nº de série</th>
              <th className="ficha-direita">Valor de reposição</th>
            </tr>
          </thead>
          <tbody>
            {pedido.equipamentos.length === 0 ? (
              <tr>
                <td colSpan={4} className="ficha-vazio">
                  Nenhum equipamento entregue nesta visita.
                </td>
              </tr>
            ) : (
              pedido.equipamentos.map((e, i) => (
                <tr key={i}>
                  <td className="ficha-col-qtd ficha-qtd">{num(e.quantidade)}</td>
                  <td>
                    <span className="ficha-item-nome">{e.nome}</span>
                  </td>
                  <td>{e.serie ?? "—"}</td>
                  <td className="ficha-direita">{e.valor && e.valor > 0 ? brl(e.valor) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {pedido.mostrarRetorno ? (
        <section>
          <SecaoTitulo
            titulo="Retorno"
            nota={pedido.retornos.length ? "Conferir com o cliente na coleta" : "Preencher na coleta e conferir com o cliente"}
          />
          <table className="ficha-tabela ficha-tabela-retorno">
            <thead>
              <tr>
                <th className="ficha-col-qtd">Qtd</th>
                <th>Item recolhido</th>
                <th className="ficha-col-ok">Ok</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {pedido.retornos.map((r, i) => (
                <tr key={`r${i}`}>
                  <td className="ficha-col-qtd ficha-qtd">{num(r.quantidade)}</td>
                  <td>{r.item}</td>
                  <td className="ficha-col-ok">
                    <span className="ficha-box" />
                  </td>
                  <td className="ficha-linha-pontilhada" />
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 3 - pedido.retornos.length) }).map((_, i) => (
                <tr key={`v${i}`}>
                  <td className="ficha-col-qtd" />
                  <td className="ficha-linha-pontilhada" />
                  <td className="ficha-col-ok">
                    <span className="ficha-box" />
                  </td>
                  <td className="ficha-linha-pontilhada" />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="ficha-fechamento">
        {semCobranca ? (
          <>
            <div className="ficha-total-linha">
              <strong>Barris consignados</strong>
              <span className="ficha-total-valor">{num(barris)}</span>
            </div>
            <p className="ficha-observacao">
              Nada a pagar nesta entrega. A cobrança é emitida no acerto, sobre os barris efetivamente consumidos.
            </p>
          </>
        ) : (
          <div className="ficha-total-linha">
            <strong>Valor total do pedido</strong>
            <span className="ficha-total-valor">{brl(pedido.valorTotal)}</span>
          </div>
        )}
        {pedido.informacoes ? (
          <p className="ficha-observacao">
            <strong>Informações adicionais. </strong>
            {pedido.informacoes}
          </p>
        ) : null}
      </div>

      <div className="ficha-clausulas">
        {CLAUSULAS.map((c) => (
          <p key={c.titulo}>
            <strong>{c.titulo}</strong> {c.texto}
          </p>
        ))}
      </div>

      <div className="ficha-assinaturas">
        <div>
          <p className="ficha-assinatura-nome">{pedido.cliente || "\u00a0"}</p>
          <p className="ficha-assinatura-label">Assinatura do cliente · CPF ____________________</p>
        </div>
        <div>
          <p className="ficha-assinatura-nome">{pedido.entregador || "\u00a0"}</p>
          <p className="ficha-assinatura-label">Entregador · data e hora ___/___/_____ ___:___</p>
        </div>
      </div>

      <footer className="ficha-rodape">
        <span>{via === "cliente" ? "Via do cliente" : "Via da empresa"}</span>
        <span>
          {empresa?.nome ?? "Distribuidora de chopp"} · Pedido {pedido.numero}
        </span>
      </footer>
    </article>
  );
}

/** Ficha de pedido A4 (duas vias) para entregar ao motorista, impressa pelo navegador. */
export function FichaPedidoPrint({ empresa, pedido }: { empresa: FichaEmpresa | null; pedido: FichaPedido }) {
  return (
    <div id="ficha-print" className="ficha">
      <Via empresa={empresa} pedido={pedido} via="cliente" />
      <Via empresa={empresa} pedido={pedido} via="empresa" />
    </div>
  );
}
