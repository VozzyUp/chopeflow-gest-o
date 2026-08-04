import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  Modal,
  PageHead,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  useBarris,
  useChopeiras,
  useCilindros,
  useClientes,
  useContas,
  useProdutos,
} from "@/lib/data";
import { brl, dataHoraBr, num } from "@/lib/format";
import { clienteStatusLabel, movNaturezaLabel } from "@/lib/labels";
import { registrarMovimentacao, type LinhaProduto } from "@/lib/movimentacao";

export const Route = createFileRoute("/_authenticated/movimentacoes/nova")({
  head: () => ({
    meta: [
      { title: "Nova movimentação — ChopeControl" },
      { name: "description", content: "Romaneio rápido de entrega e coleta de barris, chopeiras e cilindros." },
      { property: "og:title", content: "Nova movimentação — ChopeControl" },
      { property: "og:description", content: "Romaneio de entrega/coleta em poucos toques, com comprovante e texto de WhatsApp." },
    ],
  }),
  component: NovaMovimentacao;
});

function NovaMovimentacao() {
  return null;
}
