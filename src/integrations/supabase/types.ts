export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acerto_itens: {
        Row: {
          acerto_id: string
          consignacao_id: string | null
          created_at: string
          id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          acerto_id: string
          consignacao_id?: string | null
          created_at?: string
          id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
        }
        Update: {
          acerto_id?: string
          consignacao_id?: string | null
          created_at?: string
          id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "acerto_itens_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acerto_itens_consignacao_id_fkey"
            columns: ["consignacao_id"]
            isOneToOne: false
            referencedRelation: "consignacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acerto_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      acertos: {
        Row: {
          cliente_id: string
          created_at: string
          data_acerto: string
          desconto: number
          id: string
          observacao: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          valor_bruto: number
          valor_final: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_acerto?: string
          desconto?: number
          id?: string
          observacao?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          valor_bruto?: number
          valor_final?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_acerto?: string
          desconto?: number
          id?: string
          observacao?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          valor_bruto?: number
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "acertos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      barris: {
        Row: {
          ciclos: number
          cliente_id: string | null
          codigo: string
          created_at: string
          data_ultima_movimentacao: string | null
          id: string
          observacoes: string | null
          produto_id: string | null
          status: Database["public"]["Enums"]["barril_status"]
          updated_at: string
          volume_litros: number
        }
        Insert: {
          ciclos?: number
          cliente_id?: string | null
          codigo: string
          created_at?: string
          data_ultima_movimentacao?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string | null
          status?: Database["public"]["Enums"]["barril_status"]
          updated_at?: string
          volume_litros?: number
        }
        Update: {
          ciclos?: number
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          data_ultima_movimentacao?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string | null
          status?: Database["public"]["Enums"]["barril_status"]
          updated_at?: string
          volume_litros?: number
        }
        Relationships: [
          {
            foreignKeyName: "barris_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barris_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      chopeiras: {
        Row: {
          cliente_id: string | null
          codigo: string
          created_at: string
          data_prevista_retorno: string | null
          data_saida: string | null
          id: string
          marca_modelo: string | null
          numero_serie: string | null
          proxima_higienizacao: string | null
          status: Database["public"]["Enums"]["chopeira_status"]
          tipo: string
          torneiras: number
          ultima_higienizacao: string | null
          updated_at: string
          valor_equipamento: number
        }
        Insert: {
          cliente_id?: string | null
          codigo: string
          created_at?: string
          data_prevista_retorno?: string | null
          data_saida?: string | null
          id?: string
          marca_modelo?: string | null
          numero_serie?: string | null
          proxima_higienizacao?: string | null
          status?: Database["public"]["Enums"]["chopeira_status"]
          tipo?: string
          torneiras?: number
          ultima_higienizacao?: string | null
          updated_at?: string
          valor_equipamento?: number
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          data_prevista_retorno?: string | null
          data_saida?: string | null
          id?: string
          marca_modelo?: string | null
          numero_serie?: string | null
          proxima_higienizacao?: string | null
          status?: Database["public"]["Enums"]["chopeira_status"]
          tipo?: string
          torneiras?: number
          ultima_higienizacao?: string | null
          updated_at?: string
          valor_equipamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "chopeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cilindros: {
        Row: {
          capacidade_kg: number
          cliente_id: string | null
          codigo: string
          created_at: string
          data_saida: string | null
          id: string
          status: Database["public"]["Enums"]["cilindro_status"]
          tipo: string
          updated_at: string
        }
        Insert: {
          capacidade_kg?: number
          cliente_id?: string | null
          codigo: string
          created_at?: string
          data_saida?: string | null
          id?: string
          status?: Database["public"]["Enums"]["cilindro_status"]
          tipo?: string
          updated_at?: string
        }
        Update: {
          capacidade_kg?: number
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          data_saida?: string | null
          id?: string
          status?: Database["public"]["Enums"]["cilindro_status"]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cilindros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cep: string | null
          cidade: string | null
          condicao_pagamento: string
          contato_responsavel: string | null
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          limite_credito: number
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["cliente_status"]
          tabela_preco: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["cliente_tipo"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          condicao_pagamento?: string
          contato_responsavel?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          tabela_preco?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          condicao_pagamento?: string
          contato_responsavel?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          tabela_preco?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["cliente_tipo"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consignacoes: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega: string
          data_limite: string | null
          id: string
          movimentacao_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade_acertada: number
          quantidade_entregue: number
          status: Database["public"]["Enums"]["consignacao_status"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string
          data_limite?: string | null
          id?: string
          movimentacao_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade_acertada?: number
          quantidade_entregue?: number
          status?: Database["public"]["Enums"]["consignacao_status"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string
          data_limite?: string | null
          id?: string
          movimentacao_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade_acertada?: number
          quantidade_entregue?: number
          status?: Database["public"]["Enums"]["consignacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacoes_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          acerto_id: string | null
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          descricao: string | null
          forma: string | null
          id: string
          locacao_id: string | null
          movimentacao_id: string | null
          observacao: string | null
          origem: string
          saldo: number
          status: Database["public"]["Enums"]["conta_status"]
          updated_at: string
          valor_pago: number
          valor_total: number
          vencimento: string
        }
        Insert: {
          acerto_id?: string | null
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          forma?: string | null
          id?: string
          locacao_id?: string | null
          movimentacao_id?: string | null
          observacao?: string | null
          origem?: string
          saldo?: number
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
          vencimento?: string
        }
        Update: {
          acerto_id?: string | null
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          forma?: string | null
          id?: string
          locacao_id?: string | null
          movimentacao_id?: string | null
          observacao?: string | null
          origem?: string
          saldo?: number
          status?: Database["public"]["Enums"]["conta_status"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_acerto_id_fkey"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_locacao_id_fkey"
            columns: ["locacao_id"]
            isOneToOne: false
            referencedRelation: "locacoes_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_comodato: {
        Row: {
          chopeira_id: string | null
          cliente_id: string
          consumo_minimo_barris: number
          created_at: string
          data_inicio: string
          id: string
          status: string
          termo_url: string | null
          updated_at: string
          valor_garantia: number
          valor_multa: number
          vigencia_meses: number
        }
        Insert: {
          chopeira_id?: string | null
          cliente_id: string
          consumo_minimo_barris?: number
          created_at?: string
          data_inicio?: string
          id?: string
          status?: string
          termo_url?: string | null
          updated_at?: string
          valor_garantia?: number
          valor_multa?: number
          vigencia_meses?: number
        }
        Update: {
          chopeira_id?: string | null
          cliente_id?: string
          consumo_minimo_barris?: number
          created_at?: string
          data_inicio?: string
          id?: string
          status?: string
          termo_url?: string | null
          updated_at?: string
          valor_garantia?: number
          valor_multa?: number
          vigencia_meses?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_comodato_chopeira_id_fkey"
            columns: ["chopeira_id"]
            isOneToOne: false
            referencedRelation: "chopeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_comodato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          cnpj: string | null
          created_at: string
          dias_alerta_barril_parado: number
          dias_alerta_higienizacao: number
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          dias_alerta_barril_parado?: number
          dias_alerta_higienizacao?: number
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          dias_alerta_barril_parado?: number
          dias_alerta_higienizacao?: number
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      higienizacoes_manutencoes: {
        Row: {
          ativo_tipo: string
          barril_id: string | null
          chopeira_id: string | null
          created_at: string
          custo: number
          data: string
          descricao: string | null
          id: string
          proxima_data: string | null
          tecnico: string | null
          tipo: string
        }
        Insert: {
          ativo_tipo?: string
          barril_id?: string | null
          chopeira_id?: string | null
          created_at?: string
          custo?: number
          data?: string
          descricao?: string | null
          id?: string
          proxima_data?: string | null
          tecnico?: string | null
          tipo?: string
        }
        Update: {
          ativo_tipo?: string
          barril_id?: string | null
          chopeira_id?: string | null
          created_at?: string
          custo?: number
          data?: string
          descricao?: string | null
          id?: string
          proxima_data?: string | null
          tecnico?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "higienizacoes_manutencoes_barril_id_fkey"
            columns: ["barril_id"]
            isOneToOne: false
            referencedRelation: "barris"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "higienizacoes_manutencoes_chopeira_id_fkey"
            columns: ["chopeira_id"]
            isOneToOne: false
            referencedRelation: "chopeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      locacao_itens: {
        Row: {
          chopeira_id: string | null
          created_at: string
          id: string
          locacao_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          quantidade_consumida: number
        }
        Insert: {
          chopeira_id?: string | null
          created_at?: string
          id?: string
          locacao_id: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          quantidade_consumida?: number
        }
        Update: {
          chopeira_id?: string | null
          created_at?: string
          id?: string
          locacao_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          quantidade_consumida?: number
        }
        Relationships: [
          {
            foreignKeyName: "locacao_itens_chopeira_id_fkey"
            columns: ["chopeira_id"]
            isOneToOne: false
            referencedRelation: "chopeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locacao_itens_locacao_id_fkey"
            columns: ["locacao_id"]
            isOneToOne: false
            referencedRelation: "locacoes_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locacao_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      locacoes_eventos: {
        Row: {
          caucao_devolvida: boolean
          cliente_id: string
          created_at: string
          data_coleta: string | null
          data_entrega: string | null
          data_evento: string
          endereco_evento: string | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["locacao_status"]
          taxa_entrega: number
          updated_at: string
          valor_caucao: number
          valor_locacao: number
        }
        Insert: {
          caucao_devolvida?: boolean
          cliente_id: string
          created_at?: string
          data_coleta?: string | null
          data_entrega?: string | null
          data_evento: string
          endereco_evento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["locacao_status"]
          taxa_entrega?: number
          updated_at?: string
          valor_caucao?: number
          valor_locacao?: number
        }
        Update: {
          caucao_devolvida?: boolean
          cliente_id?: string
          created_at?: string
          data_coleta?: string | null
          data_entrega?: string | null
          data_evento?: string
          endereco_evento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["locacao_status"]
          taxa_entrega?: number
          updated_at?: string
          valor_caucao?: number
          valor_locacao?: number
        }
        Relationships: [
          {
            foreignKeyName: "locacoes_eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacao_estoque_chope: {
        Row: {
          created_at: string
          custo_unitario: number
          data: string
          id: string
          nota_fiscal: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          data?: string
          id?: string
          nota_fiscal?: string | null
          observacao?: string | null
          produto_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          data?: string
          id?: string
          nota_fiscal?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_chope_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacao_itens: {
        Row: {
          barril_id: string | null
          categoria: string
          chopeira_id: string | null
          cilindro_id: string | null
          created_at: string
          id: string
          movimentacao_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          barril_id?: string | null
          categoria?: string
          chopeira_id?: string | null
          cilindro_id?: string | null
          created_at?: string
          id?: string
          movimentacao_id: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
        }
        Update: {
          barril_id?: string | null
          categoria?: string
          chopeira_id?: string | null
          cilindro_id?: string | null
          created_at?: string
          id?: string
          movimentacao_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_itens_barril_id_fkey"
            columns: ["barril_id"]
            isOneToOne: false
            referencedRelation: "barris"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_itens_chopeira_id_fkey"
            columns: ["chopeira_id"]
            isOneToOne: false
            referencedRelation: "chopeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_itens_cilindro_id_fkey"
            columns: ["cilindro_id"]
            isOneToOne: false
            referencedRelation: "cilindros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_itens_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data: string
          estornada: boolean
          estorno_de: string | null
          id: string
          locacao_id: string | null
          natureza: Database["public"]["Enums"]["mov_natureza"]
          numero: number
          observacao: string | null
          recebido_por: string | null
          responsavel: string | null
          tipo: Database["public"]["Enums"]["mov_tipo"]
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          estornada?: boolean
          estorno_de?: string | null
          id?: string
          locacao_id?: string | null
          natureza?: Database["public"]["Enums"]["mov_natureza"]
          numero?: number
          observacao?: string | null
          recebido_por?: string | null
          responsavel?: string | null
          tipo: Database["public"]["Enums"]["mov_tipo"]
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          estornada?: boolean
          estorno_de?: string | null
          id?: string
          locacao_id?: string | null
          natureza?: Database["public"]["Enums"]["mov_natureza"]
          numero?: number
          observacao?: string | null
          recebido_por?: string | null
          responsavel?: string | null
          tipo?: Database["public"]["Enums"]["mov_tipo"]
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_locacao_id_fkey"
            columns: ["locacao_id"]
            isOneToOne: false
            referencedRelation: "locacoes_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          conta_id: string
          created_at: string
          data: string
          forma: string
          id: string
          observacao: string | null
          valor: number
        }
        Insert: {
          conta_id: string
          created_at?: string
          data?: string
          forma?: string
          id?: string
          observacao?: string | null
          valor: number
        }
        Update: {
          conta_id?: string
          created_at?: string
          data?: string
          forma?: string
          id?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_chope: {
        Row: {
          ativo: boolean
          created_at: string
          custo_barril: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          nome: string
          preco_barril: number
          preco_litro: number
          updated_at: string
          volume_litros: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_barril?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          nome: string
          preco_barril?: number
          preco_litro?: number
          updated_at?: string
          volume_litros?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_barril?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_barril?: number
          preco_litro?: number
          updated_at?: string
          volume_litros?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saldos_cliente: {
        Row: {
          barris_cheios: number
          barris_vazios: number
          cliente_id: string
          id: string
          produto_id: string
          updated_at: string
        }
        Insert: {
          barris_cheios?: number
          barris_vazios?: number
          cliente_id: string
          id?: string
          produto_id: string
          updated_at?: string
        }
        Update: {
          barris_cheios?: number
          barris_vazios?: number
          cliente_id?: string
          id?: string
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saldos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saldos_cliente_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_chope"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operacional" | "financeiro"
      barril_status:
        | "CHEIO_ESTOQUE"
        | "ENTREGUE_CLIENTE"
        | "VAZIO_NO_CLIENTE"
        | "EM_TRANSITO_RETORNO"
        | "EM_HIGIENIZACAO"
        | "MANUTENCAO"
        | "BAIXADO"
      chopeira_status:
        | "DISPONIVEL"
        | "EM_COMODATO"
        | "EM_LOCACAO"
        | "MANUTENCAO"
        | "BAIXADA"
      cilindro_status:
        | "DISPONIVEL"
        | "COM_CLIENTE"
        | "VAZIO_RETORNO"
        | "MANUTENCAO"
        | "BAIXADO"
      cliente_status: "ativo" | "inativo" | "bloqueado"
      cliente_tipo: "bar_convenio" | "evento_pf" | "avulso"
      consignacao_status: "ABERTA" | "PARCIAL" | "ACERTADA"
      conta_status: "ABERTO" | "PARCIAL" | "PAGO" | "VENCIDO"
      locacao_status:
        | "ORCAMENTO"
        | "CONFIRMADO"
        | "ENTREGUE"
        | "COLETADO"
        | "FINALIZADO"
        | "CANCELADO"
      mov_natureza: "VENDA" | "CONSIGNACAO" | "LOCACAO" | "COMODATO" | "INTERNO"
      mov_tipo:
        | "ENTREGA"
        | "COLETA"
        | "TROCA"
        | "VENDA_AVULSA"
        | "DEVOLUCAO"
        | "AJUSTE_INVENTARIO"
        | "PERDA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operacional", "financeiro"],
      barril_status: [
        "CHEIO_ESTOQUE",
        "ENTREGUE_CLIENTE",
        "VAZIO_NO_CLIENTE",
        "EM_TRANSITO_RETORNO",
        "EM_HIGIENIZACAO",
        "MANUTENCAO",
        "BAIXADO",
      ],
      chopeira_status: [
        "DISPONIVEL",
        "EM_COMODATO",
        "EM_LOCACAO",
        "MANUTENCAO",
        "BAIXADA",
      ],
      cilindro_status: [
        "DISPONIVEL",
        "COM_CLIENTE",
        "VAZIO_RETORNO",
        "MANUTENCAO",
        "BAIXADO",
      ],
      cliente_status: ["ativo", "inativo", "bloqueado"],
      cliente_tipo: ["bar_convenio", "evento_pf", "avulso"],
      consignacao_status: ["ABERTA", "PARCIAL", "ACERTADA"],
      conta_status: ["ABERTO", "PARCIAL", "PAGO", "VENCIDO"],
      locacao_status: [
        "ORCAMENTO",
        "CONFIRMADO",
        "ENTREGUE",
        "COLETADO",
        "FINALIZADO",
        "CANCELADO",
      ],
      mov_natureza: ["VENDA", "CONSIGNACAO", "LOCACAO", "COMODATO", "INTERNO"],
      mov_tipo: [
        "ENTREGA",
        "COLETA",
        "TROCA",
        "VENDA_AVULSA",
        "DEVOLUCAO",
        "AJUSTE_INVENTARIO",
        "PERDA",
      ],
    },
  },
} as const
