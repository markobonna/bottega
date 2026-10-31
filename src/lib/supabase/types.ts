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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          app_id: string | null
          created_at: string | null
          id: string
          ops: Json | null
          owner: string
          source: string | null
          spec: Json | null
          summary: string | null
          version: number | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          ops?: Json | null
          owner?: string
          source?: string | null
          spec?: Json | null
          summary?: string | null
          version?: number | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          ops?: Json | null
          owner?: string
          source?: string | null
          spec?: Json | null
          summary?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          arrival_seen: boolean
          arrive_at: string | null
          blueprint_path: string | null
          created_at: string | null
          id: string
          kind: string
          look_path: string | null
          name: string
          order_info: Json | null
          owner: string
          position: number
          private: boolean
          spec: Json
          stage: string | null
          updated_at: string | null
          version: number
          workshop_id: string
        }
        Insert: {
          arrival_seen?: boolean
          arrive_at?: string | null
          blueprint_path?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          look_path?: string | null
          name: string
          order_info?: Json | null
          owner?: string
          position?: number
          private?: boolean
          spec: Json
          stage?: string | null
          updated_at?: string | null
          version?: number
          workshop_id: string
        }
        Update: {
          arrival_seen?: boolean
          arrive_at?: string | null
          blueprint_path?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          look_path?: string | null
          name?: string
          order_info?: Json | null
          owner?: string
          position?: number
          private?: boolean
          spec?: Json
          stage?: string | null
          updated_at?: string | null
          version?: number
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_requests: {
        Row: {
          app_id: string | null
          created_at: string | null
          email: string
          id: string
          note: string
          owner: string
          status: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          note?: string
          owner?: string
          status?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          note?: string
          owner?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_requests_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          app_id: string | null
          created_at: string | null
          detail: Json | null
          id: string
          kind: string | null
          owner: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          kind?: string | null
          owner?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          kind?: string | null
          owner?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      examples: {
        Row: {
          created_at: string | null
          id: string
          model_id: string | null
          owner: string
          photo_path: string | null
          x: number[] | null
          y: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          owner?: string
          photo_path?: string | null
          x?: number[] | null
          y?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          owner?: string
          photo_path?: string | null
          x?: number[] | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "examples_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          app_id: string | null
          b: number | null
          block_id: string | null
          created_at: string | null
          curve: number[] | null
          dims: Json | null
          feature_source: string | null
          id: string
          labels: string[] | null
          owner: string
          rounds: number | null
          w: number[] | null
        }
        Insert: {
          app_id?: string | null
          b?: number | null
          block_id?: string | null
          created_at?: string | null
          curve?: number[] | null
          dims?: Json | null
          feature_source?: string | null
          id?: string
          labels?: string[] | null
          owner?: string
          rounds?: number | null
          w?: number[] | null
        }
        Update: {
          app_id?: string | null
          b?: number | null
          block_id?: string | null
          created_at?: string | null
          curve?: number[] | null
          dims?: Json | null
          feature_source?: string | null
          id?: string
          labels?: string[] | null
          owner?: string
          rounds?: number | null
          w?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "models_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_features: {
        Row: {
          created_at: string | null
          owner: string
          photo_path: string
          source: string
          x: number[]
        }
        Insert: {
          created_at?: string | null
          owner?: string
          photo_path: string
          source: string
          x: number[]
        }
        Update: {
          created_at?: string | null
          owner?: string
          photo_path?: string
          source?: string
          x?: number[]
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          app_id: string | null
          created_at: string | null
          id: string
          owner: string
          part: number | null
          text: string
          topic: string | null
          who: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          owner?: string
          part?: number | null
          text: string
          topic?: string | null
          who: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          owner?: string
          part?: number | null
          text?: string
          topic?: string | null
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          app_id: string | null
          collection: string | null
          created_at: string | null
          data: Json
          id: string
          owner: string
        }
        Insert: {
          app_id?: string | null
          collection?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          owner?: string
        }
        Update: {
          app_id?: string | null
          collection?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          owner?: string
        }
        Relationships: [
          {
            foreignKeyName: "records_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          app_id: string | null
          created_at: string | null
          id: string
          owner: string
          record_id: string | null
          revoked: boolean
          token: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          owner?: string
          record_id?: string | null
          revoked?: boolean
          token: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          owner?: string
          record_id?: string | null
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
