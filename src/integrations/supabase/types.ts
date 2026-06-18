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
      clientes: {
        Row: {
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          rg: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      comissoes: {
        Row: {
          administradora: string | null
          cota_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string | null
          observacoes: string | null
          primeira_parcela: number | null
          segunda_parcela: number | null
          status_pagamento: Database["public"]["Enums"]["comissao_status"]
          terceira_parcela: number | null
          total: number | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          administradora?: string | null
          cota_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          primeira_parcela?: number | null
          segunda_parcela?: number | null
          status_pagamento?: Database["public"]["Enums"]["comissao_status"]
          terceira_parcela?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          administradora?: string | null
          cota_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          primeira_parcela?: number | null
          segunda_parcela?: number | null
          status_pagamento?: Database["public"]["Enums"]["comissao_status"]
          terceira_parcela?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotas: {
        Row: {
          administradora: string | null
          assembleia: string | null
          cliente_id: string | null
          contemplada: boolean
          cota: string | null
          created_at: string
          data_adesao: string | null
          data_contemplacao: string | null
          empresa: string | null
          fdi_assinado: boolean
          grupo: string | null
          id: string
          observacoes: string | null
          proposta: string | null
          qtd_parcelas: number | null
          status: Database["public"]["Enums"]["cota_status"]
          updated_at: string
          valor_credito: number | null
          valor_parcela: number | null
          vencimento: number | null
          vendedor_id: string | null
        }
        Insert: {
          administradora?: string | null
          assembleia?: string | null
          cliente_id?: string | null
          contemplada?: boolean
          cota?: string | null
          created_at?: string
          data_adesao?: string | null
          data_contemplacao?: string | null
          empresa?: string | null
          fdi_assinado?: boolean
          grupo?: string | null
          id?: string
          observacoes?: string | null
          proposta?: string | null
          qtd_parcelas?: number | null
          status?: Database["public"]["Enums"]["cota_status"]
          updated_at?: string
          valor_credito?: number | null
          valor_parcela?: number | null
          vencimento?: number | null
          vendedor_id?: string | null
        }
        Update: {
          administradora?: string | null
          assembleia?: string | null
          cliente_id?: string | null
          contemplada?: boolean
          cota?: string | null
          created_at?: string
          data_adesao?: string | null
          data_contemplacao?: string | null
          empresa?: string | null
          fdi_assinado?: boolean
          grupo?: string | null
          id?: string
          observacoes?: string | null
          proposta?: string | null
          qtd_parcelas?: number | null
          status?: Database["public"]["Enums"]["cota_status"]
          updated_at?: string
          valor_credito?: number | null
          valor_parcela?: number | null
          vencimento?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          arquivo: string | null
          created_at: string
          detalhes: Json | null
          erros: number | null
          id: string
          linhas_processadas: number | null
          registros_atualizados: number | null
          registros_criados: number | null
          usuario_id: string | null
        }
        Insert: {
          arquivo?: string | null
          created_at?: string
          detalhes?: Json | null
          erros?: number | null
          id?: string
          linhas_processadas?: number | null
          registros_atualizados?: number | null
          registros_criados?: number | null
          usuario_id?: string | null
        }
        Update: {
          arquivo?: string | null
          created_at?: string
          detalhes?: Json | null
          erros?: number | null
          id?: string
          linhas_processadas?: number | null
          registros_atualizados?: number | null
          registros_criados?: number | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          cota_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          numero: number
          observacoes: string | null
          status: Database["public"]["Enums"]["parcela_status"]
          updated_at: string
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          cota_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["parcela_status"]
          updated_at?: string
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          cota_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["parcela_status"]
          updated_at?: string
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
      vendedores: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          meta_mensal: number | null
          nome: string
          percentual_comissao: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          meta_mensal?: number | null
          nome: string
          percentual_comissao?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          meta_mensal?: number | null
          nome?: string
          percentual_comissao?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "vendedor" | "consulta"
      comissao_status: "pendente" | "parcial" | "paga" | "cancelada"
      cota_status:
        | "ativa"
        | "aguardando_pagamento"
        | "aguardando_estorno"
        | "finalizada"
        | "estorno_realizado"
        | "contemplada"
        | "cancelada"
      parcela_status: "paga" | "em_aberto" | "atrasada" | "cancelada"
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
      app_role: ["admin", "gerente", "vendedor", "consulta"],
      comissao_status: ["pendente", "parcial", "paga", "cancelada"],
      cota_status: [
        "ativa",
        "aguardando_pagamento",
        "aguardando_estorno",
        "finalizada",
        "estorno_realizado",
        "contemplada",
        "cancelada",
      ],
      parcela_status: ["paga", "em_aberto", "atrasada", "cancelada"],
    },
  },
} as const
