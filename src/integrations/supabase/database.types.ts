// Generated from local PostgreSQL by scripts/generate-database-types.mjs.
// Remote schema not yet verified. Regenerate after changing migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          patient_id: string;
          department_code: string;
          municipality_code: string;
          district_code: string | null;
          address_line: string;
          reference_notes: string | null;
          latitude: number | null;
          longitude: number | null;
          coordinate_source: string | null;
          accuracy_meters: number | null;
          captured_at: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id: string;
          department_code: string;
          municipality_code: string;
          district_code?: string | null;
          address_line: string;
          reference_notes?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          coordinate_source?: string | null;
          accuracy_meters?: number | null;
          captured_at?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id?: string;
          department_code?: string;
          municipality_code?: string;
          district_code?: string | null;
          address_line?: string;
          reference_notes?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          coordinate_source?: string | null;
          accuracy_meters?: number | null;
          captured_at?: string | null;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addresses_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addresses_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          request_id: string;
          quote_id: string;
          professional_id: string;
          approval_id: string;
          address_snapshot: Json;
          starts_at: string;
          ends_at: string;
          busy_from: string;
          busy_until: string;
          status: string;
          hold_expires_at: string | null;
          confirmed_at: string | null;
          replaces_appointment_id: string | null;
          cancellation_reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id: string;
          quote_id: string;
          professional_id: string;
          approval_id: string;
          address_snapshot: Json;
          starts_at: string;
          ends_at: string;
          busy_from: string;
          busy_until: string;
          status: string;
          hold_expires_at?: string | null;
          confirmed_at?: string | null;
          replaces_appointment_id?: string | null;
          cancellation_reason?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id?: string;
          quote_id?: string;
          professional_id?: string;
          approval_id?: string;
          address_snapshot?: Json;
          starts_at?: string;
          ends_at?: string;
          busy_from?: string;
          busy_until?: string;
          status?: string;
          hold_expires_at?: string | null;
          confirmed_at?: string | null;
          replaces_appointment_id?: string | null;
          cancellation_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_approval_id_request_id_fkey";
            columns: ["approval_id", "request_id"];
            referencedRelation: "assessments";
            referencedColumns: ["id", "request_id"];
          },
          {
            foreignKeyName: "appointments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_quote_id_request_id_professional_id_fkey";
            columns: ["quote_id", "request_id", "professional_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id", "request_id", "professional_id"];
          },
          {
            foreignKeyName: "appointments_replaces_appointment_id_fkey";
            columns: ["replaces_appointment_id"];
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_request_id_fkey";
            columns: ["request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          request_id: string;
          intake_id: string;
          protocol_id: string;
          assessed_by: string;
          result: string;
          rationale: string;
          assessed_at: string;
          valid_until: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          request_id: string;
          intake_id: string;
          protocol_id: string;
          assessed_by: string;
          result: string;
          rationale: string;
          assessed_at?: string;
          valid_until?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          request_id?: string;
          intake_id?: string;
          protocol_id?: string;
          assessed_by?: string;
          result?: string;
          rationale?: string;
          assessed_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_assessed_by_fkey";
            columns: ["assessed_by"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_intake_id_request_id_fkey";
            columns: ["intake_id", "request_id"];
            referencedRelation: "clinical_intakes";
            referencedColumns: ["id", "request_id"];
          },
          {
            foreignKeyName: "assessments_protocol_id_fkey";
            columns: ["protocol_id"];
            referencedRelation: "clinical_protocol_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_request_id_fkey";
            columns: ["request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          actor_profile_id: string | null;
          system_actor: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          occurred_at: string;
          correlation_id: string;
          reason: string | null;
          changed_fields: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          actor_profile_id?: string | null;
          system_actor?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          occurred_at?: string;
          correlation_id?: string;
          reason?: string | null;
          changed_fields?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          actor_profile_id?: string | null;
          system_actor?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          occurred_at?: string;
          correlation_id?: string;
          reason?: string | null;
          changed_fields?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_quotes: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          company_id: string;
          contact_id: string;
          requested_service: string;
          scope: string;
          status: string;
          offered_amount_cents: number | null;
          currency: string;
          valid_until: string | null;
          accepted_at: string | null;
          acceptance_ref: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          company_id: string;
          contact_id: string;
          requested_service: string;
          scope: string;
          status?: string;
          offered_amount_cents?: number | null;
          currency: string;
          valid_until?: string | null;
          accepted_at?: string | null;
          acceptance_ref?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          company_id?: string;
          contact_id?: string;
          requested_service?: string;
          scope?: string;
          status?: string;
          offered_amount_cents?: number | null;
          currency?: string;
          valid_until?: string | null;
          accepted_at?: string | null;
          acceptance_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_quotes_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_quotes_contact_id_company_id_fkey";
            columns: ["contact_id", "company_id"];
            referencedRelation: "company_contacts";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "business_quotes_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_quotes_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      caregiver_links: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          caregiver_id: string;
          patient_id: string;
          relationship: string;
          scopes: string[];
          authorized_by: string;
          authorized_at: string;
          revoked_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          caregiver_id: string;
          patient_id: string;
          relationship: string;
          scopes: string[];
          authorized_by: string;
          authorized_at?: string;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          caregiver_id?: string;
          patient_id?: string;
          relationship?: string;
          scopes?: string[];
          authorized_by?: string;
          authorized_at?: string;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "caregiver_links_authorized_by_fkey";
            columns: ["authorized_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caregiver_links_caregiver_id_fkey";
            columns: ["caregiver_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caregiver_links_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caregiver_links_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "caregiver_links_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_amendments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          encounter_id: string;
          author_id: string;
          target_field: string;
          vital_sign_id: string | null;
          correction_text: string;
          reason: string;
          signed_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          encounter_id: string;
          author_id: string;
          target_field: string;
          vital_sign_id?: string | null;
          correction_text: string;
          reason: string;
          signed_at: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          encounter_id?: string;
          author_id?: string;
          target_field?: string;
          vital_sign_id?: string | null;
          correction_text?: string;
          reason?: string;
          signed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_amendments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_amendments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_amendments_encounter_id_fkey";
            columns: ["encounter_id"];
            referencedRelation: "clinical_encounters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_amendments_vital_sign_id_fkey";
            columns: ["vital_sign_id"];
            referencedRelation: "vital_signs";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_encounters: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          appointment_id: string;
          professional_id: string;
          started_at: string;
          completed_at: string | null;
          procedure_text: string;
          evolution_text: string;
          recommendations_text: string;
          status: string;
          signed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          appointment_id: string;
          professional_id: string;
          started_at: string;
          completed_at?: string | null;
          procedure_text: string;
          evolution_text: string;
          recommendations_text: string;
          status?: string;
          signed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          appointment_id?: string;
          professional_id?: string;
          started_at?: string;
          completed_at?: string | null;
          procedure_text?: string;
          evolution_text?: string;
          recommendations_text?: string;
          status?: string;
          signed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_encounters_appointment_id_fkey";
            columns: ["appointment_id"];
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_encounters_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_encounters_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_encounters_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_intakes: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          request_id: string;
          revision: number;
          reason: string;
          prescription_declared: boolean;
          symptoms: Json;
          history: Json;
          questionnaire_version: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id: string;
          revision: number;
          reason: string;
          prescription_declared: boolean;
          symptoms: Json;
          history: Json;
          questionnaire_version: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id?: string;
          revision?: number;
          reason?: string;
          prescription_declared?: boolean;
          symptoms?: Json;
          history?: Json;
          questionnaire_version?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_intakes_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_intakes_request_id_fkey";
            columns: ["request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_intakes_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_protocol_versions: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          code: string;
          version: number;
          definition: Json;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code: string;
          version: number;
          definition: Json;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code?: string;
          version?: number;
          definition?: Json;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_protocol_versions_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_protocol_versions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_protocol_versions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_releases: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          encounter_id: string;
          released_by: string;
          released_at: string;
          content_snapshot: Json;
          version: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          encounter_id: string;
          released_by: string;
          released_at: string;
          content_snapshot: Json;
          version: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          encounter_id?: string;
          released_by?: string;
          released_at?: string;
          content_snapshot?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_releases_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_releases_encounter_id_fkey";
            columns: ["encounter_id"];
            referencedRelation: "clinical_encounters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_releases_released_by_fkey";
            columns: ["released_by"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          legal_name: string;
          tax_identifier: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          legal_name: string;
          tax_identifier?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          legal_name?: string;
          tax_identifier?: string | null;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_contacts: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          company_id: string;
          name: string;
          email: string;
          phone: string | null;
          profile_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          company_id: string;
          name: string;
          email: string;
          phone?: string | null;
          profile_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          company_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_contacts_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_contacts_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_contacts_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      competencies: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          code: string;
          name: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code: string;
          name: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competencies_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competencies_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      consents: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          patient_id: string;
          granted_by: string;
          purpose: string;
          policy_version: string;
          granted_at: string;
          revoked_at: string | null;
          evidence_ref: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id: string;
          granted_by: string;
          purpose: string;
          policy_version: string;
          granted_at?: string;
          revoked_at?: string | null;
          evidence_ref?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id?: string;
          granted_by?: string;
          purpose?: string;
          policy_version?: string;
          granted_at?: string;
          revoked_at?: string | null;
          evidence_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consents_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consents_granted_by_fkey";
            columns: ["granted_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consents_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consents_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          owner_profile_id: string;
          patient_id: string | null;
          professional_id: string | null;
          category: string;
          bucket_id: string;
          object_path: string;
          mime_type: string;
          size_bytes: number;
          checksum_sha256: string;
          scan_status: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          owner_profile_id: string;
          patient_id?: string | null;
          professional_id?: string | null;
          category: string;
          bucket_id: string;
          object_path: string;
          mime_type: string;
          size_bytes: number;
          checksum_sha256: string;
          scan_status?: string;
          uploaded_at: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          owner_profile_id?: string;
          patient_id?: string | null;
          professional_id?: string | null;
          category?: string;
          bucket_id?: string;
          object_path?: string;
          mime_type?: string;
          size_bytes?: number;
          checksum_sha256?: string;
          scan_status?: string;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fiscal_documents: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          sale_id: string;
          replaces_document_id: string | null;
          document_type: string;
          issuer_identifier: string;
          control_number: string | null;
          external_id: string | null;
          receipt_seal: string | null;
          status: string;
          issued_at: string | null;
          document_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          sale_id: string;
          replaces_document_id?: string | null;
          document_type: string;
          issuer_identifier: string;
          control_number?: string | null;
          external_id?: string | null;
          receipt_seal?: string | null;
          status?: string;
          issued_at?: string | null;
          document_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          sale_id?: string;
          replaces_document_id?: string | null;
          document_type?: string;
          issuer_identifier?: string;
          control_number?: string | null;
          external_id?: string | null;
          receipt_seal?: string | null;
          status?: string;
          issued_at?: string | null;
          document_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fiscal_documents_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fiscal_documents_replaces_document_id_fkey";
            columns: ["replaces_document_id"];
            referencedRelation: "fiscal_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fiscal_documents_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fiscal_documents_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_responses: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          follow_up_id: string;
          revision: number;
          answered_by: string;
          answered_at: string;
          improvement: string;
          persistent_symptoms: boolean;
          wants_new_visit: boolean;
          answers: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          follow_up_id: string;
          revision: number;
          answered_by: string;
          answered_at?: string;
          improvement: string;
          persistent_symptoms: boolean;
          wants_new_visit: boolean;
          answers: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          follow_up_id?: string;
          revision?: number;
          answered_by?: string;
          answered_at?: string;
          improvement?: string;
          persistent_symptoms?: boolean;
          wants_new_visit?: boolean;
          answers?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_responses_answered_by_fkey";
            columns: ["answered_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_responses_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_responses_follow_up_id_fkey";
            columns: ["follow_up_id"];
            referencedRelation: "follow_ups";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          encounter_id: string;
          due_at: string;
          answered_at: string | null;
          improvement: string | null;
          persistent_symptoms: boolean | null;
          wants_new_visit: boolean | null;
          answers: Json | null;
          status: string;
          assigned_to: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          encounter_id: string;
          due_at: string;
          answered_at?: string | null;
          improvement?: string | null;
          persistent_symptoms?: boolean | null;
          wants_new_visit?: boolean | null;
          answers?: Json | null;
          status?: string;
          assigned_to?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          encounter_id?: string;
          due_at?: string;
          answered_at?: string | null;
          improvement?: string | null;
          persistent_symptoms?: boolean | null;
          wants_new_visit?: boolean | null;
          answers?: Json | null;
          status?: string;
          assigned_to?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_encounter_id_fkey";
            columns: ["encounter_id"];
            referencedRelation: "clinical_encounters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          job_id: string;
          recipient_profile_id: string;
          channel: string;
          template_version: string;
          provider_reference: string | null;
          status: string;
          sent_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          job_id: string;
          recipient_profile_id: string;
          channel: string;
          template_version: string;
          provider_reference?: string | null;
          status: string;
          sent_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          job_id?: string;
          recipient_profile_id?: string;
          channel?: string;
          template_version?: string;
          provider_reference?: string | null;
          status?: string;
          sent_at?: string | null;
          delivered_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "outbox_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      outbox_jobs: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          idempotency_key: string;
          payload: Json;
          available_at: string;
          attempts: number;
          locked_until: string | null;
          worker_id: string | null;
          status: string;
          last_error_code: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          idempotency_key: string;
          payload?: Json;
          available_at?: string;
          attempts?: number;
          locked_until?: string | null;
          worker_id?: string | null;
          status?: string;
          last_error_code?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          event_type?: string;
          aggregate_type?: string;
          aggregate_id?: string;
          idempotency_key?: string;
          payload?: Json;
          available_at?: string;
          attempts?: number;
          locked_until?: string | null;
          worker_id?: string | null;
          status?: string;
          last_error_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_jobs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbox_jobs_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          profile_id: string | null;
          full_name: string;
          birth_date: string | null;
          sex: string | null;
          phone: string | null;
          email: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id?: string | null;
          full_name: string;
          birth_date?: string | null;
          sex?: string | null;
          phone?: string | null;
          email?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id?: string | null;
          full_name?: string;
          birth_date?: string | null;
          sex?: string | null;
          phone?: string | null;
          email?: string | null;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_attempts: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          sale_id: string;
          provider: string;
          method: string;
          idempotency_key: string;
          external_reference: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          received_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          sale_id: string;
          provider: string;
          method: string;
          idempotency_key: string;
          external_reference?: string | null;
          amount_cents: number;
          currency: string;
          status?: string;
          received_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          sale_id?: string;
          provider?: string;
          method?: string;
          idempotency_key?: string;
          external_reference?: string | null;
          amount_cents?: number;
          currency?: string;
          status?: string;
          received_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_attempts_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_attempts_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_attempts_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          provider: string;
          event_id: string;
          received_at: string;
          processed_at: string | null;
          status: string;
          payload_hash: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          provider: string;
          event_id: string;
          received_at?: string;
          processed_at?: string | null;
          status?: string;
          payload_hash: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          provider?: string;
          event_id?: string;
          received_at?: string;
          processed_at?: string | null;
          status?: string;
          payload_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_events_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          sale_id: string;
          attempt_id: string | null;
          provider: string;
          external_reference: string;
          amount_cents: number;
          currency: string;
          received_at: string;
          recorded_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          sale_id: string;
          attempt_id?: string | null;
          provider: string;
          external_reference: string;
          amount_cents: number;
          currency: string;
          received_at: string;
          recorded_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          sale_id?: string;
          attempt_id?: string | null;
          provider?: string;
          external_reference?: string;
          amount_cents?: number;
          currency?: string;
          received_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_attempt_id_sale_id_fkey";
            columns: ["attempt_id", "sale_id"];
            referencedRelation: "payment_attempts";
            referencedColumns: ["id", "sale_id"];
          },
          {
            foreignKeyName: "payments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_recorded_by_fkey";
            columns: ["recorded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      prescriptions: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          request_id: string;
          patient_id: string;
          document_id: string;
          prescription_date: string | null;
          diagnosis: string | null;
          indicated_therapy: string | null;
          review_status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id: string;
          patient_id: string;
          document_id: string;
          prescription_date?: string | null;
          diagnosis?: string | null;
          indicated_therapy?: string | null;
          review_status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id?: string;
          patient_id?: string;
          document_id?: string;
          prescription_date?: string | null;
          diagnosis?: string | null;
          indicated_therapy?: string | null;
          review_status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prescriptions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_document_id_patient_id_fkey";
            columns: ["document_id", "patient_id"];
            referencedRelation: "documents";
            referencedColumns: ["id", "patient_id"];
          },
          {
            foreignKeyName: "prescriptions_request_id_patient_id_fkey";
            columns: ["request_id", "patient_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id", "patient_id"];
          },
          {
            foreignKeyName: "prescriptions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_availability: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          professional_id: string;
          starts_at: string;
          ends_at: string;
          kind: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          professional_id: string;
          starts_at: string;
          ends_at: string;
          kind: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          professional_id?: string;
          starts_at?: string;
          ends_at?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_availability_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_availability_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_availability_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_credentials: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          professional_id: string;
          competency_id: string;
          document_id: string | null;
          issued_at: string;
          expires_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          professional_id: string;
          competency_id: string;
          document_id?: string | null;
          issued_at: string;
          expires_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          professional_id?: string;
          competency_id?: string;
          document_id?: string | null;
          issued_at?: string;
          expires_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_credentials_competency_id_fkey";
            columns: ["competency_id"];
            referencedRelation: "competencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_credentials_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_credentials_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_credentials_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_credentials_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_credentials_verified_by_fkey";
            columns: ["verified_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      professionals: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          profile_id: string;
          display_name: string;
          specialty: string;
          registration_ref: string | null;
          verification_status: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id: string;
          display_name: string;
          specialty: string;
          registration_ref?: string | null;
          verification_status?: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id?: string;
          display_name?: string;
          specialty?: string;
          registration_ref?: string | null;
          verification_status?: string;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professionals_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professionals_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          auth_user_id: string | null;
          display_name: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          auth_user_id?: string | null;
          display_name: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          auth_user_id?: string | null;
          display_name?: string;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_items: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          quote_id: string;
          service_price_version_id: string | null;
          kind: string;
          label: string;
          quantity: number;
          unit_cents: number;
          amount_cents: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id: string;
          service_price_version_id?: string | null;
          kind: string;
          label: string;
          quantity: number;
          unit_cents: number;
          amount_cents: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id?: string;
          service_price_version_id?: string | null;
          kind?: string;
          label?: string;
          quantity?: number;
          unit_cents?: number;
          amount_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_service_price_version_id_fkey";
            columns: ["service_price_version_id"];
            referencedRelation: "service_price_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          request_id: string;
          professional_id: string | null;
          status: string;
          currency: string;
          service_cents: number;
          distance_cents: number;
          traffic_cents: number;
          tax_cents: number;
          total_cents: number;
          tax_policy_version: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id: string;
          professional_id?: string | null;
          status?: string;
          currency: string;
          service_cents: number;
          distance_cents: number;
          traffic_cents: number;
          tax_cents: number;
          total_cents: number;
          tax_policy_version: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id?: string;
          professional_id?: string | null;
          status?: string;
          currency?: string;
          service_cents?: number;
          distance_cents?: number;
          traffic_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          tax_policy_version?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_accepted_by_fkey";
            columns: ["accepted_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_request_id_fkey";
            columns: ["request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          payment_id: string;
          provider: string;
          external_reference: string | null;
          idempotency_key: string;
          amount_cents: number;
          status: string;
          reason: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          payment_id: string;
          provider: string;
          external_reference?: string | null;
          idempotency_key: string;
          amount_cents: number;
          status?: string;
          reason: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          payment_id?: string;
          provider?: string;
          external_reference?: string | null;
          idempotency_key?: string;
          amount_cents?: number;
          status?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      request_assignments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          request_id: string;
          professional_id: string;
          purpose: string;
          assigned_by: string;
          assigned_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id: string;
          professional_id: string;
          purpose: string;
          assigned_by: string;
          assigned_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          request_id?: string;
          professional_id?: string;
          purpose?: string;
          assigned_by?: string;
          assigned_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_assignments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_assignments_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_assignments_request_id_fkey";
            columns: ["request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_assignments_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_assignments: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          profile_id: string;
          role: string;
          granted_by: string;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id: string;
          role: string;
          granted_by: string;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          profile_id?: string;
          role?: string;
          granted_by?: string;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_granted_by_fkey";
            columns: ["granted_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          quote_id: string | null;
          business_quote_id: string | null;
          appointment_id: string | null;
          company_id: string | null;
          payer_profile_id: string | null;
          total_cents: number;
          currency: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id?: string | null;
          business_quote_id?: string | null;
          appointment_id?: string | null;
          company_id?: string | null;
          payer_profile_id?: string | null;
          total_cents: number;
          currency: string;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id?: string | null;
          business_quote_id?: string | null;
          appointment_id?: string | null;
          company_id?: string | null;
          payer_profile_id?: string | null;
          total_cents?: number;
          currency?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey";
            columns: ["appointment_id"];
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_business_quote_id_fkey";
            columns: ["business_quote_id"];
            referencedRelation: "business_quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_payer_profile_id_fkey";
            columns: ["payer_profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_price_versions: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          service_id: string;
          amount_cents: number;
          currency: string;
          valid_from: string;
          valid_until: string | null;
          approved_by: string | null;
          approved_at: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          service_id: string;
          amount_cents: number;
          currency: string;
          valid_from: string;
          valid_until?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          service_id?: string;
          amount_cents?: number;
          currency?: string;
          valid_from?: string;
          valid_until?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_price_versions_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_price_versions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_price_versions_service_id_fkey";
            columns: ["service_id"];
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_price_versions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requests: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          patient_id: string;
          requested_by: string;
          requested_service_id: string | null;
          address_id: string | null;
          status: string;
          submitted_at: string | null;
          payment_preference: string | null;
          preferred_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id: string;
          requested_by: string;
          requested_service_id?: string | null;
          address_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          payment_preference?: string | null;
          preferred_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          patient_id?: string;
          requested_by?: string;
          requested_service_id?: string | null;
          address_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          payment_preference?: string | null;
          preferred_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_address_id_patient_id_fkey";
            columns: ["address_id", "patient_id"];
            referencedRelation: "addresses";
            referencedColumns: ["id", "patient_id"];
          },
          {
            foreignKeyName: "service_requests_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_patient_id_fkey";
            columns: ["patient_id"];
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_requested_by_fkey";
            columns: ["requested_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_requested_service_id_fkey";
            columns: ["requested_service_id"];
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requirements: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          service_id: string;
          competency_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          service_id: string;
          competency_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          service_id?: string;
          competency_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_requirements_competency_id_fkey";
            columns: ["competency_id"];
            referencedRelation: "competencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requirements_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requirements_service_id_fkey";
            columns: ["service_id"];
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requirements_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          code: string;
          name: string;
          description: string;
          duration_minutes: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code: string;
          name: string;
          description: string;
          duration_minutes: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          code?: string;
          name?: string;
          description?: string;
          duration_minutes?: number;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_estimates: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          quote_id: string;
          tariff_id: string;
          provider: string;
          source: string;
          origin_latitude: number;
          origin_longitude: number;
          destination_latitude: number;
          destination_longitude: number;
          origin_kind: string;
          captured_at: string | null;
          calculated_at: string;
          appointment_at: string;
          departure_at: string;
          arrival_at: string;
          distance_meters: number;
          baseline_seconds: number;
          duration_seconds: number;
          delay_seconds: number;
          buffer_seconds: number;
          expires_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id: string;
          tariff_id: string;
          provider: string;
          source: string;
          origin_latitude: number;
          origin_longitude: number;
          destination_latitude: number;
          destination_longitude: number;
          origin_kind: string;
          captured_at?: string | null;
          calculated_at: string;
          appointment_at: string;
          departure_at: string;
          arrival_at: string;
          distance_meters: number;
          baseline_seconds: number;
          duration_seconds: number;
          delay_seconds: number;
          buffer_seconds: number;
          expires_at: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          quote_id?: string;
          tariff_id?: string;
          provider?: string;
          source?: string;
          origin_latitude?: number;
          origin_longitude?: number;
          destination_latitude?: number;
          destination_longitude?: number;
          origin_kind?: string;
          captured_at?: string | null;
          calculated_at?: string;
          appointment_at?: string;
          departure_at?: string;
          arrival_at?: string;
          distance_meters?: number;
          baseline_seconds?: number;
          duration_seconds?: number;
          delay_seconds?: number;
          buffer_seconds?: number;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_estimates_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_estimates_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_estimates_tariff_id_fkey";
            columns: ["tariff_id"];
            referencedRelation: "travel_tariff_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_estimates_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_tariff_versions: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          version: string;
          rules: Json;
          valid_from: string;
          valid_until: string | null;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version: string;
          rules: Json;
          valid_from: string;
          valid_until?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: string;
          rules?: Json;
          valid_from?: string;
          valid_until?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "travel_tariff_versions_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_tariff_versions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_tariff_versions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vital_signs: {
        Row: {
          id: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          encounter_id: string;
          measured_at: string;
          kind: string;
          value: number;
          unit: string;
          context: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          encounter_id: string;
          measured_at: string;
          kind: string;
          value: number;
          unit: string;
          context?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          encounter_id?: string;
          measured_at?: string;
          kind?: string;
          value?: number;
          unit?: string;
          context?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "vital_signs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vital_signs_encounter_id_fkey";
            columns: ["encounter_id"];
            referencedRelation: "clinical_encounters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vital_signs_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_quote: {
        Args: {
          quote: string;
        };
        Returns: undefined;
      };
      answer_follow_up: {
        Args: {
          followup: string;
          improvement: string;
          persistent_symptoms: boolean;
          wants_new_visit: boolean;
          answers: Json;
        };
        Returns: string;
      };
      apply_payment_event: {
        Args: {
          provider_name: string;
          event_reference: string;
          payload_hash: string;
          sale: string;
          payment_reference: string;
          amount: number;
          currency_code: string;
        };
        Returns: string;
      };
      assign_reviewer: {
        Args: {
          request: string;
          reviewer: string;
        };
        Returns: string;
      };
      claim_outbox: {
        Args: {
          worker: string;
          batch_size?: number;
        };
        Returns: Database["public"]["Tables"]["outbox_jobs"]["Row"][];
      };
      complete_encounter: {
        Args: {
          encounter: string;
          completed_at: string;
        };
        Returns: string;
      };
      confirm_appointment: {
        Args: {
          appointment: string;
        };
        Returns: undefined;
      };
      expire_holds: { Args: {}; Returns: number };
      finish_outbox: {
        Args: {
          job: string;
          worker: string;
          attempt: number;
          succeeded: boolean;
          error_code?: string;
        };
        Returns: undefined;
      };
      grant_role: {
        Args: {
          target_profile: string;
          assigned_role: string;
        };
        Returns: string;
      };
      hold_appointment: {
        Args: {
          quote: string;
          approval: string;
        };
        Returns: string;
      };
      list_operations_requests: {
        Args: {
          page_size?: number;
          before_time?: string;
          before_id?: string;
        };
        Returns: {
          id: string;
          status: string;
          service_id: string;
          preferred_at: string;
          created_at: string;
        }[];
      };
      offer_quote: {
        Args: {
          quote: string;
        };
        Returns: undefined;
      };
      read_clinical_release: {
        Args: {
          release: string;
        };
        Returns: Json;
      };
      read_clinical_request: {
        Args: {
          request: string;
          purpose: string;
        };
        Returns: Json;
      };
      record_assessment: {
        Args: {
          request: string;
          intake: string;
          protocol: string;
          decision: string;
          rationale: string;
          expires_at: string;
        };
        Returns: string;
      };
      register_patient: {
        Args: {
          display_name: string;
          birth_date?: string;
        };
        Returns: string;
      };
      request_refund: {
        Args: {
          payment: string;
          amount: number;
          request_key: string;
          reason: string;
        };
        Returns: string;
      };
      revoke_access: {
        Args: {
          object_type: string;
          object_id: string;
        };
        Returns: undefined;
      };
      submit_request: {
        Args: {
          request: string;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
