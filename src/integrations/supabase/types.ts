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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          area_name: string
          created_at: string
          distance: number
          from_location: string
          id: string
          to_location: string
          updated_at: string
        }
        Insert: {
          area_name: string
          created_at?: string
          distance: number
          from_location: string
          id?: string
          to_location: string
          updated_at?: string
        }
        Update: {
          area_name?: string
          created_at?: string
          distance?: number
          from_location?: string
          id?: string
          to_location?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_calls: {
        Row: {
          created_at: string
          date: string
          id: string
          mr_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          mr_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mr_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_working: {
        Row: {
          created_at: string
          distributor_id: string | null
          doctor_id: string
          id: string
          mr_id: string
          order_details: Json | null
          sample_details: Json | null
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          distributor_id?: string | null
          doctor_id: string
          id?: string
          mr_id: string
          order_details?: Json | null
          sample_details?: Json | null
          updated_at?: string
          work_date?: string
        }
        Update: {
          created_at?: string
          distributor_id?: string | null
          doctor_id?: string
          id?: string
          mr_id?: string
          order_details?: Json | null
          sample_details?: Json | null
          updated_at?: string
          work_date?: string
        }
        Relationships: []
      }
      Distributors: {
        Row: {
          address: string
          city: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          dl_number_part1: string | null
          dl_number_part2: string | null
          gstin: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          dl_number_part1?: string | null
          dl_number_part2?: string | null
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          dl_number_part1?: string | null
          dl_number_part2?: string | null
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctors: {
        Row: {
          area: string
          assigned_mr_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          monthly_target: number | null
          name: string
          specialty: string
          territory: string | null
          updated_at: string | null
        }
        Insert: {
          area: string
          assigned_mr_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          monthly_target?: number | null
          name: string
          specialty: string
          territory?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string
          assigned_mr_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          monthly_target?: number | null
          name?: string
          specialty?: string
          territory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_assigned_mr_id_fkey"
            columns: ["assigned_mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          area_id: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          mr_id: string
          other_expenses: number | null
          status: Database["public"]["Enums"]["expense_status"] | null
          travel_allowance: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          mr_id: string
          other_expenses?: number | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          travel_allowance?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          mr_id?: string
          other_expenses?: number | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          travel_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_mr_id_fkey"
            columns: ["mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mr_pharmacy_assignments: {
        Row: {
          created_at: string | null
          id: string
          mr_id: string | null
          pharmacy_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mr_id?: string | null
          pharmacy_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mr_id?: string | null
          pharmacy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mr_pharmacy_assignments_mr_id_fkey"
            columns: ["mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mr_pharmacy_assignments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "Distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          mr_id: string
          order_date: string | null
          pharmacy_id: string
          product_id: string
          quantity: number
          total_amount: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          mr_id: string
          order_date?: string | null
          pharmacy_id: string
          product_id: string
          quantity: number
          total_amount?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          mr_id?: string
          order_date?: string | null
          pharmacy_id?: string
          product_id?: string
          quantity?: number
          total_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_mr_id_fkey"
            columns: ["mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "Distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string
          city: string
          contact_person: string
          created_at: string
          created_by: string | null
          dl_number_part1: string
          dl_number_part2: string
          gstin: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          contact_person: string
          created_at?: string
          created_by?: string | null
          dl_number_part1: string
          dl_number_part2: string
          gstin?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          contact_person?: string
          created_at?: string
          created_by?: string | null
          dl_number_part1?: string
          dl_number_part2?: string
          gstin?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          product_type: string
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price: number
          product_type?: string
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          product_type?: string
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      targets: {
        Row: {
          achieved_value: number | null
          created_at: string | null
          created_by: string | null
          doctor_id: string | null
          id: string
          mr_id: string
          target_month: string
          target_type: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          achieved_value?: number | null
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          mr_id: string
          target_month: string
          target_type?: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          achieved_value?: number | null
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          mr_id?: string
          target_month?: string
          target_type?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targets_mr_id_fkey"
            columns: ["mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_target_achievement: {
        Args: { target_id_param: string }
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      expense_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "mr"
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
      expense_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "mr"],
    },
  },
} as const
