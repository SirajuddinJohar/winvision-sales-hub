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
      area_doctor_visits: {
        Row: {
          area_id: string
          created_at: string
          created_by: string
          doctor_id: string
          id: string
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          created_by: string
          doctor_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          created_by?: string
          doctor_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_doctor_visits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_doctor_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
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
          location: Json | null
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
          location?: Json | null
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
          location?: Json | null
          mr_id?: string
          order_details?: Json | null
          sample_details?: Json | null
          updated_at?: string
          work_date?: string
        }
        Relationships: []
      }
      distributor_products: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          product_id: string
          ptr: number
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          product_id: string
          ptr?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          product_id?: string
          ptr?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_products_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "Distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      doctor_pharmacy_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          doctor_id: string
          id: string
          pharmacy_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doctor_id: string
          id?: string
          pharmacy_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          id?: string
          pharmacy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_pharmacy_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_pharmacy_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_pharmacy_assignments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_visit_notes: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          mr_id: string
          notes: string | null
          tags: string[] | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          mr_id: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          mr_id?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_visit_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_visit_notes_mr_id_fkey"
            columns: ["mr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          anniversary: string | null
          area: string
          assigned_mr_id: string | null
          birthday: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_visit_date: string | null
          location: Json | null
          monthly_target: number | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          prescribing_preferences: Json | null
          relationship_score: number | null
          specialty: string
          tags: string[] | null
          territory: string | null
          updated_at: string | null
        }
        Insert: {
          anniversary?: string | null
          area: string
          assigned_mr_id?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_visit_date?: string | null
          location?: Json | null
          monthly_target?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          prescribing_preferences?: Json | null
          relationship_score?: number | null
          specialty: string
          tags?: string[] | null
          territory?: string | null
          updated_at?: string | null
        }
        Update: {
          anniversary?: string | null
          area?: string
          assigned_mr_id?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_visit_date?: string | null
          location?: Json | null
          monthly_target?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          prescribing_preferences?: Json | null
          relationship_score?: number | null
          specialty?: string
          tags?: string[] | null
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
          last_order_amount: number | null
          last_order_date: string | null
          name: string
          phone: string
          photo_url: string | null
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
          last_order_amount?: number | null
          last_order_date?: string | null
          name: string
          phone: string
          photo_url?: string | null
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
          last_order_amount?: number | null
          last_order_date?: string | null
          name?: string
          phone?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prescription_tracking: {
        Row: {
          created_at: string
          doctor_id: string
          frequency_count: number
          id: string
          last_prescribed_date: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          frequency_count?: number
          id?: string
          last_prescribed_date?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          frequency_count?: number
          id?: string
          last_prescribed_date?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_tracking_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      secondary_sales: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          distributor_id: string
          id: string
          image_url: string | null
          sales_month: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          distributor_id: string
          id?: string
          image_url?: string | null
          sales_month: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          distributor_id?: string
          id?: string
          image_url?: string | null
          sales_month?: string
          updated_at?: string
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
      tour_plan_days: {
        Row: {
          areas: Json | null
          created_at: string
          date: number
          id: string
          is_holiday: boolean | null
          is_weekly_off: boolean | null
          remarks: string | null
          tour_plan_id: string
          updated_at: string
        }
        Insert: {
          areas?: Json | null
          created_at?: string
          date: number
          id?: string
          is_holiday?: boolean | null
          is_weekly_off?: boolean | null
          remarks?: string | null
          tour_plan_id: string
          updated_at?: string
        }
        Update: {
          areas?: Json | null
          created_at?: string
          date?: number
          id?: string
          is_holiday?: boolean | null
          is_weekly_off?: boolean | null
          remarks?: string | null
          tour_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_plan_days_tour_plan_id_fkey"
            columns: ["tour_plan_id"]
            isOneToOne: false
            referencedRelation: "tour_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_plan_edit_requests: {
        Row: {
          admin_id: string | null
          admin_remarks: string | null
          admin_response_at: string | null
          created_at: string
          id: string
          request_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["edit_request_status"]
          tour_plan_id: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_remarks?: string | null
          admin_response_at?: string | null
          created_at?: string
          id?: string
          request_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["edit_request_status"]
          tour_plan_id: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_remarks?: string | null
          admin_response_at?: string | null
          created_at?: string
          id?: string
          request_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["edit_request_status"]
          tour_plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_plan_edit_requests_tour_plan_id_fkey"
            columns: ["tour_plan_id"]
            isOneToOne: false
            referencedRelation: "tour_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_plans: {
        Row: {
          approval_message: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          edit_until: string | null
          id: string
          locked_at: string | null
          month: number
          status: Database["public"]["Enums"]["tour_plan_status"]
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          approval_message?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          edit_until?: string | null
          id?: string
          locked_at?: string | null
          month: number
          status?: Database["public"]["Enums"]["tour_plan_status"]
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          approval_message?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          edit_until?: string | null
          id?: string
          locked_at?: string | null
          month?: number
          status?: Database["public"]["Enums"]["tour_plan_status"]
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_doctor_relationship_score: {
        Args: { doctor_id_param: string }
        Returns: number
      }
      calculate_target_achievement: {
        Args: { target_id_param: string }
        Returns: number
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      edit_request_status: "pending" | "approved" | "rejected"
      expense_status: "pending" | "approved" | "rejected"
      tour_plan_status: "draft" | "locked" | "approved"
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
      edit_request_status: ["pending", "approved", "rejected"],
      expense_status: ["pending", "approved", "rejected"],
      tour_plan_status: ["draft", "locked", "approved"],
      user_role: ["admin", "mr"],
    },
  },
} as const
