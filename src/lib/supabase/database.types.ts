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
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      clients: {
        Row: { archived: boolean; created_at: string; id: string; name: string; user_id: string };
        Insert: { archived?: boolean; created_at?: string; id?: string; name: string; user_id?: string };
        Update: { archived?: boolean; created_at?: string; id?: string; name?: string; user_id?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          duration_format: string;
          full_name: string | null;
          id: string;
          time_zone: string;
          week_start: number;
        };
        Insert: {
          created_at?: string;
          duration_format?: string;
          full_name?: string | null;
          id: string;
          time_zone?: string;
          week_start?: number;
        };
        Update: {
          created_at?: string;
          duration_format?: string;
          full_name?: string | null;
          id?: string;
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
        Row: { id: string; name: string; user_id: string };
        Insert: { id?: string; name: string; user_id?: string };
        Update: { id?: string; name?: string; user_id?: string };
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
      server_now: { Args: never; Returns: string };
      set_entry_tags: {
        Args: { p_entry_id: string; p_tag_ids: string[] };
        Returns: undefined;
      };
      start_timer: {
        Args: { p_billable?: boolean; p_description?: string; p_project_id?: string; p_tag_ids?: string[] };
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
