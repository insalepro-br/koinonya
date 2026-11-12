
export enum MemberStage {
  NEW = 'NEW',
  FIRST_CONTACT = 'FIRST_CONTACT',
  RETURNING = 'RETURNING',
  MEMBER = 'MEMBER'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  PASTOR = 'PASTOR',
  LEADER = 'LEADER',
  RECEPTION = 'RECEPTION',
  VOLUNTEER = 'VOLUNTEER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum SubscriptionPlan {
  IGREJA = 'IGREJA',
  MULTI = 'MULTI',
  ENTERPRISE = 'ENTERPRISE'
}

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  border: string;
  iconName?: string;
  automation?: string;
}

export interface AccessLevel {
  id: string;
  name: string;
  roleKey?: string;
  desc: string;
  color?: string;
  isSystem?: boolean;
  permissions: string[];
}

export interface Organization {
  id: string;
  name: string;
  plan: SubscriptionPlan | string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  created_at: Date;
  active: boolean;
  lgpd_consent_version: string;
  pipeline_stages?: PipelineStage[];
  access_levels?: AccessLevel[];
  // SaaS Multi-Tenant & Billing fields
  subscription_status?: SubscriptionStatus;
  monthly_price?: number; // Valor da assinatura em R$ (ex: 149.00)
  billing_cycle?: BillingCycle; // 'MONTHLY' | 'ANNUAL'
  next_billing_date?: Date;
  trial_ends_at?: Date;
  max_members?: number;
  notes?: string;
}

export enum EventType {
  SERVICE = 'SERVICE',
  MEETING = 'MEETING',
  EVENT = 'EVENT',
  FOLLOW_UP = 'FOLLOW_UP',
  VISIT = 'VISIT'
}

export interface Church {
  id: string;
  org_id: string;
  name: string;
  cep?: string;
  address: string;
  city?: string;
  state?: string;
  cnpj?: string;
  pastor_name: string;
  phone: string;
  email: string;
  logo_url?: string;
  created_at: Date;
}

export interface ScheduleEvent {
  id: string;
  org_id: string;
  church_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  location?: string;
  type: EventType;
  member_id?: string;
  responsible_id?: string;
  created_at: Date;
}

export type UserPresenceStatus = 'online' | 'busy' | 'offline';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  role: UserRole | string;
  org_id: string;
  church_id: string;
  avatar?: string;
  status?: UserPresenceStatus;
  permissions: string[];
  lgpd_consent_date?: Date;
  duty?: string;
  password?: string;
}

export interface Household {
  id: string;
  org_id: string;
  church_id: string;
  name: string; // Ex: Família Silva
  address?: string;
  city?: string;
  neighborhood?: string;
  created_at: Date;
}

export interface Member {
  id: string;
  org_id: string;
  church_id: string;
  name: string;
  email: string;
  phone: string;
  cep?: string;
  gender?: string;
  religion?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  stage: MemberStage | string;
  last_activity: Date;
  engagement_score: number; 
  responsible_leader_id?: string;
  registration_date: Date;
  channel: string;
  interests?: string; 
  notes?: string;
  active?: boolean;
  deleted_at?: Date | null;
  deleted_by?: string;
  household_id?: string;
  household_name?: string;
  household_role?: 'HEAD' | 'SPOUSE' | 'CHILD' | 'OTHER';
  cell_id?: string;
  mentor_id?: string;
  mentor_name?: string;
  active_track_id?: string;
  active_track_title?: string;
  track_progress_percent?: number;
}

export interface Cell {
  id: string;
  org_id: string;
  church_id: string;
  name: string;
  leader_id: string;
  co_leader_id?: string;
  host_name?: string;
  meeting_day: 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO';
  meeting_time: string;
  address?: string;
  neighborhood?: string;
  target_audience?: string; // Misto, Jovens, Casais, Mulheres, Homens, etc.
  active: boolean;
  created_at: Date;
}

export interface CellMeeting {
  id: string;
  org_id: string;
  church_id?: string;
  cell_id: string;
  date: Date;
  theme?: string;
  attendees_count: number;
  visitors_count: number;
  notes?: string;
  created_at: Date;
}

export interface AutomationRule {
  id: string;
  org_id: string;
  church_id: string;
  name: string;
  trigger_type: 'CHECKIN_NEW' | 'STAGE_CHANGE' | 'INACTIVITY_ALERT' | 'FOLLOW_UP_D1' | 'FOLLOW_UP_D3' | 'FOLLOW_UP_D7';
  delay_days: number; // 0 = imediato, 1 = D+1, 3 = D+3, 7 = D+7
  template_text: string;
  use_ai_humanization: boolean;
  active: boolean;
  target_stage?: string;
  created_at: Date;
}

export type TransactionType = 'TITHE' | 'OFFERING' | 'CAMPAIGN' | 'EXPENSE';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_TRANSFER';

export interface FinancialTransaction {
  id: string;
  org_id: string;
  church_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: Date;
  member_id?: string;
  member_name?: string;
  campaign_id?: string;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: Date;
}

export interface FinancialCampaign {
  id: string;
  org_id: string;
  church_id: string;
  title: string;
  description?: string;
  target_amount: number;
  raised_amount: number;
  start_date: Date;
  end_date?: Date;
  active: boolean;
  created_at: Date;
}

export interface DiscipleshipStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  required?: boolean;
  target_stage?: string;
}

export type TrackCategory = 'INTEGRATION' | 'DOCTRINE' | 'LEADERSHIP' | 'MINISTRY';

export interface DiscipleshipTrack {
  id: string;
  org_id: string;
  church_id: string;
  title: string;
  description: string;
  category: TrackCategory;
  steps: DiscipleshipStep[];
  active: boolean;
  created_at: Date;
}

export interface MemberTrackProgress {
  id: string;
  org_id: string;
  church_id: string;
  member_id: string;
  member_name?: string;
  track_id: string;
  track_title?: string;
  mentor_id?: string;
  mentor_name?: string;
  completed_step_ids: string[];
  step_completion_dates?: Record<string, string>;
  notes?: string;
  started_at: Date;
  completed_at?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  progress_percent: number;
  created_at?: Date;
}

export interface MessageLog {
  id: string;
  org_id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  channel: 'WHATSAPP' | 'BULK_CAMPAIGN' | 'AUTOMATION_RULE';
  campaign_id?: string;
  campaign_name?: string;
  rule_id?: string;
  message_text: string;
  sent_by_id?: string;
  sent_by_name?: string;
  sent_at: Date;
  status: 'SENT' | 'OPENED_WA' | 'FAILED';
}

export interface BroadcastCampaign {
  id: string;
  org_id: string;
  church_id: string;
  title: string;
  segment_label: string;
  template_text: string;
  total_recipients: number;
  sent_count: number;
  recipient_ids: string[];
  sent_member_ids: string[];
  created_by_name?: string;
  created_at: Date;
}

export interface Ministry {
  id: string;
  org_id: string;
  church_id: string;
  name: string;
  description?: string;
  leader_id?: string;
  leader_name?: string;
  default_roles: string[];
  volunteer_ids: string[];
  active: boolean;
  created_at: Date;
}

export type AssignmentStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface ScheduleAssignment {
  id: string;
  person_id: string;
  person_name: string;
  person_phone?: string;
  person_type: 'MEMBER' | 'TEAM';
  role_name: string;
  status: AssignmentStatus;
  notes?: string;
}

export interface MinistrySchedule {
  id: string;
  org_id: string;
  church_id: string;
  ministry_id: string;
  ministry_name: string;
  event_id?: string;
  event_title: string;
  service_date: Date;
  start_time: string;
  end_time?: string;
  assignments: ScheduleAssignment[];
  notes?: string;
  created_by_name?: string;
  created_at: Date;
}

export type CheckinType = 'SERVICE' | 'KIDS' | 'EVENT';
export type CheckinStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export interface ServiceCheckin {
  id: string;
  org_id: string;
  church_id: string;
  event_id?: string;
  event_title: string;
  service_date: Date;
  checkin_type: CheckinType;
  person_id?: string;
  person_name: string;
  person_phone?: string;
  household_name?: string;
  is_visitor?: boolean;
  kids_room?: string;
  guardian_name?: string;
  guardian_phone?: string;
  security_code?: string;
  allergies_notes?: string;
  status: CheckinStatus;
  checked_in_at: Date;
  checked_out_at?: Date | null;
  checked_in_by?: string;
  checked_out_by?: string;
  created_at: Date;
}

export type PrayerCategory = 'HEALTH' | 'FAMILY' | 'FINANCE' | 'SPIRITUAL' | 'THANKSGIVING' | 'OTHER';
export type PrayerStatus = 'RECEIVED' | 'IN_PRAYER' | 'ANSWERED';
export type PrayerPrivacy = 'PUBLIC_CHURCH' | 'LEADERS_ONLY' | 'PASTOR_CONFIDENTIAL';

export interface PrayerRequest {
  id: string;
  org_id: string;
  church_id: string;
  member_id?: string;
  requester_name: string;
  requester_phone?: string;
  category: PrayerCategory;
  urgency: 'NORMAL' | 'URGENT';
  privacy: PrayerPrivacy;
  request_text: string;
  status: PrayerStatus;
  prayer_count: number;
  source: 'QR_CODE' | 'MANUAL' | 'CELL' | 'CHECKIN';
  testimony_notes?: string;
  answered_at?: Date | null;
  created_at: Date;
}

export type PastoralVisitType = 'HOME_VISIT' | 'HOSPITAL' | 'COUNSELING' | 'CALL' | 'NEW_CONVERT';
export type PastoralVisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

export interface PastoralVisit {
  id: string;
  org_id: string;
  church_id: string;
  member_id?: string;
  member_name: string;
  member_phone?: string;
  address_info?: string;
  visit_type: PastoralVisitType;
  scheduled_date: Date;
  scheduled_time?: string;
  responsible_id?: string;
  responsible_name?: string;
  status: PastoralVisitStatus;
  prayer_request_id?: string;
  notes?: string;
  completed_at?: Date | null;
  created_by_name?: string;
  created_at: Date;
}

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type SaaSInvoicePaymentMethod = 'PIX' | 'BOLETO' | 'CARD' | 'TRANSFER';

export interface SaaSInvoice {
  id: string;
  org_id: string;
  org_name: string;
  amount: number;
  due_date: Date;
  paid_at?: Date | null;
  status: InvoiceStatus;
  payment_method: SaaSInvoicePaymentMethod;
  reference_month: string; // Ex: '2026-11'
  pix_code?: string;
  notes?: string;
  created_at: Date;
}

export type ChurchEventCategory = 'CONFERENCE' | 'RETREAT' | 'BAPTISM' | 'COURSE' | 'WORKSHOP' | 'SPECIAL_SERVICE';
export type ChurchEventStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED';

export interface ChurchEvent {
  id: string;
  org_id: string;
  church_id: string;
  title: string;
  description: string;
  category: ChurchEventCategory;
  start_date: Date;
  start_time: string;
  location: string;
  capacity: number;
  registration_fee: number;
  allow_public_registration: boolean;
  status: ChurchEventStatus;
  active: boolean;
  created_by_name?: string;
  created_at: Date;
}

export type RegistrationPaymentStatus = 'FREE' | 'PENDING' | 'PAID';
export type RegistrationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CANCELED';

export interface EventRegistration {
  id: string;
  org_id: string;
  church_id: string;
  event_id: string;
  event_title: string;
  member_id?: string;
  participant_name: string;
  participant_phone: string;
  participant_email?: string;
  ticket_code: string;
  payment_status: RegistrationPaymentStatus;
  amount_paid: number;
  status: RegistrationStatus;
  source: 'PUBLIC_PORTAL' | 'MANUAL';
  notes?: string;
  checked_in_at?: Date | null;
  created_at: Date;
}
