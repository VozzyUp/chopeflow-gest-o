import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useBarris, useProdutos, type Produto } from "@/lib/data";
import { brl, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Chopes — ChopeControl" },
      { name: "description", content: "Cadastro de estilos de chope com custo, preço de venda e margem calculada." },
      { property: "og:title", content: "Chopes — ChopeControl" },
      { property: "og:description", content: "Pilsen, IPA, Weiss e mais: custo por barril, preço por litro e margem." },
    ],
  }),
  component: ProdutosPage,
});

const vazio = {
  nome: "",
  fornecedor: "",
  volume_litros: 50,
  custo_barril: 0,
  preco_barril: 0,
  preco_litro: 0,
  estoque_minimo: 5,
  ativo: true,
};

function ProdutosPage() {
  const { data: produtos, isLoading } = useProdutos();
  const { data: barris } = useBarris();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(vazio);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        volume_litros: Number(form.volume_litros) || 0,
        custo_barril: Number(form.custo_barril) || 0,
        preco_barril: Number(form.preco_barril) || 0,
        preco_litro: Number(form.preco_litro) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        ativo: form.ativo === true || form.ativo === "true",
      };
      if (editando) {
        const { error } = await supabase.from("produtos_chope").update(payload as never).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos_chope").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Chope salvo");
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      setModal(false);
      setEditando(null);
      setForm(vazio);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHead
        title="Chopes"
        subtitle="Estilos, custo, preço e margem"
        actions={
          <Button
            onClick={() => {
              setEditando(null);
              setForm(vazio);
              setModal(true);
            }}
          >
            + Novo chope
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (produtos ?? []).length === 0 ? (
          <EmptyState>Nenhum chope cadastrado.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Chope</Th>
                <Th className="hidden sm:table-cell">Cervejaria</Th>
                <Th>Volume</Th>
                <Th>Custo</Th>
                <Th>Preço</Th>
                <Th>Margem</Th>
                <Th className="hidden md:table-cell">Estoque cheio</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {(produtos ?? []).map((p) => {
                const margem = Number(p.preco_barril) - Number(p.custo_barril);
                const pct = Number(p.preco_barril) ? (margem / Number(p.preco_barril)) * 100 : 0;
                const cheios = (barris ?? []).filter(
                  (b) => b.produto_id === p.id && b.status === "CHEIO_ESTOQUE",
                ).length;
                return (
                  <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                    <Td className="font-semibold">{p.nome}</Td>
                    <Td className="hidden sm:table-cell text-muted-foreground">{p.fornecedor}</Td>
                    <Td>{num(p.volume_litros)} L</Td>
                    <Td>{brl(p.custo_barril)}</Td>
                    <Td>
                      {brl(p.preco_barril)}
                      <div className="text-xs text-muted-foreground">{brl(p.preco_litro)}/L</div>
                    </Td>
                    <Td>
                      <Badge tone={pct >= 30 ? "success" : pct > 0 ? "warning" : "danger"}>
                        {brl(margem)} · {pct.toFixed(0)}%
                      </Badge>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Badge tone={cheios < p.estoque_minimo ? "danger" : "neutral"}>
                        {cheios} / mín {p.estoque_minimo}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditando(p);
                          setForm({ ...vazio, ...p });
                          setModal(true);
                        }}
                      >
                        Editar
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar chope" : "Novo chope"}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <Field label="Nome do estilo" className="sm:col-span-2">
            <Input value={String(form.nome ?? "")} onChange={set("nome")} required placeholder="Pilsen, IPA, Weiss..." />
          </Field>
          <Field label="Cervejaria / fornecedor" className="sm:col-span-2">
            <Input value={String(form.fornecedor ?? "")} onChange={set("fornecedor")} />
          </Field>
          <Field label="Volume do barril (L)">
            <Input type="number" step="1" value={String(form.volume_litros)} onChange={set("volume_litros")} />
          </Field>
          <Field label="Estoque mínimo (barris)">
            <Input type="number" step="1" value={String(form.estoque_minimo)} onChange={set("estoque_minimo")} />
          </Field>
          <Field label="Custo por barril (R$)">
            <Input type="number" step="0.01" value={String(form.custo_barril)} onChange={set("custo_barril")} />
          </Field>
          <Field label="Preço por barril (R$)">
            <Input type="number" step="0.01" value={String(form.preco_barril)} onChange={set("preco_barril")} />
          </Field>
          <Field label="Preço por litro (R$)">
            <Input type="number" step="0.01" value={String(form.preco_litro)} onChange={set("preco_litro")} />
          </Field>
          <Field label="Ativo">
            <Select value={String(form.ativo)} onChange={set("ativo")}>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
