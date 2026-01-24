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
      brokers: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          connection_id: string
          contact_instagram_id: string | null
          contact_name: string | null
          contact_phone: string | null
          content: string | null
          created_at: string
          direction: string
          error_message: string | null
          id: string
          lead_id: string | null
          media_url: string | null
          message_type: string | null
          meta_conversation_id: string | null
          meta_message_id: string | null
          status: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          connection_id: string
          contact_instagram_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_type?: string | null
          meta_conversation_id?: string | null
          meta_message_id?: string | null
          status?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string
          contact_instagram_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_type?: string | null
          meta_conversation_id?: string | null
          meta_message_id?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attendants: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversions: {
        Row: {
          conversion_source: string | null
          conversion_type: string
          created_at: string
          id: string
          lead_id: string | null
          message_content: string | null
          metadata: Json | null
          session_id: string | null
        }
        Insert: {
          conversion_source?: string | null
          conversion_type: string
          created_at?: string
          id?: string
          lead_id?: string | null
          message_content?: string | null
          metadata?: Json | null
          session_id?: string | null
        }
        Update: {
          conversion_source?: string | null
          conversion_type?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          message_content?: string | null
          metadata?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flow_metrics: {
        Row: {
          created_at: string
          flow_type: string
          id: string
          lead_id: string | null
          origin: string | null
          page_context: string | null
          page_url: string | null
          properties_shown: number | null
          property_id: string | null
        }
        Insert: {
          created_at?: string
          flow_type: string
          id?: string
          lead_id?: string | null
          origin?: string | null
          page_context?: string | null
          page_url?: string | null
          properties_shown?: number | null
          property_id?: string | null
        }
        Update: {
          created_at?: string
          flow_type?: string
          id?: string
          lead_id?: string | null
          origin?: string | null
          page_context?: string | null
          page_url?: string | null
          properties_shown?: number | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flow_metrics_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_metrics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_metrics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          attendant_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          lead_id: string
          started_at: string
          status: string
          summary: string | null
          updated_at: string
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          attendant_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_id: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          attendant_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_id?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "chat_attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          created_at: string
          default_broker_id: string | null
          distribution_rule: string
          id: string
          last_assigned_broker_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_broker_id?: string | null
          distribution_rule?: string
          id?: string
          last_assigned_broker_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_broker_id?: string | null
          distribution_rule?: string
          id?: string
          last_assigned_broker_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_default_broker_id_fkey"
            columns: ["default_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_last_assigned_broker_id_fkey"
            columns: ["last_assigned_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      general_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          broker_id: string | null
          conversion_count: number | null
          created_at: string
          email: string | null
          first_conversion_at: string | null
          id: string
          intent: string | null
          last_conversion_at: string | null
          last_interaction_at: string | null
          lead_score: number | null
          message_count: number | null
          name: string | null
          origin: string | null
          page_url: string | null
          phone: string | null
          property_id: string | null
          qualification: string | null
          score_breakdown: Json | null
          status: string
          updated_at: string
          visit_date: string | null
          visit_requested: boolean | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          broker_id?: string | null
          conversion_count?: number | null
          created_at?: string
          email?: string | null
          first_conversion_at?: string | null
          id?: string
          intent?: string | null
          last_conversion_at?: string | null
          last_interaction_at?: string | null
          lead_score?: number | null
          message_count?: number | null
          name?: string | null
          origin?: string | null
          page_url?: string | null
          phone?: string | null
          property_id?: string | null
          qualification?: string | null
          score_breakdown?: Json | null
          status?: string
          updated_at?: string
          visit_date?: string | null
          visit_requested?: boolean | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          broker_id?: string | null
          conversion_count?: number | null
          created_at?: string
          email?: string | null
          first_conversion_at?: string | null
          id?: string
          intent?: string | null
          last_conversion_at?: string | null
          last_interaction_at?: string | null
          lead_score?: number | null
          message_count?: number | null
          name?: string | null
          origin?: string | null
          page_url?: string | null
          phone?: string | null
          property_id?: string | null
          qualification?: string | null
          score_breakdown?: Json | null
          status?: string
          updated_at?: string
          visit_date?: string | null
          visit_requested?: boolean | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_imobiliarios: {
        Row: {
          created_at: string
          descricao: string | null
          email: string | null
          finalidade: string | null
          id: string
          nome: string
          origem: string | null
          pagina_origem: string | null
          status: string | null
          telefone: string
          tipo_imovel: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          email?: string | null
          finalidade?: string | null
          id?: string
          nome: string
          origem?: string | null
          pagina_origem?: string | null
          status?: string | null
          telefone: string
          tipo_imovel?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          email?: string | null
          finalidade?: string | null
          id?: string
          nome?: string
          origem?: string | null
          pagina_origem?: string | null
          status?: string | null
          telefone?: string
          tipo_imovel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body_text: string
          category: string | null
          channel_type: string
          connection_id: string | null
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string | null
          meta_status: string | null
          meta_template_id: string | null
          name: string
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          body_text: string
          category?: string | null
          channel_type: string
          connection_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          meta_status?: string | null
          meta_template_id?: string | null
          name: string
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          body_text?: string
          category?: string | null
          channel_type?: string
          connection_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          meta_status?: string | null
          meta_template_id?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_channel_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_channel_connections: {
        Row: {
          access_token_encrypted: string
          account_name: string | null
          channel_type: string
          created_at: string
          error_message: string | null
          id: string
          instagram_id: string | null
          last_activity_at: string | null
          meta_business_id: string | null
          page_id: string | null
          phone_number_id: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          webhook_registered: boolean | null
          webhook_verify_token: string
        }
        Insert: {
          access_token_encrypted: string
          account_name?: string | null
          channel_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          instagram_id?: string | null
          last_activity_at?: string | null
          meta_business_id?: string | null
          page_id?: string | null
          phone_number_id?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          webhook_registered?: boolean | null
          webhook_verify_token?: string
        }
        Update: {
          access_token_encrypted?: string
          account_name?: string | null
          channel_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instagram_id?: string | null
          last_activity_at?: string | null
          meta_business_id?: string | null
          page_id?: string | null
          phone_number_id?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          webhook_registered?: boolean | null
          webhook_verify_token?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          description: string | null
          exclusive_broker_id: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          latitude: number | null
          listing_status: string | null
          location: string
          longitude: number | null
          parking_spaces: number | null
          price: number
          property_code: string
          property_type: string
          purpose: string
          status: string
          title: string
          updated_at: string
          user_id: string
          whatsapp_link: string | null
          youtube_link: string | null
        }
        Insert: {
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          exclusive_broker_id?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_status?: string | null
          location: string
          longitude?: number | null
          parking_spaces?: number | null
          price: number
          property_code: string
          property_type: string
          purpose: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          whatsapp_link?: string | null
          youtube_link?: string | null
        }
        Update: {
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          exclusive_broker_id?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_status?: string | null
          location?: string
          longitude?: number | null
          parking_spaces?: number | null
          price?: number
          property_code?: string
          property_type?: string
          purpose?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          whatsapp_link?: string | null
          youtube_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_exclusive_broker_id_fkey"
            columns: ["exclusive_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      super_admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_record_id: string | null
          target_table: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      chat_conversion_metrics: {
        Row: {
          conversion_type: string | null
          date: string | null
          total_conversions: number | null
          unique_leads: number | null
        }
        Relationships: []
      }
      public_properties: {
        Row: {
          amenities: string[] | null
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: string | null
          images: string[] | null
          location: string | null
          parking_spaces: number | null
          price: number | null
          property_type: string | null
          purpose: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          whatsapp_link: string | null
          youtube_link: string | null
        }
        Insert: {
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          location?: string | null
          parking_spaces?: number | null
          price?: number | null
          property_type?: string | null
          purpose?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
          youtube_link?: string | null
        }
        Update: {
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: string[] | null
          location?: string | null
          parking_spaces?: number | null
          price?: number | null
          property_type?: string | null
          purpose?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
          youtube_link?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_attendant_round_robin: { Args: never; Returns: string }
      assign_lead_to_broker: {
        Args: { p_lead_id: string; p_property_id: string }
        Returns: string
      }
      calculate_lead_score: { Args: { p_lead_id: string }; Returns: number }
      finish_chat_session: {
        Args: { p_session_id: string; p_summary?: string }
        Returns: Json
      }
      generate_property_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { user_id_param: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role_from_roles: {
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_current_user_whitelisted: { Args: never; Returns: boolean }
      is_email_whitelisted: { Args: { user_email: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_security_event: {
        Args: { event_details?: Json; event_type: string }
        Returns: undefined
      }
      register_chat_conversion: {
        Args: {
          p_conversion_type: string
          p_lead_id: string
          p_message_content?: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_role: "admin" | "user" | "super_admin"
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
      user_role: ["admin", "user", "super_admin"],
    },
  },
} as const
