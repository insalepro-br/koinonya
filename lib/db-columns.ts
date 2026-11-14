// Gerado por scripts/firebase-capture/gen-db-columns.ts. Não editar à mão: rode `pnpm db:types`.
export const TABLE_COLUMNS = {
  automation_rules: ['id', 'org_id', 'church_id', 'name', 'trigger_type', 'delay_days', 'template_text', 'use_ai_humanization', 'active', 'target_stage', 'created_at'],
  broadcast_campaigns: ['id', 'org_id', 'church_id', 'title', 'segment_label', 'template_text', 'total_recipients', 'sent_count', 'recipient_ids', 'sent_member_ids', 'created_by_name', 'created_at'],
  cell_meetings: ['id', 'org_id', 'church_id', 'cell_id', 'date', 'theme', 'attendees_count', 'visitors_count', 'notes', 'created_at'],
  cells: ['id', 'org_id', 'church_id', 'name', 'leader_id', 'co_leader_id', 'host_name', 'meeting_day', 'meeting_time', 'address', 'neighborhood', 'target_audience', 'active', 'created_at'],
  church_events: ['id', 'org_id', 'church_id', 'title', 'description', 'category', 'start_date', 'start_time', 'location', 'capacity', 'registration_fee', 'allow_public_registration', 'status', 'active', 'created_by_name', 'created_at'],
  churches: ['id', 'org_id', 'name', 'cep', 'address', 'city', 'state', 'cnpj', 'pastor_name', 'phone', 'email', 'logo_url', 'created_at'],
  discipleship_tracks: ['id', 'org_id', 'church_id', 'title', 'description', 'category', 'steps', 'active', 'created_at'],
  event_registrations: ['id', 'org_id', 'church_id', 'event_id', 'event_title', 'member_id', 'participant_name', 'participant_phone', 'participant_email', 'ticket_code', 'payment_status', 'amount_paid', 'status', 'source', 'notes', 'checked_in_at', 'created_at'],
  events: ['id', 'org_id', 'church_id', 'title', 'description', 'start_date', 'end_date', 'location', 'type', 'member_id', 'responsible_id', 'created_at'],
  financial_campaigns: ['id', 'org_id', 'church_id', 'title', 'description', 'target_amount', 'raised_amount', 'start_date', 'end_date', 'active', 'created_at'],
  financial_transactions: ['id', 'org_id', 'church_id', 'type', 'amount', 'description', 'category', 'date', 'member_id', 'member_name', 'campaign_id', 'payment_method', 'notes', 'created_at'],
  member_track_progress: ['id', 'org_id', 'church_id', 'member_id', 'member_name', 'track_id', 'track_title', 'mentor_id', 'mentor_name', 'completed_step_ids', 'step_completion_dates', 'notes', 'started_at', 'completed_at', 'status', 'progress_percent', 'created_at'],
  members: ['id', 'org_id', 'church_id', 'name', 'email', 'phone', 'cep', 'gender', 'religion', 'address', 'neighborhood', 'city', 'stage', 'last_activity', 'engagement_score', 'responsible_leader_id', 'registration_date', 'channel', 'interests', 'notes', 'active', 'deleted_at', 'deleted_by', 'household_id', 'household_name', 'household_role', 'cell_id', 'mentor_id', 'mentor_name', 'active_track_id', 'active_track_title', 'track_progress_percent', 'created_at'],
  message_logs: ['id', 'org_id', 'church_id', 'member_id', 'member_name', 'member_phone', 'channel', 'campaign_id', 'campaign_name', 'rule_id', 'message_text', 'sent_by_id', 'sent_by_name', 'sent_at', 'status'],
  ministries: ['id', 'org_id', 'church_id', 'name', 'description', 'leader_id', 'leader_name', 'default_roles', 'volunteer_ids', 'active', 'created_at'],
  ministry_schedules: ['id', 'org_id', 'church_id', 'ministry_id', 'ministry_name', 'event_id', 'event_title', 'service_date', 'start_time', 'end_time', 'assignments', 'notes', 'created_by_name', 'created_at'],
  organizations: ['id', 'name', 'plan', 'owner_id', 'owner_name', 'owner_email', 'owner_phone', 'active', 'lgpd_consent_version', 'pipeline_stages', 'access_levels', 'subscription_status', 'monthly_price', 'billing_cycle', 'next_billing_date', 'trial_ends_at', 'max_members', 'notes', 'created_at'],
  pastoral_visits: ['id', 'org_id', 'church_id', 'member_id', 'member_name', 'member_phone', 'address_info', 'visit_type', 'scheduled_date', 'scheduled_time', 'responsible_id', 'responsible_name', 'status', 'prayer_request_id', 'notes', 'completed_at', 'created_by_name', 'created_at'],
  prayer_requests: ['id', 'org_id', 'church_id', 'member_id', 'requester_name', 'requester_phone', 'category', 'urgency', 'privacy', 'request_text', 'status', 'prayer_count', 'source', 'testimony_notes', 'answered_at', 'created_at'],
  saas_invoices: ['id', 'org_id', 'org_name', 'amount', 'due_date', 'paid_at', 'status', 'payment_method', 'reference_month', 'pix_code', 'notes', 'created_at'],
  service_checkins: ['id', 'org_id', 'church_id', 'event_id', 'event_title', 'service_date', 'checkin_type', 'person_id', 'person_name', 'person_phone', 'household_name', 'is_visitor', 'kids_room', 'guardian_name', 'guardian_phone', 'security_code', 'allergies_notes', 'status', 'checked_in_at', 'checked_out_at', 'checked_in_by', 'checked_out_by', 'created_at'],
  users: ['id', 'org_id', 'church_id', 'name', 'email', 'whatsapp', 'role', 'avatar', 'status', 'permissions', 'lgpd_consent_date', 'duty', 'created_at'],
} as const;

export type TableName = keyof typeof TABLE_COLUMNS;
