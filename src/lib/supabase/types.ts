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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      athlete_badges: {
        Row: {
          athlete_id: string
          badge_key: string
          context: Json | null
          created_at: string
          description: string
          earned_at: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          athlete_id: string
          badge_key: string
          context?: Json | null
          created_at?: string
          description: string
          earned_at?: string
          icon: string
          id?: string
          title: string
        }
        Update: {
          athlete_id?: string
          badge_key?: string
          context?: Json | null
          created_at?: string
          description?: string
          earned_at?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_badges_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_consents: {
        Row: {
          athlete_id: string
          consented_at: string | null
          health_consent: boolean
          terms_accepted: boolean
          updated_at: string
        }
        Insert: {
          athlete_id: string
          consented_at?: string | null
          health_consent?: boolean
          terms_accepted?: boolean
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          consented_at?: string | null
          health_consent?: boolean
          terms_accepted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_feedback: {
        Row: {
          actual_value: string | null
          athlete_id: string
          done: boolean
          id: string
          note: string | null
          training_plan_item_id: string
          updated_at: string
        }
        Insert: {
          actual_value?: string | null
          athlete_id: string
          done?: boolean
          id?: string
          note?: string | null
          training_plan_item_id: string
          updated_at?: string
        }
        Update: {
          actual_value?: string | null
          athlete_id?: string
          done?: boolean
          id?: string
          note?: string | null
          training_plan_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_feedback_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_feedback_training_plan_item_id_fkey"
            columns: ["training_plan_item_id"]
            isOneToOne: false
            referencedRelation: "training_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_notes: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          trainer_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          trainer_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_notes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          athlete_id: string | null
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: string
          group_id: string | null
          id: string
          series_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          all_day?: boolean
          athlete_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          group_id?: string | null
          id?: string
          series_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          all_day?: boolean
          athlete_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          group_id?: string | null
          id?: string
          series_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_instructions: {
        Row: {
          exercise_id: string
          id: string
          short_summary: string | null
          steps: string[]
          updated_at: string
          updated_by: string | null
          video_label: string | null
          video_url: string | null
          watch_note: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          short_summary?: string | null
          steps?: string[]
          updated_at?: string
          updated_by?: string | null
          video_label?: string | null
          video_url?: string | null
          watch_note?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          short_summary?: string | null
          steps?: string[]
          updated_at?: string
          updated_by?: string | null
          video_label?: string | null
          video_url?: string | null
          watch_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_instructions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: true
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_instructions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_results: {
        Row: {
          athlete_id: string
          created_at: string
          date: string
          exercise_id: string
          id: string
          reps: number | null
          rir: number | null
          set_number: number
          set_type: string
          status: string | null
          training_plan_id: string | null
          unit: string | null
          updated_at: string
          value: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          date: string
          exercise_id: string
          id?: string
          reps?: number | null
          rir?: number | null
          set_number?: number
          set_type?: string
          status?: string | null
          training_plan_id?: string | null
          unit?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          date?: string
          exercise_id?: string
          id?: string
          reps?: number | null
          rir?: number | null
          set_number?: number
          set_type?: string
          status?: string | null
          training_plan_id?: string | null
          unit?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_athletes: {
        Row: {
          athlete_id: string
          group_id: string
        }
        Insert: {
          athlete_id: string
          group_id: string
        }
        Update: {
          athlete_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_athletes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trainers: {
        Row: {
          group_id: string
          is_head: boolean
          trainer_id: string
        }
        Insert: {
          group_id: string
          is_head?: boolean
          trainer_id: string
        }
        Update: {
          group_id?: string
          is_head?: boolean
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_trainers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_trainers_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_logs: {
        Row: {
          athlete_id: string
          created_at: string
          date: string
          hrv: number | null
          id: string
          resting_hr: number | null
          wellbeing: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          date: string
          hrv?: number | null
          id?: string
          resting_hr?: number | null
          wellbeing?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          date?: string
          hrv?: number | null
          id?: string
          resting_hr?: number | null
          wellbeing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          kind: string
          summary: string
          training_plan_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          kind: string
          summary: string
          training_plan_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          kind?: string
          summary?: string
          training_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_log_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_item_overrides: {
        Row: {
          athlete_id: string
          created_by: string | null
          id: string
          override_value: string | null
          reason: string | null
          skipped: boolean
          training_plan_item_id: string
          until_date: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_by?: string | null
          id?: string
          override_value?: string | null
          reason?: string | null
          skipped?: boolean
          training_plan_item_id: string
          until_date?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_by?: string | null
          id?: string
          override_value?: string | null
          reason?: string | null
          skipped?: boolean
          training_plan_item_id?: string
          until_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_item_overrides_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_item_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_item_overrides_training_plan_item_id_fkey"
            columns: ["training_plan_item_id"]
            isOneToOne: false
            referencedRelation: "training_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          category_label: string
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          items: Json
          title: string
          usage_note: string | null
        }
        Insert: {
          category_label: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          items?: Json
          title: string
          usage_note?: string | null
        }
        Update: {
          category_label?: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          items?: Json
          title?: string
          usage_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          must_change_password?: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      session_ratings: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          rpe: number
          training_plan_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          rpe: number
          training_plan_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          rpe?: number
          training_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_ratings_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ratings_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_items: {
        Row: {
          created_at: string
          description: string | null
          duration_mode: string | null
          exercise_id: string | null
          exercise_name: string
          heart_rate_off: string | null
          heart_rate_on: string | null
          id: string
          link_url: string | null
          notes: string | null
          position: number
          reps_or_duration: string | null
          rest_time: string | null
          round_rest: string | null
          section: string
          sets: string | null
          training_plan_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_mode?: string | null
          exercise_id?: string | null
          exercise_name: string
          heart_rate_off?: string | null
          heart_rate_on?: string | null
          id?: string
          link_url?: string | null
          notes?: string | null
          position?: number
          reps_or_duration?: string | null
          rest_time?: string | null
          round_rest?: string | null
          section?: string
          sets?: string | null
          training_plan_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_mode?: string | null
          exercise_id?: string | null
          exercise_name?: string
          heart_rate_off?: string | null
          heart_rate_on?: string | null
          id?: string
          link_url?: string | null
          notes?: string | null
          position?: number
          reps_or_duration?: string | null
          rest_time?: string | null
          round_rest?: string | null
          section?: string
          sets?: string | null
          training_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          athlete_id: string | null
          category_label: string
          created_at: string
          created_by: string | null
          date: string
          group_id: string | null
          id: string
          scope_type: Database["public"]["Enums"]["plan_scope"]
          series_id: string | null
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          category_label?: string
          created_at?: string
          created_by?: string | null
          date: string
          group_id?: string | null
          id?: string
          scope_type: Database["public"]["Enums"]["plan_scope"]
          series_id?: string | null
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          category_label?: string
          created_at?: string
          created_by?: string | null
          date?: string
          group_id?: string | null
          id?: string
          scope_type?: Database["public"]["Enums"]["plan_scope"]
          series_id?: string | null
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      replace_training_plan_items: {
        Args: { p_items: Json; p_plan_id: string }
        Returns: {
          created_at: string
          description: string | null
          duration_mode: string | null
          exercise_id: string | null
          exercise_name: string
          heart_rate_off: string | null
          heart_rate_on: string | null
          id: string
          link_url: string | null
          notes: string | null
          position: number
          reps_or_duration: string | null
          rest_time: string | null
          round_rest: string | null
          section: string
          sets: string | null
          training_plan_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "training_plan_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      event_status: "proposed" | "confirmed"
      plan_scope: "group" | "athlete"
      user_role: "admin" | "trainer" | "athlete"
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
      event_status: ["proposed", "confirmed"],
      plan_scope: ["group", "athlete"],
      user_role: ["admin", "trainer", "athlete"],
    },
  },
} as const
