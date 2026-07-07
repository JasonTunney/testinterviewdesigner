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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      candidates: {
        Row: {
          created_at: string
          email: string | null
          hire_start_date: string | null
          hiring_manager_user_id: string | null
          id: string
          name: string
          plan_id: string
          requisition_id: string | null
          short_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hire_start_date?: string | null
          hiring_manager_user_id?: string | null
          id?: string
          name: string
          plan_id: string
          requisition_id?: string | null
          short_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hire_start_date?: string | null
          hiring_manager_user_id?: string | null
          id?: string
          name?: string
          plan_id?: string
          requisition_id?: string | null
          short_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "interview_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_config: {
        Row: {
          additional_context: string | null
          company_description: string | null
          company_name: string | null
          company_values: string | null
          competency_framework: string | null
          created_at: string
          hiring_philosophy: string | null
          id: string
          industry: string | null
          max_interview_duration_minutes: number | null
          max_questions_per_stage: number | null
          max_stages: number | null
          min_questions_per_stage: number | null
          min_stages: number | null
          org_chart_url: string | null
          org_structure: string | null
          settings_password: string
          updated_at: string
        }
        Insert: {
          additional_context?: string | null
          company_description?: string | null
          company_name?: string | null
          company_values?: string | null
          competency_framework?: string | null
          created_at?: string
          hiring_philosophy?: string | null
          id?: string
          industry?: string | null
          max_interview_duration_minutes?: number | null
          max_questions_per_stage?: number | null
          max_stages?: number | null
          min_questions_per_stage?: number | null
          min_stages?: number | null
          org_chart_url?: string | null
          org_structure?: string | null
          settings_password?: string
          updated_at?: string
        }
        Update: {
          additional_context?: string | null
          company_description?: string | null
          company_name?: string | null
          company_values?: string | null
          competency_framework?: string | null
          created_at?: string
          hiring_philosophy?: string | null
          id?: string
          industry?: string | null
          max_interview_duration_minutes?: number | null
          max_questions_per_stage?: number | null
          max_stages?: number | null
          min_questions_per_stage?: number | null
          min_stages?: number | null
          org_chart_url?: string | null
          org_structure?: string | null
          settings_password?: string
          updated_at?: string
        }
        Relationships: []
      }
      hire_ratings: {
        Row: {
          comment: string | null
          id: string
          rated_at: string
          rated_by_user_id: string
          requisition_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          id?: string
          rated_at?: string
          rated_by_user_id: string
          requisition_id: string
          score: number
        }
        Update: {
          comment?: string | null
          id?: string
          rated_at?: string
          rated_by_user_id?: string
          requisition_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "hire_ratings_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: true
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_assignments: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          person_id: string | null
          scheduled_at: string | null
          stage_id: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          person_id?: string | null
          scheduled_at?: string | null
          stage_id: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          person_id?: string | null
          scheduled_at?: string | null
          stage_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_notes: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          panelist_user_id: string
          question_index: number | null
          score: number | null
          stage_id: string
          submitted: boolean
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          panelist_user_id: string
          question_index?: number | null
          score?: number | null
          stage_id: string
          submitted?: boolean
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          panelist_user_id?: string
          question_index?: number | null
          score?: number | null
          stage_id?: string
          submitted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_plans: {
        Row: {
          created_at: string
          department: string | null
          id: string
          job_description: string | null
          job_title: string
          plan_data: Json
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          job_description?: string | null
          job_title: string
          plan_data: Json
          status?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          job_description?: string | null
          job_title?: string
          plan_data?: Json
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          profile_id: string | null
          role_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          profile_id?: string | null
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people_skills: {
        Row: {
          person_id: string
          proficiency: number
          skill_id: string
        }
        Insert: {
          person_id: string
          proficiency: number
          skill_id: string
        }
        Update: {
          person_id?: string
          proficiency?: number
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_skills_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      requisition_panelists: {
        Row: {
          person_id: string
          requisition_id: string
          user_id: string
        }
        Insert: {
          person_id: string
          requisition_id: string
          user_id: string
        }
        Update: {
          person_id?: string
          requisition_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_panelists_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_panelists_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          created_at: string
          department: string | null
          hire_start_date: string | null
          hired_email: string | null
          hired_name: string | null
          hiring_manager_user_id: string | null
          id: string
          job_title: string
          plan_id: string | null
          requisition_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          hire_start_date?: string | null
          hired_email?: string | null
          hired_name?: string | null
          hiring_manager_user_id?: string | null
          id?: string
          job_title: string
          plan_id?: string | null
          requisition_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          hire_start_date?: string | null
          hired_email?: string | null
          hired_name?: string | null
          hiring_manager_user_id?: string | null
          id?: string
          job_title?: string
          plan_id?: string | null
          requisition_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "interview_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
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
      washup_blind_scores: {
        Row: {
          id: string
          panelist_user_id: string
          score: number
          session_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          panelist_user_id: string
          score: number
          session_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          panelist_user_id?: string
          score?: number
          session_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "washup_blind_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "washup_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      washup_sessions: {
        Row: {
          ai_summary: Json | null
          candidate_id: string
          closed_at: string | null
          created_at: string
          id: string
          status: string
        }
        Insert: {
          ai_summary?: Json | null
          candidate_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          ai_summary?: Json | null
          candidate_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "washup_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      panelist_qph: {
        Row: {
          avg_score: number | null
          panelist_user_id: string | null
          rated_hires: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_short_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      session_is_closed: { Args: { _session_id: string }; Returns: boolean }
      sync_assignments_for_candidate: {
        Args: { _candidate_id: string }
        Returns: undefined
      }
      sync_requisition_panelists: {
        Args: { _requisition_id: string }
        Returns: undefined
      }
      washup_closed_for: { Args: { _candidate_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "hiring_manager" | "interviewer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "hiring_manager", "interviewer"],
    },
  },
} as const
