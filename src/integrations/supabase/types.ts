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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chats: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deleted_conversations: {
        Row: {
          chat_id: string
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          created_at: string
          id: string
          mood: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      peer_chats: {
        Row: {
          created_at: string
          id: string
          participant1_id: string
          participant2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant1_id: string
          participant2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant1_id?: string
          participant2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      peer_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          deleted_for_everyone: boolean
          deleted_for_sender: boolean
          id: string
          image_url: string | null
          sender_id: string
          video_url: string | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_sender?: boolean
          id?: string
          image_url?: string | null
          sender_id: string
          video_url?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          deleted_for_everyone?: boolean
          deleted_for_sender?: boolean
          id?: string
          image_url?: string | null
          sender_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "peer_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_alias: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_alias: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_alias?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_questions: {
        Row: {
          answer1_hash: string
          answer2_hash: string
          created_at: string
          id: string
          question1: string
          question2: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer1_hash: string
          answer2_hash: string
          created_at?: string
          id?: string
          question1: string
          question2: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer1_hash?: string
          answer2_hash?: string
          created_at?: string
          id?: string
          question1?: string
          question2?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      generate_anonymous_alias: { Args: never; Returns: string }
      get_security_questions_for_email: {
        Args: { p_email: string }
        Returns: {
          has_questions: boolean
          question1: string
          question2: string
        }[]
      }
      verify_security_answers: {
        Args: { p_answer1: string; p_answer2: string; p_email: string }
        Returns: {
          is_valid: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
