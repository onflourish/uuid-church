export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_key: {
        Row: {
          created_at: string
          id: string
          name: string
          requests_per_minute: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          requests_per_minute?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          requests_per_minute?: number
        }
        Relationships: []
      }
      church: {
        Row: {
          activity: number | null
          affiliation: number
          city: string | null
          classification: string | null
          created_at: string
          ein: number
          foundation: number | null
          id: string
          name: string
          ntee: string
          state: string | null
          street: string | null
          subsection: number
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          activity?: number | null
          affiliation: number
          city?: string | null
          classification?: string | null
          created_at?: string
          ein: number
          foundation?: number | null
          id?: string
          name: string
          ntee: string
          state?: string | null
          street?: string | null
          subsection: number
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          activity?: number | null
          affiliation?: number
          city?: string | null
          classification?: string | null
          created_at?: string
          ein?: number
          foundation?: number | null
          id?: string
          name?: string
          ntee?: string
          state?: string | null
          street?: string | null
          subsection?: number
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      church_embedding: {
        Row: {
          church_id: string
          city_embedding: string | null
          created_at: string
          full_embedding: string
          id: string
          name_embedding: string | null
          street_embedding: string | null
          updated_at: string | null
          website_embedding: string | null
        }
        Insert: {
          church_id: string
          city_embedding?: string | null
          created_at?: string
          full_embedding: string
          id?: string
          name_embedding?: string | null
          street_embedding?: string | null
          updated_at?: string | null
          website_embedding?: string | null
        }
        Update: {
          church_id?: string
          city_embedding?: string | null
          created_at?: string
          full_embedding?: string
          id?: string
          name_embedding?: string | null
          street_embedding?: string | null
          updated_at?: string | null
          website_embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "church_embedding_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: true
            referencedRelation: "church"
            referencedColumns: ["id"]
          },
        ]
      }
      request: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          request_data: Json | null
          response_data: Json | null
          type: string
        }
        Insert: {
          api_key_id?: string
          created_at?: string
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          type?: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_key"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_churches: {
        Args: {
          query_full_embedding: string
          query_name_embedding?: string
          query_street_embedding?: string
          query_city_embedding?: string
          query_website_embedding?: string
          name_weight?: number
          street_weight?: number
          city_weight?: number
          website_weight?: number
          full_weight?: number
          similarity_threshold?: number
          search_state?: string
          search_city?: string
          match_count?: number
        }
        Returns: {
          id: string
          name: string
          ein: number
          street: string
          city: string
          state: string
          zip: string
          website: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
