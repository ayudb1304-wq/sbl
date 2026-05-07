export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          roles: Database["public"]["Enums"]["user_role"][]
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
        }
        Relationships: []
      }
      categories: {
        Row: {
          code: string
          created_at: string
          group_format: Json
          has_qf: boolean
          id: string
          ko_format: Json
          name: string
          season_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          group_format: Json
          has_qf?: boolean
          id?: string
          ko_format: Json
          name: string
          season_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          group_format?: Json
          has_qf?: boolean
          id?: string
          ko_format?: Json
          name?: string
          season_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          completed_at: string | null
          game_number: number
          id: string
          match_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          team_a_score: number
          team_b_score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          game_number: number
          id?: string
          match_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          team_a_score?: number
          team_b_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          game_number?: number
          id?: string
          match_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          team_a_score?: number
          team_b_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category_id: string
          code: string
          created_at: string
          id: string
          name: string
          qualifier_1_team_id: string | null
          qualifier_2_team_id: string | null
          qualifiers_locked: boolean
          sort_order: number
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          id?: string
          name: string
          qualifier_1_team_id?: string | null
          qualifier_2_team_id?: string | null
          qualifiers_locked?: boolean
          sort_order?: number
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          qualifier_1_team_id?: string | null
          qualifier_2_team_id?: string | null
          qualifiers_locked?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          court: string | null
          created_at: string
          duration_minutes: number | null
          group_id: string | null
          id: string
          locked: boolean
          notes: string | null
          round_label: string
          scheduled_at: string | null
          season_id: string
          stage: Database["public"]["Enums"]["match_stage"]
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string | null
          team_a_source: Json | null
          team_b_id: string | null
          team_b_source: Json | null
          updated_at: string
          walkover_reason: string | null
          winner_team_id: string | null
        }
        Insert: {
          category_id: string
          court?: string | null
          created_at?: string
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          locked?: boolean
          notes?: string | null
          round_label: string
          scheduled_at?: string | null
          season_id: string
          stage: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_a_source?: Json | null
          team_b_id?: string | null
          team_b_source?: Json | null
          updated_at?: string
          walkover_reason?: string | null
          winner_team_id?: string | null
        }
        Update: {
          category_id?: string
          court?: string | null
          created_at?: string
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          locked?: boolean
          notes?: string | null
          round_label?: string
          scheduled_at?: string | null
          season_id?: string
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_a_source?: Json | null
          team_b_id?: string | null
          team_b_source?: Json | null
          updated_at?: string
          walkover_reason?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          roles: Database["public"]["Enums"]["user_role"][]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
        }
        Relationships: []
      }
      score_events: {
        Row: {
          action: Database["public"]["Enums"]["score_action"]
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          game_id: string | null
          id: string
          match_id: string
          new_a: number | null
          new_b: number | null
          notes: string | null
          prev_a: number | null
          prev_b: number | null
        }
        Insert: {
          action: Database["public"]["Enums"]["score_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          game_id?: string | null
          id?: string
          match_id: string
          new_a?: number | null
          new_b?: number | null
          notes?: string | null
          prev_a?: number | null
          prev_b?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["score_action"]
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          game_id?: string | null
          id?: string
          match_id?: string
          new_a?: number | null
          new_b?: number | null
          notes?: string | null
          prev_a?: number | null
          prev_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "score_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          branding: Json
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          starts_at: string | null
          status: Database["public"]["Enums"]["season_status"]
          updated_at: string
          year: number
        }
        Insert: {
          branding?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
          year: number
        }
        Update: {
          branding?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      team_players: {
        Row: {
          player_id: string
          team_id: string
        }
        Insert: {
          player_id: string
          team_id: string
        }
        Update: {
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_profiles: {
        Row: { device_id: string; display_name: string; created_at: string; updated_at: string }
        Insert: { device_id: string; display_name: string; created_at?: string; updated_at?: string }
        Update: { device_id?: string; display_name?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      announcements: {
        Row: { id: string; message: string; tone: Database["public"]["Enums"]["announcement_tone"]; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; message: string; tone?: Database["public"]["Enums"]["announcement_tone"]; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; message?: string; tone?: Database["public"]["Enums"]["announcement_tone"]; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      champion_picks: {
        Row: { device_id: string; season_id: string; category_id: string; predicted_team_id: string; created_at: string; updated_at: string }
        Insert: { device_id: string; season_id: string; category_id: string; predicted_team_id: string; created_at?: string; updated_at?: string }
        Update: { device_id?: string; season_id?: string; category_id?: string; predicted_team_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      cheers: {
        Row: { id: string; match_id: string; device_id: string; cheer_type: Database["public"]["Enums"]["cheer_type"]; created_at: string }
        Insert: { id?: string; match_id: string; device_id: string; cheer_type: Database["public"]["Enums"]["cheer_type"]; created_at?: string }
        Update: { id?: string; match_id?: string; device_id?: string; cheer_type?: Database["public"]["Enums"]["cheer_type"]; created_at?: string }
        Relationships: [
          { foreignKeyName: "cheers_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] }
        ]
      }
      predictions: {
        Row: { device_id: string; match_id: string; predicted_team_id: string; created_at: string; updated_at: string }
        Insert: { device_id: string; match_id: string; predicted_team_id: string; created_at?: string; updated_at?: string }
        Update: { device_id?: string; match_id?: string; predicted_team_id?: string; created_at?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "predictions_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] },
          { foreignKeyName: "predictions_predicted_team_id_fkey"; columns: ["predicted_team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }
        ]
      }
      teams: {
        Row: {
          category_id: string
          company: string | null
          created_at: string
          group_id: string | null
          id: string
          name: string
          season_id: string
          seed: number | null
        }
        Insert: {
          category_id: string
          company?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          season_id: string
          seed?: number | null
        }
        Update: {
          category_id?: string
          company?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          season_id?: string
          seed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      standings_view: {
        Row: {
          category_id: string | null
          group_id: string | null
          losses: number | null
          matches_played: number | null
          point_diff: number | null
          points: number | null
          points_against: number | null
          points_for: number | null
          season_id: string | null
          set_diff: number | null
          sets_lost: number | null
          sets_won: number | null
          team_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      announcement_tone: "info" | "success" | "warning" | "urgent"
      cheer_type: "clap" | "fire"
      game_status: "pending" | "in_progress" | "completed"
      match_stage: "group" | "qf" | "sf" | "final"
      match_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "walkover"
        | "cancelled"
      score_action:
        | "score_update"
        | "set_winner"
        | "walkover"
        | "reset"
        | "correction"
      season_status: "upcoming" | "live" | "completed"
      user_role: "admin" | "scorer" | "none"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type ViewRow<T extends keyof DefaultSchema["Views"]> = DefaultSchema["Views"][T]["Row"]

export type Season = Tables<"seasons">
export type Category = Tables<"categories">
export type Group = Tables<"groups">
export type Player = Tables<"players">
export type Team = Tables<"teams">
export type TeamPlayer = Tables<"team_players">
export type Match = Tables<"matches">
export type Game = Tables<"games">
export type ScoreEvent = Tables<"score_events">
export type Profile = Tables<"profiles">
export type Standing = ViewRow<"standings_view">

export type FeederSource =
  | { kind: "group_position"; category_code: string; group_code: string; position: 1 | 2 }
  | { kind: "match_winner"; category_code: string; round_label: string }
