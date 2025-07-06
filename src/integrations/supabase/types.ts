export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidate_interviews: {
        Row: {
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          interview_data: Json | null
          interview_messages: Json | null
          job_id: string
          score: number | null
          stage: Database["public"]["Enums"]["interview_stage"]
          started_at: string | null
          updated_at: string
          verdict: string | null
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_data?: Json | null
          interview_messages?: Json | null
          job_id: string
          score?: number | null
          stage?: Database["public"]["Enums"]["interview_stage"]
          started_at?: string | null
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_data?: Json | null
          interview_messages?: Json | null
          job_id?: string
          score?: number | null
          stage?: Database["public"]["Enums"]["interview_stage"]
          started_at?: string | null
          updated_at?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_responses: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          message: string | null
          responded_at: string
          response_type: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          responded_at?: string
          response_type?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          responded_at?: string
          response_type?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_responses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          company: string | null
          created_at: string
          current_position: string | null
          education: Json | null
          email: string
          experience_years: number | null
          id: string
          interview_stage: Database["public"]["Enums"]["interview_stage"] | null
          last_synced_at: string | null
          linkedin_id: string | null
          linkedin_profile_url: string | null
          location: string | null
          name: string
          phone: string | null
          profile_completeness_score: number | null
          profile_picture_url: string | null
          skills: Json | null
          source_platform: string | null
          updated_at: string
          workable_candidate_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          current_position?: string | null
          education?: Json | null
          email: string
          experience_years?: number | null
          id?: string
          interview_stage?:
            | Database["public"]["Enums"]["interview_stage"]
            | null
          last_synced_at?: string | null
          linkedin_id?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          name: string
          phone?: string | null
          profile_completeness_score?: number | null
          profile_picture_url?: string | null
          skills?: Json | null
          source_platform?: string | null
          updated_at?: string
          workable_candidate_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          current_position?: string | null
          education?: Json | null
          email?: string
          experience_years?: number | null
          id?: string
          interview_stage?:
            | Database["public"]["Enums"]["interview_stage"]
            | null
          last_synced_at?: string | null
          linkedin_id?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          profile_completeness_score?: number | null
          profile_picture_url?: string | null
          skills?: Json | null
          source_platform?: string | null
          updated_at?: string
          workable_candidate_id?: string | null
        }
        Relationships: []
      }
      crawled_jobs: {
        Row: {
          company: string
          crawled_at: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          job_type: string | null
          location: string | null
          posted_date: string | null
          salary: string | null
          source: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          company: string
          crawled_at?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          salary?: string | null
          source?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          company?: string
          crawled_at?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          salary?: string | null
          source?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string
          description: string | null
          html_template: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_template: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          api_rate_limit_remaining: number | null
          api_rate_limit_reset_at: string | null
          created_at: string
          id: string
          integration_type: string
          is_enabled: boolean | null
          last_sync_at: string | null
          settings: Json | null
          sync_frequency_hours: number | null
          updated_at: string
        }
        Insert: {
          api_rate_limit_remaining?: number | null
          api_rate_limit_reset_at?: string | null
          created_at?: string
          id?: string
          integration_type: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          settings?: Json | null
          sync_frequency_hours?: number | null
          updated_at?: string
        }
        Update: {
          api_rate_limit_remaining?: number | null
          api_rate_limit_reset_at?: string | null
          created_at?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          settings?: Json | null
          sync_frequency_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          integration_type: string
          status: string
          sync_type: string
          synced_data: Json | null
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_type: string
          status?: string
          sync_type: string
          synced_data?: Json | null
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_type?: string
          status?: string
          sync_type?: string
          synced_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      jobadder_tokens: {
        Row: {
          access_token: string
          api_base_url: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scopes: string[]
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          api_base_url?: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          api_base_url?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobadder_user_permissions: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          scope: Database["public"]["Enums"]["jobadder_scope"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          scope: Database["public"]["Enums"]["jobadder_scope"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          scope?: Database["public"]["Enums"]["jobadder_scope"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobadder_user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobadder_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobadder_users: {
        Row: {
          assigned_jobs: string[] | null
          created_at: string | null
          id: string
          jobadder_email: string
          jobadder_role: Database["public"]["Enums"]["jobadder_scope"]
          jobadder_user_id: string
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_jobs?: string[] | null
          created_at?: string | null
          id?: string
          jobadder_email: string
          jobadder_role?: Database["public"]["Enums"]["jobadder_scope"]
          jobadder_user_id: string
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_jobs?: string[] | null
          created_at?: string | null
          id?: string
          jobadder_email?: string
          jobadder_role?: Database["public"]["Enums"]["jobadder_scope"]
          jobadder_user_id?: string
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          area_id: string | null
          category_id: string | null
          category_name: string | null
          company_id: string | null
          company_name: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          job_description: string | null
          jobadder_job_id: string | null
          location_id: string | null
          location_name: string | null
          salary_currency: string | null
          salary_rate_high: number | null
          salary_rate_low: number | null
          salary_rate_per: string | null
          skill_tags: string[] | null
          source: string | null
          sub_category_id: string | null
          synced_to_jobadder: boolean | null
          title: string
          updated_at: string
          work_type_id: string | null
          work_type_name: string | null
        }
        Insert: {
          area_id?: string | null
          category_id?: string | null
          category_name?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_description?: string | null
          jobadder_job_id?: string | null
          location_id?: string | null
          location_name?: string | null
          salary_currency?: string | null
          salary_rate_high?: number | null
          salary_rate_low?: number | null
          salary_rate_per?: string | null
          skill_tags?: string[] | null
          source?: string | null
          sub_category_id?: string | null
          synced_to_jobadder?: boolean | null
          title: string
          updated_at?: string
          work_type_id?: string | null
          work_type_name?: string | null
        }
        Update: {
          area_id?: string | null
          category_id?: string | null
          category_name?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_description?: string | null
          jobadder_job_id?: string | null
          location_id?: string | null
          location_name?: string | null
          salary_currency?: string | null
          salary_rate_high?: number | null
          salary_rate_low?: number | null
          salary_rate_per?: string | null
          skill_tags?: string[] | null
          source?: string | null
          sub_category_id?: string | null
          synced_to_jobadder?: boolean | null
          title?: string
          updated_at?: string
          work_type_id?: string | null
          work_type_name?: string | null
        }
        Relationships: []
      }
      linkedin_ad_accounts: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          linkedin_account_id: string
          name: string
          status: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          linkedin_account_id: string
          name: string
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          linkedin_account_id?: string
          name?: string
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_campaigns: {
        Row: {
          budget_amount: number | null
          budget_currency: string | null
          campaign_type: string | null
          clicks: number | null
          conversions: number | null
          created_at: string
          end_date: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          linkedin_campaign_id: string
          name: string
          objective_type: string | null
          spend: number | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          linkedin_campaign_id: string
          name: string
          objective_type?: string | null
          spend?: number | null
          start_date?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          linkedin_campaign_id?: string
          name?: string
          objective_type?: string | null
          spend?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_leads: {
        Row: {
          campaign_id: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          form_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          lead_data: Json | null
          linkedin_campaign_id: string | null
          linkedin_lead_id: string
          phone: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          form_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          lead_data?: Json | null
          linkedin_campaign_id?: string | null
          linkedin_lead_id: string
          phone?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          form_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          lead_data?: Json | null
          linkedin_campaign_id?: string | null
          linkedin_lead_id?: string
          phone?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "linkedin_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      local_placements: {
        Row: {
          candidate_email: string
          candidate_id: string
          candidate_name: string
          company_name: string
          created_at: string
          end_date: string | null
          id: string
          job_id: string
          job_title: string
          jobadder_placement_id: number | null
          notes: string | null
          salary_currency: string | null
          salary_rate: number | null
          salary_rate_per: string | null
          start_date: string
          status_id: number | null
          status_name: string | null
          synced_to_jobadder: boolean | null
          updated_at: string
          work_type_id: string | null
        }
        Insert: {
          candidate_email: string
          candidate_id: string
          candidate_name: string
          company_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          job_id: string
          job_title: string
          jobadder_placement_id?: number | null
          notes?: string | null
          salary_currency?: string | null
          salary_rate?: number | null
          salary_rate_per?: string | null
          start_date: string
          status_id?: number | null
          status_name?: string | null
          synced_to_jobadder?: boolean | null
          updated_at?: string
          work_type_id?: string | null
        }
        Update: {
          candidate_email?: string
          candidate_id?: string
          candidate_name?: string
          company_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          job_id?: string
          job_title?: string
          jobadder_placement_id?: number | null
          notes?: string | null
          salary_currency?: string | null
          salary_rate?: number | null
          salary_rate_per?: string | null
          start_date?: string
          status_id?: number | null
          status_name?: string | null
          synced_to_jobadder?: boolean | null
          updated_at?: string
          work_type_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          jobadder_scopes:
            | Database["public"]["Enums"]["jobadder_scope"][]
            | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          jobadder_scopes?:
            | Database["public"]["Enums"]["jobadder_scope"][]
            | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          jobadder_scopes?:
            | Database["public"]["Enums"]["jobadder_scope"][]
            | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workable_users: {
        Row: {
          assigned_jobs: string[] | null
          created_at: string | null
          id: string
          permissions: Json | null
          updated_at: string | null
          user_id: string | null
          workable_email: string
          workable_role: Database["public"]["Enums"]["workable_role"]
          workable_user_id: string
        }
        Insert: {
          assigned_jobs?: string[] | null
          created_at?: string | null
          id?: string
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workable_email: string
          workable_role?: Database["public"]["Enums"]["workable_role"]
          workable_user_id: string
        }
        Update: {
          assigned_jobs?: string[] | null
          created_at?: string | null
          id?: string
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workable_email?: string
          workable_role?: Database["public"]["Enums"]["workable_role"]
          workable_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_job: {
        Args: { _user_id: string; _job_shortcode: string }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_assigned_jobs: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_jobadder_scope: {
        Args: {
          _user_id: string
          _scope: Database["public"]["Enums"]["jobadder_scope"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      has_workable_permission: {
        Args: { _user_id: string; _permission: string }
        Returns: boolean
      }
      has_workable_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["workable_role"]
        }
        Returns: boolean
      }
      make_first_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      trigger_workable_sync: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_jobadder_email: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      validate_workable_email: {
        Args: { email_to_check: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      interview_stage:
        | "pending"
        | "in_progress"
        | "completed"
        | "passed"
        | "failed"
      jobadder_scope:
        | "read"
        | "write"
        | "read_candidate"
        | "write_candidate"
        | "read_company"
        | "write_company"
        | "read_contact"
        | "write_contact"
        | "read_jobad"
        | "write_jobad"
        | "read_jobapplication"
        | "write_jobapplication"
        | "read_job"
        | "write_job"
        | "read_placement"
        | "write_placement"
        | "read_user"
        | "partner_jobboard"
        | "offline_access"
      workable_role:
        | "admin"
        | "hiring_manager"
        | "recruiter"
        | "interviewer"
        | "viewer"
        | "simple"
        | "reviewer"
        | "no_access"
        | "hris_admin"
        | "hris_employee"
        | "hris_no_access"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      interview_stage: [
        "pending",
        "in_progress",
        "completed",
        "passed",
        "failed",
      ],
      jobadder_scope: [
        "read",
        "write",
        "read_candidate",
        "write_candidate",
        "read_company",
        "write_company",
        "read_contact",
        "write_contact",
        "read_jobad",
        "write_jobad",
        "read_jobapplication",
        "write_jobapplication",
        "read_job",
        "write_job",
        "read_placement",
        "write_placement",
        "read_user",
        "partner_jobboard",
        "offline_access",
      ],
      workable_role: [
        "admin",
        "hiring_manager",
        "recruiter",
        "interviewer",
        "viewer",
        "simple",
        "reviewer",
        "no_access",
        "hris_admin",
        "hris_employee",
        "hris_no_access",
      ],
    },
  },
} as const
