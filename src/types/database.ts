/**
 * Hand-written Supabase Database type (kept in sync with
 * supabase/migrations/*.sql) so we can use a typed client without any `any`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string;
          prompt: string;
          type: string;
          section: string | null;
          required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          prompt: string;
          type: string;
          section?: string | null;
          required?: boolean;
          sort_order: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      answer_options: {
        Row: {
          question_id: string;
          value: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          question_id: string;
          value: string;
          label: string;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["answer_options"]["Insert"]>;
        Relationships: [];
      };
      survey_submissions: {
        Row: {
          id: string;
          survey_version: string;
          source: string | null;
          started_at: string | null;
          completed_at: string | null;
          area: string | null;
          age_group: string | null;
          purchase_frequency: string | null;
          purchase_channel: string | null;
          store_name: string | null;
          store_area: string | null;
          online_platform: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_version?: string;
          source?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          area?: string | null;
          age_group?: string | null;
          purchase_frequency?: string | null;
          purchase_channel?: string | null;
          store_name?: string | null;
          store_area?: string | null;
          online_platform?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_submissions"]["Insert"]>;
        Relationships: [];
      };
      survey_answers: {
        Row: {
          id: string;
          submission_id: string;
          question_id: string;
          option_id: string | null;
          answer_text: string | null;
          is_selected: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_id: string;
          option_id?: string | null;
          answer_text?: string | null;
          is_selected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_answers"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
