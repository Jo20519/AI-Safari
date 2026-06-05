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
      audit_logs: {
        Row: {
          action_type: string
          chama_id: string
          created_at: string
          description: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action_type: string
          chama_id: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action_type?: string
          chama_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      chamas: {
        Row: {
          contribution_amount: number
          created_at: string
          created_by: string
          custom_frequency: string
          description: string
          frequency: Database["public"]["Enums"]["chama_frequency"]
          grace_period_days: number
          id: string
          investment_profile: Database["public"]["Enums"]["investment_profile"]
          name: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          penalty_value: number
          voting_custom_percent: number
          voting_rule: Database["public"]["Enums"]["voting_rule"]
        }
        Insert: {
          contribution_amount?: number
          created_at?: string
          created_by: string
          custom_frequency?: string
          description?: string
          frequency?: Database["public"]["Enums"]["chama_frequency"]
          grace_period_days?: number
          id?: string
          investment_profile?: Database["public"]["Enums"]["investment_profile"]
          name: string
          penalty_type?: Database["public"]["Enums"]["penalty_type"]
          penalty_value?: number
          voting_custom_percent?: number
          voting_rule?: Database["public"]["Enums"]["voting_rule"]
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          created_by?: string
          custom_frequency?: string
          description?: string
          frequency?: Database["public"]["Enums"]["chama_frequency"]
          grace_period_days?: number
          id?: string
          investment_profile?: Database["public"]["Enums"]["investment_profile"]
          name?: string
          penalty_type?: Database["public"]["Enums"]["penalty_type"]
          penalty_value?: number
          voting_custom_percent?: number
          voting_rule?: Database["public"]["Enums"]["voting_rule"]
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          chama_id: string
          created_at: string
          id: string
          note: string
          recorded_by: string
          source: Database["public"]["Enums"]["contribution_source"]
          type: Database["public"]["Enums"]["contribution_type"]
          user_id: string
        }
        Insert: {
          amount: number
          chama_id: string
          created_at?: string
          id?: string
          note?: string
          recorded_by: string
          source?: Database["public"]["Enums"]["contribution_source"]
          type?: Database["public"]["Enums"]["contribution_type"]
          user_id: string
        }
        Update: {
          amount?: number
          chama_id?: string
          created_at?: string
          id?: string
          note?: string
          recorded_by?: string
          source?: Database["public"]["Enums"]["contribution_source"]
          type?: Database["public"]["Enums"]["contribution_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          chama_id: string
          created_at: string
          full_name: string
          id: string
          invited_by: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          chama_id: string
          created_at?: string
          full_name?: string
          id?: string
          invited_by: string
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          chama_id?: string
          created_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          chama_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          chama_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          chama_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          national_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          national_id?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          national_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          category: string
          chama_id: string
          closes_at: string | null
          created_at: string
          created_by: string
          custom_percent: number
          description: string
          id: string
          rule: Database["public"]["Enums"]["voting_rule"]
          status: string
          title: string
        }
        Insert: {
          category?: string
          chama_id: string
          closes_at?: string | null
          created_at?: string
          created_by: string
          custom_percent?: number
          description?: string
          id?: string
          rule?: Database["public"]["Enums"]["voting_rule"]
          status?: string
          title: string
        }
        Update: {
          category?: string
          chama_id?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string
          custom_percent?: number
          description?: string
          id?: string
          rule?: Database["public"]["Enums"]["voting_rule"]
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          chama_id: string
          created_at: string
          explanation: string
          factors: Json
          id: string
          score: number
          user_id: string
        }
        Insert: {
          chama_id: string
          created_at?: string
          explanation?: string
          factors?: Json
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          chama_id?: string
          created_at?: string
          explanation?: string
          factors?: Json
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          chama_id: string
          choice: string
          created_at: string
          id: string
          proposal_id: string
          user_id: string
        }
        Insert: {
          chama_id: string
          choice: string
          created_at?: string
          id?: string
          proposal_id: string
          user_id: string
        }
        Update: {
          chama_id?: string
          choice?: string
          created_at?: string
          id?: string
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          chairperson_id: string | null
          chama_id: string
          created_at: string
          fund_type: Database["public"]["Enums"]["contribution_type"]
          id: string
          reason: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          treasurer_id: string | null
          treasurer_note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          chairperson_id?: string | null
          chama_id: string
          created_at?: string
          fund_type?: Database["public"]["Enums"]["contribution_type"]
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          treasurer_id?: string | null
          treasurer_note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          chairperson_id?: string | null
          chama_id?: string
          created_at?: string
          fund_type?: Database["public"]["Enums"]["contribution_type"]
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          treasurer_id?: string | null
          treasurer_note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_chama_role: {
        Args: {
          _chama: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      is_chama_member: {
        Args: { _chama: string; _user: string }
        Returns: boolean
      }
      join_chama_with_token: { Args: { _token: string }; Returns: string }
      shares_chama: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      app_role: "chairperson" | "treasurer" | "member"
      chama_frequency:
        | "daily"
        | "every_two_days"
        | "weekly"
        | "monthly"
        | "custom"
      contribution_source: "mpesa" | "manual"
      contribution_type: "regular" | "emergency" | "investment"
      investment_profile: "conservative" | "moderate" | "aggressive"
      penalty_type: "fixed" | "percentage" | "custom"
      voting_rule: "simple_majority" | "two_thirds" | "custom"
      withdrawal_status:
        | "pending"
        | "treasurer_reviewed"
        | "approved"
        | "rejected"
        | "released"
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
      app_role: ["chairperson", "treasurer", "member"],
      chama_frequency: [
        "daily",
        "every_two_days",
        "weekly",
        "monthly",
        "custom",
      ],
      contribution_source: ["mpesa", "manual"],
      contribution_type: ["regular", "emergency", "investment"],
      investment_profile: ["conservative", "moderate", "aggressive"],
      penalty_type: ["fixed", "percentage", "custom"],
      voting_rule: ["simple_majority", "two_thirds", "custom"],
      withdrawal_status: [
        "pending",
        "treasurer_reviewed",
        "approved",
        "rejected",
        "released",
      ],
    },
  },
} as const
