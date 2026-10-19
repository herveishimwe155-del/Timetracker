// Generated from the hosted Supabase schema (public). Regenerate after each migration:
//   npx supabase gen types typescript --project-id gjvaizfocwbcbgonqtan > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TimeEntryRow = {
  billable: boolean;
  created_at: string;
  description: string;
  id: string;
  project_id: string | null;
  start_at: string;
  stop_at: string | null;
  user_id: string;
  workspace_id: string | null;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      clients: {
        Row: { archived: boolean; created_at: string; id: string; name: string; user_id: string; workspace_id: string | null };
        Insert: { archived?: boolean; created_at?: string; id?: string; name: string; user_id?: string; workspace_id?: string | null };
        Update: { archived?: boolean; created_at?: string; id?: string; name?: string; user_id?: string; workspace_id?: string | null };
        Relationships: [];
      };
      billing_payments: {
        Row: {
          amount: number;
          billing_interval: string;
          currency: string;
          paid_at: string;
          transaction_id: number;
          user_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_interval: string;
          created_at: string;
          current_period_end: string;
          customer_email: string;
          plan: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: never;
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          members_create_projects: boolean;
          members_create_tags: boolean;
          members_see_activity: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          members_create_projects?: boolean;
          members_create_tags?: boolean;
          members_see_activity?: boolean;
          name: string;
        };
        Update: {
          members_create_projects?: boolean;
          members_create_tags?: boolean;
          members_see_activity?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: { joined_at: string; role: string; user_id: string; workspace_id: string };
        Insert: never;
        Update: { role?: string };
        Relationships: [];
      };
      workspace_invites: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          revoked: boolean;
          role: string;
          token_hash: string;
          uses: number;
          workspace_id: string;
        };
        Insert: { role?: string; token_hash: string; workspace_id: string; expires_at?: string };
        Update: { revoked?: boolean };
        Relationships: [];
      };
      goals: {
        Row: {
          comparison: string;
          created_at: string;
          id: string;
          period: string;
          project_id: string | null;
          target_seconds: number;
          user_id: string;
        };
        Insert: {
          comparison?: string;
          created_at?: string;
          id?: string;
          period?: string;
          project_id?: string | null;
          target_seconds: number;
          user_id?: string;
        };
        Update: {
          comparison?: string;
          created_at?: string;
          id?: string;
          period?: string;
          project_id?: string | null;
          target_seconds?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          duration_format: string;
          full_name: string | null;
          id: string;
          lock_before: string | null;
          max_tags: number | null;
          require_description: boolean;
          require_project: boolean;
          require_tags: boolean;
          show_times: boolean;
          show_timesheet: boolean;
          time_format: string;
          time_zone: string;
          week_start: number;
        };
        Insert: {
          created_at?: string;
          duration_format?: string;
          full_name?: string | null;
          id: string;
          lock_before?: string | null;
          max_tags?: number | null;
          require_description?: boolean;
          require_project?: boolean;
          require_tags?: boolean;
          show_times?: boolean;
          show_timesheet?: boolean;
          time_format?: string;
          time_zone?: string;
          week_start?: number;
        };
        Update: {
          created_at?: string;
          duration_format?: string;
          full_name?: string | null;
          id?: string;
          lock_before?: string | null;
          max_tags?: number | null;
          require_description?: boolean;
          require_project?: boolean;
          require_tags?: boolean;
          show_times?: boolean;
          show_timesheet?: boolean;
          time_format?: string;
          time_zone?: string;
          week_start?: number;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          archived: boolean;
          client_id: string | null;
          color: string;
          created_at: string;
          hourly_rate: number | null;
          id: string;
          name: string;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          archived?: boolean;
          client_id?: string | null;
          color?: string;
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          name: string;
          user_id?: string;
          workspace_id?: string | null;
        };
        Update: {
          archived?: boolean;
          client_id?: string | null;
          color?: string;
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          name?: string;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_user_id_fkey";
            columns: ["client_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      tags: {
        Row: { id: string; name: string; user_id: string; workspace_id: string | null };
        Insert: { id?: string; name: string; user_id?: string; workspace_id?: string | null };
        Update: { id?: string; name?: string; user_id?: string; workspace_id?: string | null };
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntryRow;
        Insert: {
          billable?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          project_id?: string | null;
          start_at: string;
          stop_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
        };
        Update: {
          billable?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          project_id?: string | null;
          start_at?: string;
          stop_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_user_id_fkey";
            columns: ["project_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      time_entry_tags: {
        Row: { tag_id: string; time_entry_id: string; user_id: string };
        Insert: { tag_id: string; time_entry_id: string; user_id?: string };
        Update: { tag_id?: string; time_entry_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: "time_entry_tags_tag_id_user_id_fkey";
            columns: ["tag_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "time_entry_tags_time_entry_id_user_id_fkey";
            columns: ["time_entry_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "time_entries";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      apply_payment: {
        Args: {
          p_transaction_id: number;
          p_user_id: string;
          p_email: string;
          p_interval: string;
          p_amount: number;
          p_currency: string;
        };
        Returns: string;
      };
      current_plan: { Args: never; Returns: string };
      accept_invite: { Args: { p_token: string }; Returns: string };
      delete_my_account: { Args: never; Returns: undefined };
      invite_preview: {
        Args: { p_token: string };
        Returns: { workspace_name: string; role: string; valid: boolean }[];
      };
      workspace_member_list: {
        Args: { p_workspace: string };
        Returns: { user_id: string; role: string; joined_at: string; full_name: string | null; email: string }[];
      };
      project_stats: {
        Args: never;
        Returns: { project_id: string; tracked_seconds: number; last_tracked_at: string; entry_count: number }[];
      };
      server_now: { Args: never; Returns: string };
      tag_stats: {
        Args: never;
        Returns: { tag_id: string; entry_count: number; tracked_seconds: number; last_used_at: string }[];
      };
      session_assurance_ok: { Args: never; Returns: boolean };
      set_entry_tags: {
        Args: { p_entry_id: string; p_tag_ids: string[] };
        Returns: undefined;
      };
      start_timer: {
        Args: {
          p_billable?: boolean;
          p_description?: string;
          p_project_id?: string;
          p_tag_ids?: string[];
          p_workspace_id?: string;
        };
        Returns: TimeEntryRow;
        SetofOptions: { from: "*"; to: "time_entries"; isOneToOne: true; isSetofReturn: false };
      };
      stop_timer: {
        Args: never;
        Returns: TimeEntryRow;
        SetofOptions: { from: "*"; to: "time_entries"; isOneToOne: true; isSetofReturn: false };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
