export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      admin_log: {
        Row: {
          created_at: string;
          event: string;
          id: number;
          username: string;
        };
        Insert: {
          created_at?: string;
          event?: string;
          id?: never;
          username: string;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: never;
          username?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          created_at: string;
          email: string;
          id: number;
          name: string;
          password: string;
          position: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: never;
          name: string;
          password: string;
          position: string;
          username: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: never;
          name?: string;
          password?: string;
          position?: string;
          username?: string;
        };
        Relationships: [];
      };
      approved_reports: {
        Row: {
          approved_at: string | null;
          driver_name: string | null;
          id: number;
          mission_id: string | null;
          notes: string | null;
          quantity_added: number | null;
          site_name: string | null;
          status: string | null;
          task_id: number | null;
        };
        Insert: {
          approved_at?: string | null;
          driver_name?: string | null;
          id?: number;
          mission_id?: string | null;
          notes?: string | null;
          quantity_added?: number | null;
          site_name?: string | null;
          status?: string | null;
          task_id?: number | null;
        };
        Update: {
          approved_at?: string | null;
          driver_name?: string | null;
          id?: number;
          mission_id?: string | null;
          notes?: string | null;
          quantity_added?: number | null;
          site_name?: string | null;
          status?: string | null;
          task_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "approved_reports_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "driver_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      authorizations: {
        Row: {
          created_at: string;
          email: string;
          id: number;
          name: string;
          password: string | null;
          position: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: number;
          name: string;
          password?: string | null;
          position: string;
          username: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: number;
          name?: string;
          password?: string | null;
          position?: string;
          username?: string;
        };
        Relationships: [];
      };
      driver_notification_reads: {
        Row: {
          driver_name: string;
          id: number;
          notification_id: number;
          read_at: string;
        };
        Insert: {
          driver_name: string;
          id?: never;
          notification_id: number;
          read_at?: string;
        };
        Update: {
          driver_name?: string;
          id?: never;
          notification_id?: number;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_notification_reads_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "driver_notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_notifications: {
        Row: {
          created_at: string;
          driver_name: string | null;
          id: number;
          message: string;
          sent_by: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          driver_name?: string | null;
          id?: never;
          message: string;
          sent_by?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          driver_name?: string | null;
          id?: never;
          message?: string;
          sent_by?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      driver_push_tokens: {
        Row: {
          created_at: string;
          driver_name: string | null;
          driver_phone: string | null;
          id: number;
          platform: string | null;
          token: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          driver_name?: string | null;
          driver_phone?: string | null;
          id?: number;
          platform?: string | null;
          token: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          driver_name?: string | null;
          driver_phone?: string | null;
          id?: number;
          platform?: string | null;
          token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      driver_task_entries: {
        Row: {
          created_at: string | null;
          liters: number;
          liters_added: number | null;
          odometer: number | null;
          photo_url: string | null;
          rate: number | null;
          receipt_number: string | null;
          site_name: number;
          station: string | null;
          submitted_at: string;
          submitted_by: string | null;
          task_id: number;
        };
        Insert: {
          created_at?: string | null;
          liters: number;
          liters_added?: number | null;
          odometer?: number | null;
          photo_url?: string | null;
          rate?: number | null;
          receipt_number?: string | null;
          site_name?: number;
          station?: string | null;
          submitted_at?: string;
          submitted_by?: string | null;
          task_id: number;
        };
        Update: {
          created_at?: string | null;
          liters?: number;
          liters_added?: number | null;
          odometer?: number | null;
          photo_url?: string | null;
          rate?: number | null;
          receipt_number?: string | null;
          site_name?: number;
          station?: string | null;
          submitted_at?: string;
          submitted_by?: string | null;
          task_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "driver_task_entries_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "driver_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_tasks: {
        Row: {
          admin_status: string | null;
          created_at: string;
          driver_name: string;
          driver_phone: string | null;
          id: number;
          mission_id: string | null;
          notes: string | null;
          required_liters: number | null;
          scheduled_at: string | null;
          site_id: number | null;
          site_name: string;
          status: string;
          updated_at: string;
          zone: string | null;
        };
        Insert: {
          admin_status?: string | null;
          created_at?: string;
          driver_name: string;
          driver_phone?: string | null;
          id?: number;
          mission_id?: string | null;
          notes?: string | null;
          required_liters?: number | null;
          scheduled_at?: string | null;
          site_id?: number | null;
          site_name: string;
          status?: string;
          updated_at?: string;
          zone?: string | null;
        };
        Update: {
          admin_status?: string | null;
          created_at?: string;
          driver_name?: string;
          driver_phone?: string | null;
          id?: number;
          mission_id?: string | null;
          notes?: string | null;
          required_liters?: number | null;
          scheduled_at?: string | null;
          site_id?: number | null;
          site_name?: string;
          status?: string;
          updated_at?: string;
          zone?: string | null;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          active: boolean;
          created_at: string;
          id: number;
          name: string;
          password: string | null;
          password_sha256: string | null;
          phone: string | null;
          zone: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: number;
          name: string;
          password?: string | null;
          password_sha256?: string | null;
          phone?: string | null;
          zone?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: number;
          name?: string;
          password?: string | null;
          password_sha256?: string | null;
          phone?: string | null;
          zone?: string | null;
        };
        Relationships: [];
      };
      fuel_plan: {
        Row: {
          consumption_per_day: number | null;
          current_fuel_in_tank: number | null;
          district: string | null;
          driver_name: string | null;
          fuel_percentage: number | null;
          id: number;
          last_added_qty: number | null;
          last_fueling_date: string | null;
          latitude: number | null;
          longitude: number | null;
          next_fueling_date: string | null;
          region: string | null;
          site_id: number | null;
          site_name: string | null;
          site_power_configuration: string | null;
          site_status: string | null;
          span_days: number | null;
          tank_capacity: number | null;
          updated_at: string | null;
        };
        Insert: {
          consumption_per_day?: number | null;
          current_fuel_in_tank?: number | null;
          district?: string | null;
          driver_name?: string | null;
          fuel_percentage?: number | null;
          id?: number;
          last_added_qty?: number | null;
          last_fueling_date?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          next_fueling_date?: string | null;
          region?: string | null;
          site_id?: number | null;
          site_name?: string | null;
          site_power_configuration?: string | null;
          site_status?: string | null;
          span_days?: number | null;
          tank_capacity?: number | null;
          updated_at?: string | null;
        };
        Update: {
          consumption_per_day?: number | null;
          current_fuel_in_tank?: number | null;
          district?: string | null;
          driver_name?: string | null;
          fuel_percentage?: number | null;
          id?: number;
          last_added_qty?: number | null;
          last_fueling_date?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          next_fueling_date?: string | null;
          region?: string | null;
          site_id?: number | null;
          site_name?: string | null;
          site_power_configuration?: string | null;
          site_status?: string | null;
          span_days?: number | null;
          tank_capacity?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          fcm_sender_id: string | null;
          fcm_server_key: string | null;
          fuel_unit_price: number | null;
          id: number;
          invoice_prefix: string | null;
          invoice_sequence: number | null;
          supplier_address: string | null;
          supplier_name: string | null;
          updated_at: string | null;
          vat_rate: number | null;
        };
        Insert: {
          fcm_sender_id?: string | null;
          fcm_server_key?: string | null;
          fuel_unit_price?: number | null;
          id: number;
          invoice_prefix?: string | null;
          invoice_sequence?: number | null;
          supplier_address?: string | null;
          supplier_name?: string | null;
          updated_at?: string | null;
          vat_rate?: number | null;
        };
        Update: {
          fcm_sender_id?: string | null;
          fcm_server_key?: string | null;
          fuel_unit_price?: number | null;
          id?: number;
          invoice_prefix?: string | null;
          invoice_sequence?: number | null;
          supplier_address?: string | null;
          supplier_name?: string | null;
          updated_at?: string | null;
          vat_rate?: number | null;
        };
        Relationships: [];
      };
      sites: {
        Row: {
          city: string | null;
          consumption_per_day: number | null;
          cow_status: string | null;
          created_at: string;
          district: string | null;
          generator_capacity: number | null;
          id: number;
          latitude: number | null;
          longitude: number | null;
          power_source: string | null;
          region: string | null;
          site_name: string;
          site_status: string | null;
          tank_capacity: number | null;
          vendor: string | null;
        };
        Insert: {
          city?: string | null;
          consumption_per_day?: number | null;
          cow_status?: string | null;
          created_at?: string;
          district?: string | null;
          generator_capacity?: number | null;
          id?: never;
          latitude?: string | null;
          longitude?: number | null;
          power_source?: string | null;
          region?: string | null;
          site_name: string;
          site_status?: string | null;
          tank_capacity?: number | null;
          vendor?: string | null;
        };
        Update: {
          city?: string | null;
          consumption_per_day?: number | null;
          cow_status?: string | null;
          created_at?: string;
          district?: string | null;
          generator_capacity?: number | null;
          id?: never;
          latitude?: number | null;
          longitude?: number | null;
          power_source?: string | null;
          region?: string | null;
          site_name?: string;
          site_status?: string | null;
          tank_capacity?: number | null;
          vendor?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_counts: {
        Row: {
          active_drivers: number | null;
          active_missions: number | null;
        };
        Relationships: [];
      };
      v_liters_30d: {
        Row: {
          total_liters: number | null;
        };
        Relationships: [];
      };
      v_liters_by_zone_total: {
        Row: {
          liters: number | null;
          zone: string | null;
        };
        Relationships: [];
      };
      v_liters_today: {
        Row: {
          total_liters: number | null;
        };
        Relationships: [];
      };
      v_liters_trend: {
        Row: {
          day: string | null;
          liters: number | null;
        };
        Relationships: [];
      };
      v_task_status: {
        Row: {
          count: number | null;
          status: string | null;
        };
        Relationships: [];
      };
      v_task_zones: {
        Row: {
          count: number | null;
          zone: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string };
      compute_next_fueling_date: {
        Args: { last_fueling: string; span_days: string; status: string };
        Returns: string;
      };
      create_driver_tasks_for_due_fuel_plan: {
        Args: { ref_date?: string };
        Returns: number;
      };
      fn_send_fcm: {
        Args: { body: string; target_driver: string; title: string };
        Returns: undefined;
      };
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "http_request";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_delete:
        | {
            Args: { uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_get:
        | {
            Args: { uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_head: {
        Args: { uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_header: {
        Args: { field: string; value: string };
        Returns: Database["public"]["CompositeTypes"]["http_header"];
        SetofOptions: {
          from: "*";
          to: "http_header";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_list_curlopt: {
        Args: never;
        Returns: {
          curlopt: string;
          value: string;
        }[];
      };
      http_patch: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database["public"]["CompositeTypes"]["http_response"];
            SetofOptions: {
              from: "*";
              to: "http_response";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_put: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database["public"]["CompositeTypes"]["http_response"];
        SetofOptions: {
          from: "*";
          to: "http_response";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_reset_curlopt: { Args: never; Returns: boolean };
      http_set_curlopt: {
        Args: { curlopt: string; value: string };
        Returns: boolean;
      };
      text_to_bytea: { Args: { data: string }; Returns: string };
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      http_header: {
        field: string | null;
        value: string | null;
      };
      http_request: {
        method: unknown;
        uri: string | null;
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null;
        content_type: string | null;
        content: string | null;
      };
      http_response: {
        status: number | null;
        content_type: string | null;
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null;
        content: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
