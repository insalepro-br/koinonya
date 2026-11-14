
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "automation_rules": {
                  Row: {
                    "active": boolean,"church_id": string,"created_at": string,"delay_days": number,"id": string,"name": string,"org_id": string,"target_stage": string | null,"template_text": string,"trigger_type": string,"use_ai_humanization": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"church_id": string,"created_at"?: string,"delay_days"?: number,"id"?: string,"name": string,"org_id": string,"target_stage"?: string | null,"template_text": string,"trigger_type": string,"use_ai_humanization"?: boolean
                  }
                  Update: {
                    "active"?: boolean,"church_id"?: string,"created_at"?: string,"delay_days"?: number,"id"?: string,"name"?: string,"org_id"?: string,"target_stage"?: string | null,"template_text"?: string,"trigger_type"?: string,"use_ai_humanization"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_rules_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "automation_rules_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"broadcast_campaigns": {
                  Row: {
                    "church_id": string,"created_at": string,"created_by_name": string | null,"id": string,"org_id": string,"recipient_ids": (string)[],"segment_label": string,"sent_count": number,"sent_member_ids": (string)[],"template_text": string,"title": string,"total_recipients": number
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"created_at"?: string,"created_by_name"?: string | null,"id"?: string,"org_id": string,"recipient_ids"?: (string)[],"segment_label"?: string,"sent_count"?: number,"sent_member_ids"?: (string)[],"template_text": string,"title": string,"total_recipients"?: number
                  }
                  Update: {
                    "church_id"?: string,"created_at"?: string,"created_by_name"?: string | null,"id"?: string,"org_id"?: string,"recipient_ids"?: (string)[],"segment_label"?: string,"sent_count"?: number,"sent_member_ids"?: (string)[],"template_text"?: string,"title"?: string,"total_recipients"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "broadcast_campaigns_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "broadcast_campaigns_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"cell_meetings": {
                  Row: {
                    "attendees_count": number,"cell_id": string,"church_id": string,"created_at": string,"date": string,"id": string,"notes": string | null,"org_id": string,"theme": string | null,"visitors_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "attendees_count"?: number,"cell_id": string,"church_id": string,"created_at"?: string,"date": string,"id"?: string,"notes"?: string | null,"org_id": string,"theme"?: string | null,"visitors_count"?: number
                  }
                  Update: {
                    "attendees_count"?: number,"cell_id"?: string,"church_id"?: string,"created_at"?: string,"date"?: string,"id"?: string,"notes"?: string | null,"org_id"?: string,"theme"?: string | null,"visitors_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cell_meetings_cell_id_fkey"
      columns: ["cell_id"]
isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cell_meetings_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "cell_meetings_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"cells": {
                  Row: {
                    "active": boolean,"address": string | null,"church_id": string,"co_leader_id": string | null,"created_at": string,"host_name": string | null,"id": string,"leader_id": string,"meeting_day": string,"meeting_time": string,"name": string,"neighborhood": string | null,"org_id": string,"target_audience": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"church_id": string,"co_leader_id"?: string | null,"created_at"?: string,"host_name"?: string | null,"id"?: string,"leader_id": string,"meeting_day": string,"meeting_time": string,"name": string,"neighborhood"?: string | null,"org_id": string,"target_audience"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"church_id"?: string,"co_leader_id"?: string | null,"created_at"?: string,"host_name"?: string | null,"id"?: string,"leader_id"?: string,"meeting_day"?: string,"meeting_time"?: string,"name"?: string,"neighborhood"?: string | null,"org_id"?: string,"target_audience"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cells_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "cells_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"church_events": {
                  Row: {
                    "active": boolean,"allow_public_registration": boolean,"capacity": number,"category": string,"church_id": string,"created_at": string,"created_by_name": string | null,"description": string,"id": string,"location": string,"org_id": string,"registration_fee": number,"start_date": string,"start_time": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allow_public_registration"?: boolean,"capacity"?: number,"category": string,"church_id": string,"created_at"?: string,"created_by_name"?: string | null,"description"?: string,"id"?: string,"location"?: string,"org_id": string,"registration_fee"?: number,"start_date": string,"start_time": string,"status"?: string,"title": string
                  }
                  Update: {
                    "active"?: boolean,"allow_public_registration"?: boolean,"capacity"?: number,"category"?: string,"church_id"?: string,"created_at"?: string,"created_by_name"?: string | null,"description"?: string,"id"?: string,"location"?: string,"org_id"?: string,"registration_fee"?: number,"start_date"?: string,"start_time"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "church_events_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "church_events_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"churches": {
                  Row: {
                    "address": string,"cep": string | null,"city": string | null,"cnpj": string | null,"created_at": string,"email": string,"id": string,"logo_url": string | null,"name": string,"org_id": string,"pastor_name": string,"phone": string,"state": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"cep"?: string | null,"city"?: string | null,"cnpj"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"org_id": string,"pastor_name"?: string,"phone"?: string,"state"?: string | null
                  }
                  Update: {
                    "address"?: string,"cep"?: string | null,"city"?: string | null,"cnpj"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"org_id"?: string,"pastor_name"?: string,"phone"?: string,"state"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "churches_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"discipleship_tracks": {
                  Row: {
                    "active": boolean,"category": string,"church_id": string,"created_at": string,"description": string,"id": string,"org_id": string,"steps": NonNullable<Json>,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category": string,"church_id": string,"created_at"?: string,"description"?: string,"id"?: string,"org_id": string,"steps"?: NonNullable<Json>,"title": string
                  }
                  Update: {
                    "active"?: boolean,"category"?: string,"church_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"org_id"?: string,"steps"?: NonNullable<Json>,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "discipleship_tracks_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "discipleship_tracks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"event_registrations": {
                  Row: {
                    "amount_paid": number,"checked_in_at": string | null,"church_id": string,"created_at": string,"event_id": string,"event_title": string,"id": string,"member_id": string | null,"notes": string | null,"org_id": string,"participant_email": string | null,"participant_name": string,"participant_phone": string,"payment_status": string,"source": string,"status": string,"ticket_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paid"?: number,"checked_in_at"?: string | null,"church_id": string,"created_at"?: string,"event_id": string,"event_title"?: string,"id"?: string,"member_id"?: string | null,"notes"?: string | null,"org_id": string,"participant_email"?: string | null,"participant_name": string,"participant_phone": string,"payment_status": string,"source": string,"status"?: string,"ticket_code": string
                  }
                  Update: {
                    "amount_paid"?: number,"checked_in_at"?: string | null,"church_id"?: string,"created_at"?: string,"event_id"?: string,"event_title"?: string,"id"?: string,"member_id"?: string | null,"notes"?: string | null,"org_id"?: string,"participant_email"?: string | null,"participant_name"?: string,"participant_phone"?: string,"payment_status"?: string,"source"?: string,"status"?: string,"ticket_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_registrations_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "event_registrations_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "church_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_registrations_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_registrations_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "church_id": string,"created_at": string,"description": string | null,"end_date": string,"id": string,"location": string | null,"member_id": string | null,"org_id": string,"responsible_id": string | null,"start_date": string,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"created_at"?: string,"description"?: string | null,"end_date": string,"id"?: string,"location"?: string | null,"member_id"?: string | null,"org_id": string,"responsible_id"?: string | null,"start_date": string,"title": string,"type": string
                  }
                  Update: {
                    "church_id"?: string,"created_at"?: string,"description"?: string | null,"end_date"?: string,"id"?: string,"location"?: string | null,"member_id"?: string | null,"org_id"?: string,"responsible_id"?: string | null,"start_date"?: string,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "events_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_campaigns": {
                  Row: {
                    "active": boolean,"church_id": string,"created_at": string,"description": string | null,"end_date": string | null,"id": string,"org_id": string,"raised_amount": number,"start_date": string,"target_amount": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"church_id": string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"org_id": string,"raised_amount"?: number,"start_date": string,"target_amount"?: number,"title": string
                  }
                  Update: {
                    "active"?: boolean,"church_id"?: string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"org_id"?: string,"raised_amount"?: number,"start_date"?: string,"target_amount"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_campaigns_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "financial_campaigns_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_transactions": {
                  Row: {
                    "amount": number,"campaign_id": string | null,"category": string,"church_id": string,"created_at": string,"date": string,"description": string,"id": string,"member_id": string | null,"member_name": string | null,"notes": string | null,"org_id": string,"payment_method": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"campaign_id"?: string | null,"category"?: string,"church_id": string,"created_at"?: string,"date": string,"description"?: string,"id"?: string,"member_id"?: string | null,"member_name"?: string | null,"notes"?: string | null,"org_id": string,"payment_method": string,"type": string
                  }
                  Update: {
                    "amount"?: number,"campaign_id"?: string | null,"category"?: string,"church_id"?: string,"created_at"?: string,"date"?: string,"description"?: string,"id"?: string,"member_id"?: string | null,"member_name"?: string | null,"notes"?: string | null,"org_id"?: string,"payment_method"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_transactions_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "financial_campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "financial_transactions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"member_track_progress": {
                  Row: {
                    "church_id": string,"completed_at": string | null,"completed_step_ids": (string)[],"created_at": string,"id": string,"member_id": string,"member_name": string | null,"mentor_id": string | null,"mentor_name": string | null,"notes": string | null,"org_id": string,"progress_percent": number,"started_at": string,"status": string,"step_completion_dates": Json | null,"track_id": string,"track_title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"completed_at"?: string | null,"completed_step_ids"?: (string)[],"created_at"?: string,"id"?: string,"member_id": string,"member_name"?: string | null,"mentor_id"?: string | null,"mentor_name"?: string | null,"notes"?: string | null,"org_id": string,"progress_percent"?: number,"started_at"?: string,"status"?: string,"step_completion_dates"?: Json | null,"track_id": string,"track_title"?: string | null
                  }
                  Update: {
                    "church_id"?: string,"completed_at"?: string | null,"completed_step_ids"?: (string)[],"created_at"?: string,"id"?: string,"member_id"?: string,"member_name"?: string | null,"mentor_id"?: string | null,"mentor_name"?: string | null,"notes"?: string | null,"org_id"?: string,"progress_percent"?: number,"started_at"?: string,"status"?: string,"step_completion_dates"?: Json | null,"track_id"?: string,"track_title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_track_progress_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "member_track_progress_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_track_progress_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_track_progress_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "discipleship_tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "active": boolean,"active_track_id": string | null,"active_track_title": string | null,"address": string | null,"cell_id": string | null,"cep": string | null,"channel": string,"church_id": string,"city": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"email": string,"engagement_score": number,"gender": string | null,"household_id": string | null,"household_name": string | null,"household_role": string | null,"id": string,"interests": string | null,"last_activity": string,"mentor_id": string | null,"mentor_name": string | null,"name": string,"neighborhood": string | null,"notes": string | null,"org_id": string,"phone": string,"registration_date": string,"religion": string | null,"responsible_leader_id": string | null,"stage": string,"track_progress_percent": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"active_track_id"?: string | null,"active_track_title"?: string | null,"address"?: string | null,"cell_id"?: string | null,"cep"?: string | null,"channel"?: string,"church_id": string,"city"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"email"?: string,"engagement_score"?: number,"gender"?: string | null,"household_id"?: string | null,"household_name"?: string | null,"household_role"?: string | null,"id"?: string,"interests"?: string | null,"last_activity"?: string,"mentor_id"?: string | null,"mentor_name"?: string | null,"name": string,"neighborhood"?: string | null,"notes"?: string | null,"org_id": string,"phone"?: string,"registration_date"?: string,"religion"?: string | null,"responsible_leader_id"?: string | null,"stage"?: string,"track_progress_percent"?: number | null
                  }
                  Update: {
                    "active"?: boolean,"active_track_id"?: string | null,"active_track_title"?: string | null,"address"?: string | null,"cell_id"?: string | null,"cep"?: string | null,"channel"?: string,"church_id"?: string,"city"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"email"?: string,"engagement_score"?: number,"gender"?: string | null,"household_id"?: string | null,"household_name"?: string | null,"household_role"?: string | null,"id"?: string,"interests"?: string | null,"last_activity"?: string,"mentor_id"?: string | null,"mentor_name"?: string | null,"name"?: string,"neighborhood"?: string | null,"notes"?: string | null,"org_id"?: string,"phone"?: string,"registration_date"?: string,"religion"?: string | null,"responsible_leader_id"?: string | null,"stage"?: string,"track_progress_percent"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_cell_fk"
      columns: ["cell_id"]
isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "members_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "members_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"message_logs": {
                  Row: {
                    "campaign_id": string | null,"campaign_name": string | null,"channel": string,"church_id": string,"id": string,"member_id": string | null,"member_name": string,"member_phone": string,"message_text": string,"org_id": string,"rule_id": string | null,"sent_at": string,"sent_by_id": string | null,"sent_by_name": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id"?: string | null,"campaign_name"?: string | null,"channel": string,"church_id": string,"id"?: string,"member_id"?: string | null,"member_name"?: string,"member_phone"?: string,"message_text": string,"org_id": string,"rule_id"?: string | null,"sent_at"?: string,"sent_by_id"?: string | null,"sent_by_name"?: string | null,"status": string
                  }
                  Update: {
                    "campaign_id"?: string | null,"campaign_name"?: string | null,"channel"?: string,"church_id"?: string,"id"?: string,"member_id"?: string | null,"member_name"?: string,"member_phone"?: string,"message_text"?: string,"org_id"?: string,"rule_id"?: string | null,"sent_at"?: string,"sent_by_id"?: string | null,"sent_by_name"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_logs_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "broadcast_campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_logs_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "message_logs_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_logs_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_logs_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "automation_rules"
      referencedColumns: ["id"]
    }
                  ]
                },"ministries": {
                  Row: {
                    "active": boolean,"church_id": string,"created_at": string,"default_roles": (string)[],"description": string | null,"id": string,"leader_id": string | null,"leader_name": string | null,"name": string,"org_id": string,"volunteer_ids": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"church_id": string,"created_at"?: string,"default_roles"?: (string)[],"description"?: string | null,"id"?: string,"leader_id"?: string | null,"leader_name"?: string | null,"name": string,"org_id": string,"volunteer_ids"?: (string)[]
                  }
                  Update: {
                    "active"?: boolean,"church_id"?: string,"created_at"?: string,"default_roles"?: (string)[],"description"?: string | null,"id"?: string,"leader_id"?: string | null,"leader_name"?: string | null,"name"?: string,"org_id"?: string,"volunteer_ids"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ministries_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "ministries_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"ministry_schedules": {
                  Row: {
                    "assignments": NonNullable<Json>,"church_id": string,"created_at": string,"created_by_name": string | null,"end_time": string | null,"event_id": string | null,"event_title": string,"id": string,"ministry_id": string,"ministry_name": string,"notes": string | null,"org_id": string,"service_date": string,"start_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignments"?: NonNullable<Json>,"church_id": string,"created_at"?: string,"created_by_name"?: string | null,"end_time"?: string | null,"event_id"?: string | null,"event_title"?: string,"id"?: string,"ministry_id": string,"ministry_name"?: string,"notes"?: string | null,"org_id": string,"service_date": string,"start_time": string
                  }
                  Update: {
                    "assignments"?: NonNullable<Json>,"church_id"?: string,"created_at"?: string,"created_by_name"?: string | null,"end_time"?: string | null,"event_id"?: string | null,"event_title"?: string,"id"?: string,"ministry_id"?: string,"ministry_name"?: string,"notes"?: string | null,"org_id"?: string,"service_date"?: string,"start_time"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ministry_schedules_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "ministry_schedules_ministry_id_fkey"
      columns: ["ministry_id"]
isOneToOne: false
      referencedRelation: "ministries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ministry_schedules_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "access_levels": Json | null,"active": boolean,"billing_cycle": string | null,"created_at": string,"id": string,"lgpd_consent_version": string,"max_members": number | null,"monthly_price": number | null,"name": string,"next_billing_date": string | null,"notes": string | null,"owner_email": string | null,"owner_id": string | null,"owner_name": string | null,"owner_phone": string | null,"pipeline_stages": Json | null,"plan": string,"subscription_status": string | null,"trial_ends_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_levels"?: Json | null,"active"?: boolean,"billing_cycle"?: string | null,"created_at"?: string,"id"?: string,"lgpd_consent_version"?: string,"max_members"?: number | null,"monthly_price"?: number | null,"name": string,"next_billing_date"?: string | null,"notes"?: string | null,"owner_email"?: string | null,"owner_id"?: string | null,"owner_name"?: string | null,"owner_phone"?: string | null,"pipeline_stages"?: Json | null,"plan"?: string,"subscription_status"?: string | null,"trial_ends_at"?: string | null
                  }
                  Update: {
                    "access_levels"?: Json | null,"active"?: boolean,"billing_cycle"?: string | null,"created_at"?: string,"id"?: string,"lgpd_consent_version"?: string,"max_members"?: number | null,"monthly_price"?: number | null,"name"?: string,"next_billing_date"?: string | null,"notes"?: string | null,"owner_email"?: string | null,"owner_id"?: string | null,"owner_name"?: string | null,"owner_phone"?: string | null,"pipeline_stages"?: Json | null,"plan"?: string,"subscription_status"?: string | null,"trial_ends_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"pastoral_visits": {
                  Row: {
                    "address_info": string | null,"church_id": string,"completed_at": string | null,"created_at": string,"created_by_name": string | null,"id": string,"member_id": string | null,"member_name": string,"member_phone": string | null,"notes": string | null,"org_id": string,"prayer_request_id": string | null,"responsible_id": string | null,"responsible_name": string | null,"scheduled_date": string,"scheduled_time": string | null,"status": string,"visit_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_info"?: string | null,"church_id": string,"completed_at"?: string | null,"created_at"?: string,"created_by_name"?: string | null,"id"?: string,"member_id"?: string | null,"member_name": string,"member_phone"?: string | null,"notes"?: string | null,"org_id": string,"prayer_request_id"?: string | null,"responsible_id"?: string | null,"responsible_name"?: string | null,"scheduled_date": string,"scheduled_time"?: string | null,"status"?: string,"visit_type": string
                  }
                  Update: {
                    "address_info"?: string | null,"church_id"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by_name"?: string | null,"id"?: string,"member_id"?: string | null,"member_name"?: string,"member_phone"?: string | null,"notes"?: string | null,"org_id"?: string,"prayer_request_id"?: string | null,"responsible_id"?: string | null,"responsible_name"?: string | null,"scheduled_date"?: string,"scheduled_time"?: string | null,"status"?: string,"visit_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pastoral_visits_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "pastoral_visits_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pastoral_visits_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pastoral_visits_prayer_request_id_fkey"
      columns: ["prayer_request_id"]
isOneToOne: false
      referencedRelation: "prayer_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"prayer_requests": {
                  Row: {
                    "answered_at": string | null,"category": string,"church_id": string,"created_at": string,"id": string,"member_id": string | null,"org_id": string,"prayer_count": number,"privacy": string,"request_text": string,"requester_name": string,"requester_phone": string | null,"source": string,"status": string,"testimony_notes": string | null,"urgency": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"category": string,"church_id": string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"org_id": string,"prayer_count"?: number,"privacy"?: string,"request_text": string,"requester_name": string,"requester_phone"?: string | null,"source"?: string,"status"?: string,"testimony_notes"?: string | null,"urgency"?: string
                  }
                  Update: {
                    "answered_at"?: string | null,"category"?: string,"church_id"?: string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"org_id"?: string,"prayer_count"?: number,"privacy"?: string,"request_text"?: string,"requester_name"?: string,"requester_phone"?: string | null,"source"?: string,"status"?: string,"testimony_notes"?: string | null,"urgency"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prayer_requests_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "prayer_requests_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prayer_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"saas_invoices": {
                  Row: {
                    "amount": number,"created_at": string,"due_date": string,"id": string,"notes": string | null,"org_id": string,"org_name": string,"paid_at": string | null,"payment_method": string,"pix_code": string | null,"reference_month": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"due_date": string,"id"?: string,"notes"?: string | null,"org_id": string,"org_name"?: string,"paid_at"?: string | null,"payment_method": string,"pix_code"?: string | null,"reference_month": string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"due_date"?: string,"id"?: string,"notes"?: string | null,"org_id"?: string,"org_name"?: string,"paid_at"?: string | null,"payment_method"?: string,"pix_code"?: string | null,"reference_month"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saas_invoices_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"service_checkins": {
                  Row: {
                    "allergies_notes": string | null,"checked_in_at": string,"checked_in_by": string | null,"checked_out_at": string | null,"checked_out_by": string | null,"checkin_type": string,"church_id": string,"created_at": string,"event_id": string | null,"event_title": string,"guardian_name": string | null,"guardian_phone": string | null,"household_name": string | null,"id": string,"is_visitor": boolean,"kids_room": string | null,"org_id": string,"person_id": string | null,"person_name": string,"person_phone": string | null,"security_code": string | null,"service_date": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergies_notes"?: string | null,"checked_in_at"?: string,"checked_in_by"?: string | null,"checked_out_at"?: string | null,"checked_out_by"?: string | null,"checkin_type": string,"church_id": string,"created_at"?: string,"event_id"?: string | null,"event_title"?: string,"guardian_name"?: string | null,"guardian_phone"?: string | null,"household_name"?: string | null,"id"?: string,"is_visitor"?: boolean,"kids_room"?: string | null,"org_id": string,"person_id"?: string | null,"person_name": string,"person_phone"?: string | null,"security_code"?: string | null,"service_date": string,"status"?: string
                  }
                  Update: {
                    "allergies_notes"?: string | null,"checked_in_at"?: string,"checked_in_by"?: string | null,"checked_out_at"?: string | null,"checked_out_by"?: string | null,"checkin_type"?: string,"church_id"?: string,"created_at"?: string,"event_id"?: string | null,"event_title"?: string,"guardian_name"?: string | null,"guardian_phone"?: string | null,"household_name"?: string | null,"id"?: string,"is_visitor"?: boolean,"kids_room"?: string | null,"org_id"?: string,"person_id"?: string | null,"person_name"?: string,"person_phone"?: string | null,"security_code"?: string | null,"service_date"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_checkins_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "service_checkins_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "auth_user_id": string | null,"avatar": string | null,"church_id": string | null,"created_at": string,"duty": string | null,"email": string,"id": string,"lgpd_consent_date": string | null,"name": string,"org_id": string | null,"permissions": (string)[],"role": string,"status": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"avatar"?: string | null,"church_id"?: string | null,"created_at"?: string,"duty"?: string | null,"email": string,"id"?: string,"lgpd_consent_date"?: string | null,"name": string,"org_id"?: string | null,"permissions"?: (string)[],"role"?: string,"status"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "auth_user_id"?: string | null,"avatar"?: string | null,"church_id"?: string | null,"created_at"?: string,"duty"?: string | null,"email"?: string,"id"?: string,"lgpd_consent_date"?: string | null,"name"?: string,"org_id"?: string | null,"permissions"?: (string)[],"role"?: string,"status"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "users_church_id_org_id_fkey"
      columns: ["church_id","org_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "users_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "claim_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "auth_user_id": string | null,
"avatar": string | null,
"church_id": string | null,
"created_at": string,
"duty": string | null,
"email": string,
"id": string,
"lgpd_consent_date": string | null,
"name": string,
"org_id": string | null,
"permissions": (string)[],
"role": string,
"status": string | null,
"whatsapp": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "users"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_public_church":
{ Args: { "church_id": string }; Returns: {
              "address": string,"city": string,"email": string,"id": string,"logo_url": string,"name": string,"org_id": string,"pastor_name": string,"phone": string,"state": string
            }[]
                           },
"new_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"onboard_organization":
{ Args: { "church_name": string,"org_name": string,"plan"?: string,"user_name": string,"whatsapp"?: string }; Returns: {
              "auth_user_id": string | null,
"avatar": string | null,
"church_id": string | null,
"created_at": string,
"duty": string | null,
"email": string,
"id": string,
"lgpd_consent_date": string | null,
"name": string,
"org_id": string | null,
"permissions": (string)[],
"role": string,
"status": string | null,
"whatsapp": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "users"
        isOneToOne: true
        isSetofReturn: false
      } },
"register_for_event":
{ Args: { "event_id": string,"notes"?: string,"participant_email"?: string,"participant_name": string,"participant_phone": string }; Returns: {
              "amount_paid": number,
"checked_in_at": string | null,
"church_id": string,
"created_at": string,
"event_id": string,
"event_title": string,
"id": string,
"member_id": string | null,
"notes": string | null,
"org_id": string,
"participant_email": string | null,
"participant_name": string,
"participant_phone": string,
"payment_status": string,
"source": string,
"status": string,
"ticket_code": string
            }
                          SetofOptions: {
        from: "*"
        to: "event_registrations"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_prayer_request":
{ Args: { "category"?: string,"church_id": string,"privacy"?: string,"request_text": string,"requester_name": string,"requester_phone"?: string,"urgency"?: string }; Returns: string
                           },
"submit_visitor_checkin":
{ Args: { "address"?: string,"cep"?: string,"church_id": string,"city"?: string,"email"?: string,"family_count"?: number,"family_notes"?: string,"gender"?: string,"how_met"?: string,"name": string,"neighborhood"?: string,"phone": string,"prayer_request"?: string }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
