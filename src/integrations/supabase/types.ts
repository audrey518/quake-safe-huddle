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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          category: string
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          provider_name: string
          reminder_sent: boolean
          service_name: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          category: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          provider_name: string
          reminder_sent?: boolean
          service_name: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          category?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          provider_name?: string
          reminder_sent?: boolean
          service_name?: string
          user_id?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string
          ai_brief: string | null
          created_at: string
          floors: number
          id: string
          latitude: number | null
          longitude: number | null
          material: string
          name: string
          risk_score: number | null
          user_id: string
          year_built: number
        }
        Insert: {
          address: string
          ai_brief?: string | null
          created_at?: string
          floors: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          material: string
          name: string
          risk_score?: number | null
          user_id: string
          year_built: number
        }
        Update: {
          address?: string
          ai_brief?: string | null
          created_at?: string
          floors?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          material?: string
          name?: string
          risk_score?: number | null
          user_id?: string
          year_built?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      hazard_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          kind: string
          latitude: number
          longitude: number
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          kind: string
          latitude: number
          longitude: number
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          kind?: string
          latitude?: number
          longitude?: number
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          telegram_chat_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          telegram_chat_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          price: number | null
          provider_name: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          price?: number | null
          provider_name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          price?: number | null
          provider_name?: string
          user_id?: string
        }
        Relationships: []
      }
      soil_data: {
        Row: {
          created_at: string
          depth_m: number
          id: string
          latitude: number
          layers: Json | null
          longitude: number
          notes: string | null
          soil_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth_m: number
          id?: string
          latitude: number
          layers?: Json | null
          longitude: number
          notes?: string | null
          soil_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth_m?: number
          id?: string
          latitude?: number
          layers?: Json | null
          longitude?: number
          notes?: string | null
          soil_type?: string
          user_id?: string
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
      well_readings: {
        Row: {
          created_at: string
          id: string
          level_m: number
          measured_at: string
          user_id: string
          well_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_m: number
          measured_at?: string
          user_id: string
          well_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level_m?: number
          measured_at?: string
          user_id?: string
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "well_readings_well_id_fkey"
            columns: ["well_id"]
            isOneToOne: false
            referencedRelation: "wells"
            referencedColumns: ["id"]
          },
        ]
      }
      wells: {
        Row: {
          ai_brief: string | null
          created_at: string
          current_level_m: number | null
          id: string
          latitude: number
          longitude: number
          measured_at: string | null
          name: string
          photo_url: string | null
          total_depth_m: number
          user_id: string
          well_type: string
        }
        Insert: {
          ai_brief?: string | null
          created_at?: string
          current_level_m?: number | null
          id?: string
          latitude: number
          longitude: number
          measured_at?: string | null
          name: string
          photo_url?: string | null
          total_depth_m: number
          user_id: string
          well_type: string
        }
        Update: {
          ai_brief?: string | null
          created_at?: string
          current_level_m?: number | null
          id?: string
          latitude?: number
          longitude?: number
          measured_at?: string | null
          name?: string
          photo_url?: string | null
          total_depth_m?: number
          user_id?: string
          well_type?: string
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
      app_role: "local" | "professional"
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
      app_role: ["local", "professional"],
    },
  },
} as const
