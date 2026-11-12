
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  FirestoreError
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Member, ScheduleEvent, SystemUser, Church, Organization, Cell, CellMeeting, AutomationRule, FinancialTransaction, FinancialCampaign, DiscipleshipTrack, MemberTrackProgress, MessageLog, BroadcastCampaign, Ministry, MinistrySchedule, ServiceCheckin, PrayerRequest, PastoralVisit, SaaSInvoice, ChurchEvent, EventRegistration } from '../types';

const handleFirestoreError = (error: any, operationType: string, path: string | null = null) => {
  console.error(`Firestore Error [${operationType}] at ${path}:`, error);
  
  const errorInfo = {
    error: error.message || String(error),
    operationType,
    path,
    authInfo: auth.currentUser ? {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email || '',
      emailVerified: auth.currentUser.emailVerified,
      isAnonymous: auth.currentUser.isAnonymous,
      providerInfo: auth.currentUser.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    } : null
  };

  if (error.code === 'permission-denied') {
    throw new Error(JSON.stringify(errorInfo));
  }
  
  if (error.message && error.message.includes('the client is offline')) {
    throw new Error("Conexão perdida: O sistema não conseguiu alcançar o banco de dados. Verifique sua conexão ou se o banco Firestore está ativo no seu console.");
  }

  throw error;
};

export const parseFirestoreDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Removes undefined fields from objects before sending to Firestore,
 * preventing 'Unsupported field value: undefined' errors.
 */
export const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => (item === undefined ? null : sanitizeForFirestore(item)));
  
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
};

const mapMemberDoc = (docData: any): Member => ({
  ...docData,
  active: docData.active !== false,
  deleted_at: docData.deleted_at ? parseFirestoreDate(docData.deleted_at) : null,
  registration_date: parseFirestoreDate(docData.registration_date),
  last_activity: parseFirestoreDate(docData.last_activity),
  engagement_score: typeof docData.engagement_score === 'number' ? docData.engagement_score : 50,
});

const mapEventDoc = (docData: any): ScheduleEvent => ({
  ...docData,
  start_date: parseFirestoreDate(docData.start_date),
  end_date: parseFirestoreDate(docData.end_date),
  created_at: parseFirestoreDate(docData.created_at),
});

const mapCellDoc = (docData: any): Cell => ({
  ...docData,
  active: docData.active !== false,
  created_at: parseFirestoreDate(docData.created_at),
});

const mapCellMeetingDoc = (docData: any): CellMeeting => ({
  ...docData,
  date: parseFirestoreDate(docData.date),
  created_at: parseFirestoreDate(docData.created_at),
});

const mapAutomationRuleDoc = (docData: any): AutomationRule => ({
  ...docData,
  active: docData.active !== false,
  created_at: parseFirestoreDate(docData.created_at),
});

const mapTransactionDoc = (docData: any): FinancialTransaction => ({
  ...docData,
  date: parseFirestoreDate(docData.date),
  created_at: parseFirestoreDate(docData.created_at),
});

const mapCampaignDoc = (docData: any): FinancialCampaign => ({
  ...docData,
  start_date: parseFirestoreDate(docData.start_date),
  end_date: docData.end_date ? parseFirestoreDate(docData.end_date) : undefined,
  created_at: parseFirestoreDate(docData.created_at),
});

const mapOrganizationDoc = (docData: any): Organization => ({
  ...docData,
  created_at: parseFirestoreDate(docData.created_at),
  next_billing_date: docData.next_billing_date ? parseFirestoreDate(docData.next_billing_date) : undefined,
  trial_ends_at: docData.trial_ends_at ? parseFirestoreDate(docData.trial_ends_at) : undefined,
  subscription_status: docData.subscription_status || 'ACTIVE',
  monthly_price: typeof docData.monthly_price === 'number' ? docData.monthly_price : 149,
  billing_cycle: docData.billing_cycle || 'MONTHLY',
  active: docData.active !== false
});

const mapDiscipleshipTrackDoc = (docData: any): DiscipleshipTrack => ({
  ...docData,
  active: docData.active !== false,
  steps: Array.isArray(docData.steps) ? docData.steps : [],
  created_at: parseFirestoreDate(docData.created_at)
});

const mapMemberTrackProgressDoc = (docData: any): MemberTrackProgress => ({
  ...docData,
  completed_step_ids: Array.isArray(docData.completed_step_ids) ? docData.completed_step_ids : [],
  started_at: parseFirestoreDate(docData.started_at),
  completed_at: docData.completed_at ? parseFirestoreDate(docData.completed_at) : undefined,
  created_at: docData.created_at ? parseFirestoreDate(docData.created_at) : undefined,
  progress_percent: typeof docData.progress_percent === 'number' ? docData.progress_percent : 0,
  status: docData.status || 'IN_PROGRESS'
});

const mapMessageLogDoc = (docData: any): MessageLog => ({
  ...docData,
  sent_at: parseFirestoreDate(docData.sent_at),
  status: docData.status || 'OPENED_WA',
  channel: docData.channel || 'WHATSAPP'
});

const mapBroadcastCampaignDoc = (docData: any): BroadcastCampaign => ({
  ...docData,
  recipient_ids: Array.isArray(docData.recipient_ids) ? docData.recipient_ids : [],
  sent_member_ids: Array.isArray(docData.sent_member_ids) ? docData.sent_member_ids : [],
  total_recipients: typeof docData.total_recipients === 'number' ? docData.total_recipients : 0,
  sent_count: typeof docData.sent_count === 'number' ? docData.sent_count : 0,
  created_at: parseFirestoreDate(docData.created_at)
});

const mapMinistryDoc = (docData: any): Ministry => ({
  ...docData,
  default_roles: Array.isArray(docData.default_roles) ? docData.default_roles : [],
  volunteer_ids: Array.isArray(docData.volunteer_ids) ? docData.volunteer_ids : [],
  active: docData.active !== false,
  created_at: parseFirestoreDate(docData.created_at)
});

const mapMinistryScheduleDoc = (docData: any): MinistrySchedule => ({
  ...docData,
  assignments: Array.isArray(docData.assignments) ? docData.assignments : [],
  service_date: parseFirestoreDate(docData.service_date),
  created_at: parseFirestoreDate(docData.created_at)
});

const mapServiceCheckinDoc = (docData: any): ServiceCheckin => ({
  ...docData,
  service_date: parseFirestoreDate(docData.service_date),
  checked_in_at: parseFirestoreDate(docData.checked_in_at),
  checked_out_at: docData.checked_out_at ? parseFirestoreDate(docData.checked_out_at) : null,
  created_at: parseFirestoreDate(docData.created_at),
  status: docData.status || 'CHECKED_IN',
  checkin_type: docData.checkin_type || 'SERVICE'
});

const mapPrayerRequestDoc = (docData: any): PrayerRequest => ({
  ...docData,
  category: docData.category || 'OTHER',
  urgency: docData.urgency || 'NORMAL',
  privacy: docData.privacy || 'LEADERS_ONLY',
  status: docData.status || 'RECEIVED',
  prayer_count: typeof docData.prayer_count === 'number' ? docData.prayer_count : 0,
  source: docData.source || 'MANUAL',
  answered_at: docData.answered_at ? parseFirestoreDate(docData.answered_at) : null,
  created_at: parseFirestoreDate(docData.created_at)
});

const mapPastoralVisitDoc = (docData: any): PastoralVisit => ({
  ...docData,
  visit_type: docData.visit_type || 'HOME_VISIT',
  status: docData.status || 'SCHEDULED',
  scheduled_date: parseFirestoreDate(docData.scheduled_date),
  completed_at: docData.completed_at ? parseFirestoreDate(docData.completed_at) : null,
  created_at: parseFirestoreDate(docData.created_at)
});

const mapSaaSInvoiceDoc = (docData: any): SaaSInvoice => ({
  ...docData,
  amount: typeof docData.amount === 'number' ? docData.amount : 149,
  status: docData.status || 'PENDING',
  payment_method: docData.payment_method || 'PIX',
  due_date: parseFirestoreDate(docData.due_date),
  paid_at: docData.paid_at ? parseFirestoreDate(docData.paid_at) : null,
  created_at: parseFirestoreDate(docData.created_at)
});

const mapChurchEventDoc = (docData: any): ChurchEvent => ({
  ...docData,
  category: docData.category || 'CONFERENCE',
  status: docData.status || 'OPEN',
  capacity: typeof docData.capacity === 'number' ? docData.capacity : 100,
  registration_fee: typeof docData.registration_fee === 'number' ? docData.registration_fee : 0,
  allow_public_registration: docData.allow_public_registration !== false,
  active: docData.active !== false,
  start_date: parseFirestoreDate(docData.start_date),
  created_at: parseFirestoreDate(docData.created_at)
});

const mapEventRegistrationDoc = (docData: any): EventRegistration => ({
  ...docData,
  payment_status: docData.payment_status || 'FREE',
  amount_paid: typeof docData.amount_paid === 'number' ? docData.amount_paid : 0,
  status: docData.status || 'CONFIRMED',
  source: docData.source || 'MANUAL',
  checked_in_at: docData.checked_in_at ? parseFirestoreDate(docData.checked_in_at) : null,
  created_at: parseFirestoreDate(docData.created_at)
});

export const KoinoniaDB = {
  // Members
  subscribeMembers: (orgId: string, callback: (members: Member[]) => void) => {
    const q = query(collection(db, "members"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => mapMemberDoc(doc.data()));
      callback(members);
    }, (err) => handleFirestoreError(err, 'list', 'members'));
  },
  saveMember: async (member: Member) => {
    try {
      const payload = sanitizeForFirestore({
        ...member,
        active: member.active !== false,
        registration_date: parseFirestoreDate(member.registration_date),
        last_activity: parseFirestoreDate(member.last_activity),
      });
      await setDoc(doc(db, "members", member.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `members/${member.id}`); }
  },
  // Soft Delete: Archives the member instead of hard-deleting, keeping all ministry records safe
  deleteMember: async (id: string, deletedBy?: string) => {
    try {
      await updateDoc(doc(db, "members", id), {
        active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy || auth.currentUser?.email || 'system'
      });
    } catch (err) { handleFirestoreError(err, 'update', `members/${id}`); }
  },
  // Restore archived member back to active status
  restoreMember: async (id: string) => {
    try {
      await updateDoc(doc(db, "members", id), {
        active: true,
        deleted_at: null,
        deleted_by: null
      });
    } catch (err) { handleFirestoreError(err, 'update', `members/${id}`); }
  },
  // Hard Delete: Reserved for GDPR/LGPD compliance when explicitly requested
  permanentDeleteMember: async (id: string) => {
    try {
      await deleteDoc(doc(db, "members", id));
    } catch (err) { handleFirestoreError(err, 'delete', `members/${id}`); }
  },
  seedInitialMembers: async (orgId: string, churchId: string) => {
    const demoMembers = [
      {
        id: Math.random().toString(36).substr(2, 9),
        org_id: orgId,
        church_id: churchId,
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
        phone: '+55 (11) 98888-1234',
        gender: 'Masculino',
        stage: 'NEW',
        last_activity: new Date(),
        engagement_score: 55,
        registration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        channel: 'QR_CODE',
        interests: 'Estudo Bíblico',
        notes: 'Primeira visita no culto de domingo.'
      },
      {
        id: Math.random().toString(36).substr(2, 9),
        org_id: orgId,
        church_id: churchId,
        name: 'Maria Oliveira',
        email: 'maria.oliveira@exemplo.com',
        phone: '+55 (11) 97777-5678',
        gender: 'Feminino',
        stage: 'FIRST_CONTACT',
        last_activity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        engagement_score: 75,
        registration_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        channel: 'INSTAGRAM',
        interests: 'Louvor e Adoração',
        notes: 'Deseja participar do grupo de conexão.'
      },
      {
        id: Math.random().toString(36).substr(2, 9),
        org_id: orgId,
        church_id: churchId,
        name: 'Carlos Santos',
        email: 'carlos.santos@exemplo.com',
        phone: '+55 (11) 96666-9012',
        gender: 'Masculino',
        stage: 'RETURNING',
        last_activity: new Date(),
        engagement_score: 85,
        registration_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        channel: 'INDICATION',
        interests: 'Ação Social',
        notes: 'Já participou de dois eventos e retornou ao culto.'
      },
      {
        id: Math.random().toString(36).substr(2, 9),
        org_id: orgId,
        church_id: churchId,
        name: 'Ana Beatriz Souza',
        email: 'ana.souza@exemplo.com',
        phone: '+55 (11) 95555-3456',
        gender: 'Feminino',
        stage: 'MEMBER',
        last_activity: new Date(),
        engagement_score: 95,
        registration_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        channel: 'VISITA_PRESENCIAL',
        interests: 'Ministério Infantil',
        notes: 'Batizada e integrada como membro ativa.'
      }
    ];

    for (const m of demoMembers) {
      await KoinoniaDB.saveMember(m as unknown as Member);
    }
  },

  // Events
  subscribeEvents: (orgId: string, callback: (events: ScheduleEvent[]) => void) => {
    const q = query(collection(db, "events"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => mapEventDoc(doc.data()));
      callback(events);
    }, (err) => handleFirestoreError(err, 'list', 'events'));
  },
  saveEvent: async (event: ScheduleEvent) => {
    try {
      const payload = sanitizeForFirestore({
        ...event,
        start_date: parseFirestoreDate(event.start_date),
        end_date: parseFirestoreDate(event.end_date),
        created_at: parseFirestoreDate(event.created_at),
      });
      await setDoc(doc(db, "events", event.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `events/${event.id}`); }
  },
  deleteEvent: async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err) { handleFirestoreError(err, 'delete', `events/${id}`); }
  },

  // Users / Team
  getUserProfile: async (userId: string): Promise<SystemUser | null> => {
    try {
      const d = await getDoc(doc(db, "users", userId));
      return d.exists() ? (d.data() as SystemUser) : null;
    } catch (err) { handleFirestoreError(err, 'get', `users/${userId}`); return null; }
  },
  saveUserProfile: async (user: SystemUser) => {
    try {
      const { password: _ignoredPassword, ...safeUser } = user as any;
      await setDoc(doc(db, "users", user.id), sanitizeForFirestore(safeUser));
    } catch (err) { handleFirestoreError(err, 'create', `users/${user.id}`); }
  },
  deleteUserProfile: async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (err) { handleFirestoreError(err, 'delete', `users/${userId}`); }
  },
  subscribeTeam: (orgId: string, callback: (users: SystemUser[]) => void) => {
    const q = query(collection(db, "users"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data() } as SystemUser));
      callback(users);
    }, (err) => handleFirestoreError(err, 'list', 'users'));
  },

  // Organizations & SaaS Multi-Tenant Management
  getOrganization: async (orgId: string): Promise<Organization | null> => {
    try {
      const d = await getDoc(doc(db, "organizations", orgId));
      return d.exists() ? mapOrganizationDoc(d.data()) : null;
    } catch (err) { handleFirestoreError(err, 'get', `organizations/${orgId}`); return null; }
  },
  saveOrganization: async (org: Organization) => {
    try {
      const payload = sanitizeForFirestore({
        ...org,
        created_at: parseFirestoreDate(org.created_at),
        next_billing_date: org.next_billing_date ? parseFirestoreDate(org.next_billing_date) : null,
        trial_ends_at: org.trial_ends_at ? parseFirestoreDate(org.trial_ends_at) : null,
      });
      await setDoc(doc(db, "organizations", org.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `organizations/${org.id}`); }
  },
  updateOrganizationFields: async (orgId: string, updates: Partial<Organization>) => {
    try {
      const payload = sanitizeForFirestore(updates);
      await updateDoc(doc(db, "organizations", orgId), payload);
    } catch (err) { handleFirestoreError(err, 'update', `organizations/${orgId}`); }
  },
  subscribeOrganization: (orgId: string, callback: (org: Organization | null) => void) => {
    return onSnapshot(doc(db, "organizations", orgId), (snapshot) => {
      callback(snapshot.exists() ? mapOrganizationDoc(snapshot.data()) : null);
    }, (err) => handleFirestoreError(err, 'get', `organizations/${orgId}`));
  },
  subscribeAllOrganizations: (callback: (orgs: Organization[]) => void) => {
    const q = collection(db, "organizations");
    return onSnapshot(q, (snapshot) => {
      const orgs = snapshot.docs.map(doc => mapOrganizationDoc(doc.data()));
      callback(orgs);
    }, (err) => handleFirestoreError(err, 'list', 'organizations'));
  },
  provisionTenantOrganization: async (data: {
    name: string;
    owner_name: string;
    owner_email: string;
    owner_phone?: string;
    plan: string;
    monthly_price: number;
    billing_cycle: 'MONTHLY' | 'ANNUAL';
    trial_days?: number;
    notes?: string;
  }): Promise<Organization> => {
    const orgId = 'org_' + Math.random().toString(36).substr(2, 8);
    const now = new Date();
    const trialDays = data.trial_days ?? 14;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const nextBillingDate = trialDays > 0 ? trialEndsAt : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newOrg: Organization = {
      id: orgId,
      name: data.name,
      plan: data.plan,
      owner_id: 'owner_' + orgId,
      owner_name: data.owner_name,
      owner_email: data.owner_email,
      owner_phone: data.owner_phone,
      created_at: now,
      active: true,
      lgpd_consent_version: '1.0',
      subscription_status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
      monthly_price: data.monthly_price,
      billing_cycle: data.billing_cycle,
      next_billing_date: nextBillingDate,
      trial_ends_at: trialEndsAt,
      notes: data.notes
    };

    await KoinoniaDB.saveOrganization(newOrg);

    // Provision the default Church branch for this tenant
    const churchId = 'church_' + orgId;
    const defaultChurch: Church = {
      id: churchId,
      org_id: orgId,
      name: data.name,
      address: 'Sede Principal',
      pastor_name: data.owner_name,
      phone: data.owner_phone || '',
      email: data.owner_email,
      created_at: now
    };
    await KoinoniaDB.saveChurch(defaultChurch);

    return newOrg;
  },
  seedInitialTenantsIfEmpty: async (currentOrg?: Organization | null) => {
    try {
      const snapshot = await getDocs(collection(db, "organizations"));
      if (snapshot.size <= 1) {
        const demoTenants: Organization[] = [
          {
            id: 'org_ad_central',
            name: 'Assembleia de Deus Central',
            plan: 'MULTI',
            owner_id: 'pastor_central',
            owner_name: 'Pr. Marcos Antônio',
            owner_email: 'pr.marcos@adcentral.org',
            owner_phone: '(11) 98765-4321',
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            active: true,
            lgpd_consent_version: '1.0',
            subscription_status: 'ACTIVE',
            monthly_price: 249.00,
            billing_cycle: 'MONTHLY',
            next_billing_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
            notes: 'Cliente desde 2025. 3 congregações ativas.'
          },
          {
            id: 'org_comunidade_graca',
            name: 'Comunidade da Graça Campinas',
            plan: 'IGREJA',
            owner_id: 'pastor_graca',
            owner_name: 'Pra. Débora Lins',
            owner_email: 'debora@comunidadedagraca.com.br',
            owner_phone: '(19) 99123-9876',
            created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            active: true,
            lgpd_consent_version: '1.0',
            subscription_status: 'ACTIVE',
            monthly_price: 149.00,
            billing_cycle: 'MONTHLY',
            next_billing_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
            notes: 'Forte uso do módulo de Células e Kanban.'
          },
          {
            id: 'org_batista_esperanca',
            name: 'Igreja Batista Esperança Viva',
            plan: 'IGREJA',
            owner_id: 'pastor_batista',
            owner_name: 'Pr. Roberto Albuquerque',
            owner_email: 'roberto@ibesperanca.org.br',
            owner_phone: '(21) 99876-1122',
            created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            active: true,
            lgpd_consent_version: '1.0',
            subscription_status: 'TRIAL',
            monthly_price: 149.00,
            billing_cycle: 'MONTHLY',
            trial_ends_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
            next_billing_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
            notes: 'Período de teste grátis (14 dias). Aguardando ativação de fatura PIX.'
          },
          {
            id: 'org_presbiteriana_betel',
            name: 'Igreja Presbiteriana Betel',
            plan: 'MULTI',
            owner_id: 'pastor_betel',
            owner_name: 'Rev. Samuel Carvalho',
            owner_email: 'rev.samuel@ipbetel.org',
            owner_phone: '(31) 98456-3344',
            created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
            active: true,
            lgpd_consent_version: '1.0',
            subscription_status: 'PAST_DUE',
            monthly_price: 249.00,
            billing_cycle: 'MONTHLY',
            next_billing_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            notes: 'Fatura vencida há 3 dias. Lembrete WhatsApp enviado.'
          }
        ];

        for (const t of demoTenants) {
          await KoinoniaDB.saveOrganization(t);
        }
      }
    } catch (e) {
      console.warn("Could not seed demo tenants:", e);
    }
  },

  // Churches
  subscribeChurches: (orgId: string, callback: (churches: Church[]) => void) => {
    const q = query(collection(db, "churches"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const churches = snapshot.docs.map(doc => ({ ...doc.data() } as Church));
      callback(churches);
    }, (err) => handleFirestoreError(err, 'list', 'churches'));
  },
  saveChurch: async (church: Church) => {
    try {
      await setDoc(doc(db, "churches", church.id), sanitizeForFirestore(church));
    } catch (err) { handleFirestoreError(err, 'create', `churches/${church.id}`); }
  },
  saveChurchData: async (church: Church) => {
    try {
      await setDoc(doc(db, "churches", church.id), sanitizeForFirestore(church));
    } catch (err) { handleFirestoreError(err, 'update', `churches/${church.id}`); }
  },

  // Public visitor check-in methods (no auth required)
  getPublicChurch: async (churchId: string): Promise<Church | null> => {
    try {
      const d = await getDoc(doc(db, "churches", churchId));
      return d.exists() ? ({ ...d.data() } as Church) : null;
    } catch (err) {
      console.warn("Could not fetch public church data:", err);
      return null;
    }
  },

  submitPublicVisitorCheckin: async (payload: {
    name: string;
    phone: string;
    email?: string;
    gender?: string;
    cep?: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    howMet?: string;
    prayerRequest?: string;
    familyCount?: number;
    familyNotes?: string;
    churchId: string;
    orgId: string;
  }): Promise<{ success: boolean; memberId: string; message: string }> => {
    try {
      const memberId = Math.random().toString(36).substr(2, 9);
      const combinedNotes = [
        payload.prayerRequest ? `🙏 Pedido de Oração: ${payload.prayerRequest}` : '',
        payload.howMet ? `📍 Como conheceu: ${payload.howMet}` : '',
        payload.neighborhood ? `🏠 Bairro: ${payload.neighborhood}` : '',
        payload.familyCount && payload.familyCount > 1 ? `👨‍👩‍👧‍👦 Família presente: ${payload.familyCount} pessoas (${payload.familyNotes || ''})` : '',
      ].filter(Boolean).join('\n\n');

      const newMember: Member = {
        id: memberId,
        org_id: payload.orgId,
        church_id: payload.churchId,
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim() || '',
        gender: payload.gender || '',
        cep: payload.cep || '',
        address: payload.address || '',
        neighborhood: payload.neighborhood || '',
        city: payload.city || '',
        stage: 'NEW',
        channel: 'QR_CODE',
        engagement_score: 50,
        registration_date: new Date(),
        last_activity: new Date(),
        notes: combinedNotes,
        interests: payload.prayerRequest ? 'Oração' : 'Acolhimento',
      };

      await setDoc(doc(db, "members", memberId), sanitizeForFirestore({
        ...newMember,
        registration_date: new Date(),
        last_activity: new Date()
      }));

      if (payload.prayerRequest && payload.prayerRequest.trim()) {
        const prayerId = 'pray_' + Math.random().toString(36).substr(2, 9);
        const prayerPayload: PrayerRequest = {
          id: prayerId,
          org_id: payload.orgId,
          church_id: payload.churchId,
          member_id: memberId,
          requester_name: payload.name.trim(),
          requester_phone: payload.phone.trim(),
          category: 'OTHER',
          urgency: 'NORMAL',
          privacy: 'LEADERS_ONLY',
          request_text: payload.prayerRequest.trim().slice(0, 2000),
          status: 'RECEIVED',
          prayer_count: 0,
          source: 'QR_CODE',
          created_at: new Date()
        };
        try {
          await setDoc(doc(db, "prayer_requests", prayerId), sanitizeForFirestore(prayerPayload));
        } catch (prayerErr) {
          console.warn("Aviso ao salvar pedido de oração público:", prayerErr);
        }
      }

      return { success: true, memberId, message: 'Check-in realizado com sucesso!' };
    } catch (err: any) {
      console.error("Erro ao registrar check-in público:", err);
      throw new Error(err?.message || 'Falha ao registrar check-in de visitante.');
    }
  },

  // Cells / Pequenos Grupos (Módulo 4 do Roadmap)
  subscribeCells: (orgId: string, callback: (cells: Cell[]) => void) => {
    const q = query(collection(db, "cells"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const cells = snapshot.docs.map(doc => mapCellDoc(doc.data()));
      callback(cells);
    }, (err) => handleFirestoreError(err, 'list', 'cells'));
  },
  saveCell: async (cell: Cell) => {
    try {
      const payload = sanitizeForFirestore({
        ...cell,
        active: cell.active !== false,
        created_at: parseFirestoreDate(cell.created_at),
      });
      await setDoc(doc(db, "cells", cell.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `cells/${cell.id}`); }
  },
  deleteCell: async (id: string) => {
    try {
      await updateDoc(doc(db, "cells", id), { active: false });
    } catch (err) { handleFirestoreError(err, 'update', `cells/${id}`); }
  },
  subscribeCellMeetings: (orgId: string, cellId: string, callback: (meetings: CellMeeting[]) => void) => {
    const q = query(collection(db, "cell_meetings"), where("org_id", "==", orgId), where("cell_id", "==", cellId));
    return onSnapshot(q, (snapshot) => {
      const meetings = snapshot.docs.map(doc => mapCellMeetingDoc(doc.data()));
      callback(meetings);
    }, (err) => handleFirestoreError(err, 'list', 'cell_meetings'));
  },
  saveCellMeeting: async (meeting: CellMeeting) => {
    try {
      const payload = sanitizeForFirestore({
        ...meeting,
        date: parseFirestoreDate(meeting.date),
        created_at: parseFirestoreDate(meeting.created_at),
      });
      await setDoc(doc(db, "cell_meetings", meeting.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `cell_meetings/${meeting.id}`); }
  },
  seedInitialCells: async (orgId: string, churchId: string, leaderId?: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const initialCells: Cell[] = [
      {
        id: `cell-1_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Célula Atos 2',
        leader_id: leaderId || 'leader-1',
        meeting_day: 'QUARTA',
        meeting_time: '20:00',
        neighborhood: 'Jardim das Flores',
        target_audience: 'Jovens & Adultos',
        active: true,
        created_at: new Date()
      },
      {
        id: `cell-2_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Célula Nova Aliança',
        leader_id: leaderId || 'leader-1',
        meeting_day: 'QUINTA',
        meeting_time: '19:30',
        neighborhood: 'Bosque dos Eucaliptos',
        target_audience: 'Famílias & Casais',
        active: true,
        created_at: new Date()
      },
      {
        id: `cell-3_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'PG Esperança Viva',
        leader_id: leaderId || 'leader-1',
        meeting_day: 'TERCA',
        meeting_time: '20:00',
        neighborhood: 'Centro',
        target_audience: 'Mulheres',
        active: true,
        created_at: new Date()
      }
    ];
    for (const c of initialCells) {
      await KoinoniaDB.saveCell(c);
    }
  },

  // Automation Rules & WhatsApp Flows (Módulo 3 do Roadmap)
  subscribeAutomationRules: (orgId: string, callback: (rules: AutomationRule[]) => void) => {
    const q = query(collection(db, "automation_rules"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const rules = snapshot.docs.map(doc => mapAutomationRuleDoc(doc.data()));
      callback(rules);
    }, (err) => handleFirestoreError(err, 'list', 'automation_rules'));
  },
  saveAutomationRule: async (rule: AutomationRule) => {
    try {
      const payload = sanitizeForFirestore({
        ...rule,
        active: rule.active !== false,
        created_at: parseFirestoreDate(rule.created_at),
      });
      await setDoc(doc(db, "automation_rules", rule.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `automation_rules/${rule.id}`); }
  },
  seedDefaultAutomationRules: async (orgId: string, churchId: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaults: AutomationRule[] = [
      {
        id: `rule-d0_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Boas-Vindas D+0 (Imediato após Check-in)',
        trigger_type: 'CHECKIN_NEW',
        delay_days: 0,
        template_text: 'Olá, {nome}! Que alegria imensa receber você na {igreja}! Nosso coração se alegra com a sua presença. Se precisar de qualquer oração ou ajuda, estamos à disposição. Seja muito bem-vindo(a)! 🕊️',
        use_ai_humanization: true,
        active: true,
        created_at: new Date()
      },
      {
        id: `rule-d1_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Follow-up D+1 (Pós-Culto de Domingo)',
        trigger_type: 'FOLLOW_UP_D1',
        delay_days: 1,
        template_text: 'Paz, {primeiro_nome}! Passando para saber como foi sua experiência ontem conosco na {igreja}. Já estamos orando por você e por sua semana!',
        use_ai_humanization: true,
        active: true,
        created_at: new Date()
      },
      {
        id: `rule-d3_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Conexão com Célula D+3 (Apresentação de Pequeno Grupo)',
        trigger_type: 'FOLLOW_UP_D3',
        delay_days: 3,
        template_text: 'Oi {primeiro_nome}, tudo bem? Aqui é da equipe da {igreja}. Temos um grupo de conexão acolhedor bem pertinho de você no bairro {bairro}. Gostaria de conhecer sem compromisso?',
        use_ai_humanization: true,
        active: true,
        created_at: new Date()
      },
      {
        id: `rule-d7_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Lembrete do Próximo Culto D+7',
        trigger_type: 'FOLLOW_UP_D7',
        delay_days: 7,
        template_text: '{primeiro_nome}, amanhã temos um culto especial na {igreja} e guardamos um lugar com carinho para você e sua família. Esperamos você às 19h!',
        use_ai_humanization: false,
        active: true,
        created_at: new Date()
      },
      {
        id: `rule-inactivity_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Alerta Pastoral de Estagnação (>7 dias parado)',
        trigger_type: 'INACTIVITY_ALERT',
        delay_days: 7,
        template_text: 'Atenção Líder {lider}: O visitante {nome} está há mais de 7 dias sem atividade na etapa de consolidação. Faça um contato acolhedor hoje!',
        use_ai_humanization: false,
        active: true,
        created_at: new Date()
      }
    ];
    for (const r of defaults) {
      await KoinoniaDB.saveAutomationRule(r);
    }
  },

  // --- GESTÃO FINANCEIRA BÁSICA (MÓDULO 6) ---
  subscribeTransactions: (orgId: string, callback: (txs: FinancialTransaction[]) => void) => {
    const q = query(collection(db, "financial_transactions"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => mapTransactionDoc(doc.data()));
      callback(txs.sort((a, b) => b.date.getTime() - a.date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'financial_transactions'));
  },

  saveTransaction: async (tx: FinancialTransaction) => {
    try {
      const payload = sanitizeForFirestore({
        ...tx,
        date: parseFirestoreDate(tx.date),
        created_at: parseFirestoreDate(tx.created_at)
      });
      await setDoc(doc(db, "financial_transactions", tx.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `financial_transactions/${tx.id}`); }
  },

  deleteTransaction: async (id: string) => {
    try {
      await deleteDoc(doc(db, "financial_transactions", id));
    } catch (err) { handleFirestoreError(err, 'delete', `financial_transactions/${id}`); }
  },

  subscribeCampaigns: (orgId: string, callback: (campaigns: FinancialCampaign[]) => void) => {
    const q = query(collection(db, "financial_campaigns"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const campaigns = snapshot.docs.map(doc => mapCampaignDoc(doc.data()));
      callback(campaigns);
    }, (err) => handleFirestoreError(err, 'list', 'financial_campaigns'));
  },

  saveCampaign: async (campaign: FinancialCampaign) => {
    try {
      const payload = sanitizeForFirestore({
        ...campaign,
        start_date: parseFirestoreDate(campaign.start_date),
        end_date: campaign.end_date ? parseFirestoreDate(campaign.end_date) : null,
        created_at: parseFirestoreDate(campaign.created_at)
      });
      await setDoc(doc(db, "financial_campaigns", campaign.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `financial_campaigns/${campaign.id}`); }
  },

  deleteCampaign: async (id: string) => {
    try {
      await deleteDoc(doc(db, "financial_campaigns", id));
    } catch (err) { handleFirestoreError(err, 'delete', `financial_campaigns/${id}`); }
  },

  seedInitialFinancialData: async (orgId: string, churchId: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const reformaCampaignId = `camp-reforma_${orgSlug}`;
    const defaultCampaigns: FinancialCampaign[] = [
      {
        id: reformaCampaignId,
        org_id: orgId,
        church_id: churchId,
        title: 'Reforma do Espaço Infantil & Berçário',
        description: 'Aquisição de piso emborrachado, climatização e brinquedos pedagógicos para as crianças.',
        target_amount: 15000,
        raised_amount: 8750,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        active: true,
        created_at: new Date()
      },
      {
        id: `camp-missoes_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Campanha de Missões Transculturais',
        description: 'Sustento dos missionários no sertão e apoio humanitário.',
        target_amount: 10000,
        raised_amount: 4200,
        start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        active: true,
        created_at: new Date()
      }
    ];

    const defaultTransactions: FinancialTransaction[] = [
      {
        id: `tx-1_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        type: 'TITHE',
        amount: 850,
        description: 'Dízimo - Culto de Celebração',
        category: 'Dízimos',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        payment_method: 'PIX',
        created_at: new Date()
      },
      {
        id: `tx-2_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        type: 'OFFERING',
        amount: 420,
        description: 'Oferta de Gratidão',
        category: 'Ofertas de Culto',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        payment_method: 'CASH',
        created_at: new Date()
      },
      {
        id: `tx-3_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        type: 'CAMPAIGN',
        amount: 1200,
        description: 'Doação para Reforma do Espaço Infantil',
        category: 'Campanhas',
        campaign_id: reformaCampaignId,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        payment_method: 'PIX',
        created_at: new Date()
      }
    ];

    for (const c of defaultCampaigns) {
      await KoinoniaDB.saveCampaign(c);
    }
    for (const t of defaultTransactions) {
      await KoinoniaDB.saveTransaction(t);
    }
  },

  // --- TRILHAS DE DISCIPULADO & CAPACITAÇÃO DE LÍDERES (ETAPA 1 DO ROADMAP) ---
  subscribeDiscipleshipTracks: (orgId: string, callback: (tracks: DiscipleshipTrack[]) => void) => {
    const q = query(collection(db, "discipleship_tracks"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const tracks = snapshot.docs.map(doc => mapDiscipleshipTrackDoc(doc.data()));
      callback(tracks);
    }, (err) => handleFirestoreError(err, 'list', 'discipleship_tracks'));
  },

  saveDiscipleshipTrack: async (track: DiscipleshipTrack) => {
    try {
      const payload = sanitizeForFirestore({
        ...track,
        created_at: parseFirestoreDate(track.created_at)
      });
      await setDoc(doc(db, "discipleship_tracks", track.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `discipleship_tracks/${track.id}`); }
  },

  deleteDiscipleshipTrack: async (id: string) => {
    try {
      await deleteDoc(doc(db, "discipleship_tracks", id));
    } catch (err) { handleFirestoreError(err, 'delete', `discipleship_tracks/${id}`); }
  },

  subscribeMemberTrackProgress: (orgId: string, callback: (progress: MemberTrackProgress[]) => void) => {
    const q = query(collection(db, "member_track_progress"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapMemberTrackProgressDoc(doc.data()));
      callback(list);
    }, (err) => handleFirestoreError(err, 'list', 'member_track_progress'));
  },

  saveMemberTrackProgress: async (progress: MemberTrackProgress) => {
    try {
      const payload = sanitizeForFirestore({
        ...progress,
        started_at: parseFirestoreDate(progress.started_at),
        completed_at: progress.completed_at ? parseFirestoreDate(progress.completed_at) : null,
        created_at: progress.created_at ? parseFirestoreDate(progress.created_at) : new Date()
      });
      await setDoc(doc(db, "member_track_progress", progress.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `member_track_progress/${progress.id}`); }
  },

  deleteMemberTrackProgress: async (id: string) => {
    try {
      await deleteDoc(doc(db, "member_track_progress", id));
    } catch (err) { handleFirestoreError(err, 'delete', `member_track_progress/${id}`); }
  },

  seedInitialDiscipleshipTracks: async (orgId: string, churchId: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultTracks: DiscipleshipTrack[] = [
      {
        id: `track-integracao_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Jornada de Integração & Novos Convertidos',
        description: 'Primeiros passos da fé cristã, decisão, consolidação e batismo nas águas.',
        category: 'INTEGRATION',
        active: true,
        created_at: new Date(),
        steps: [
          {
            id: 'step-acolhimento',
            title: '1. Acolhimento & Primeiro Contato',
            description: 'Ligação pastoral, oração e envio do kit de boas-vindas pelo WhatsApp.',
            order: 1,
            required: true,
            target_stage: 'FIRST_CONTACT'
          },
          {
            id: 'step-alianca',
            title: '2. Encontro de Novos Começos',
            description: 'Participação na reunião de acolhimento e conexão com um Pequeno Grupo/Célula.',
            order: 2,
            required: true,
            target_stage: 'RETURNING'
          },
          {
            id: 'step-pre-batismo',
            title: '3. Classe Pré-Batismal (Passos de Fé)',
            description: 'Estudo de 4 lições sobre salvação, fé, ceia do Senhor e compromisso bíblico.',
            order: 3,
            required: true
          },
          {
            id: 'step-batismo',
            title: '4. Batismo nas Águas & Recepção de Membro',
            description: 'Celebração pública do batismo e integração oficial ao corpo da congregação.',
            order: 4,
            required: true,
            target_stage: 'MEMBER'
          }
        ]
      },
      {
        id: `track-maturidade_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Trilha de Maturidade Cristã & Doutrina',
        description: 'Aprofundamento na Palavra, vida devocional diária, dons espirituais e mordomia cristã.',
        category: 'DOCTRINE',
        active: true,
        created_at: new Date(),
        steps: [
          {
            id: 'step-palavra-oracao',
            title: '1. Fundamentos da Oração & Bíblia',
            description: 'Desenvolvimento do hábito devocional diário e leitura bíblica orientada.',
            order: 1,
            required: true
          },
          {
            id: 'step-encontro-libertacao',
            title: '2. Encontro com Deus (Cura & Alinhamento)',
            description: 'Retiro imersivo ou fim de semana de restauração espiritual e emocional.',
            order: 2,
            required: true
          },
          {
            id: 'step-mordomia-dizimo',
            title: '3. Mordomia Cristã, Dízimos & Generosidade',
            description: 'Compreensão bíblica da administração financeira do Reino e honra a Deus.',
            order: 3,
            required: true
          },
          {
            id: 'step-dons-ministerio',
            title: '4. Descoberta de Dons Espirituais & Serviço',
            description: 'Mapeamento de talentos e ingresso em um ministério voluntário de serviço.',
            order: 4,
            required: true
          }
        ]
      },
      {
        id: `track-lideranca_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Escola de Formação de Líderes de Célula',
        description: 'Capacitação prática para liderar pequenos grupos, pastoreio individual e multiplicação.',
        category: 'LEADERSHIP',
        active: true,
        created_at: new Date(),
        steps: [
          {
            id: 'step-visao-celular',
            title: '1. Visão Celular & Dinâmica de Reunião',
            description: 'Princípios dos 4 momentos da célula: Quebra-Gelo, Louvor, Palavra e Visão.',
            order: 1,
            required: true
          },
          {
            id: 'step-pastoreio-1a1',
            title: '2. Cuidado Pastoral & Discipulado 1 a 1',
            description: 'Como conduzir um discípulo com amor, escuta ativa e confidencialidade bíblica.',
            order: 2,
            required: true
          },
          {
            id: 'step-evangelismo-multiplicacao',
            title: '3. Evangelismo Prático & Multiplicação',
            description: 'Estratégias de atração de novos vizinhos, amigos e planejamento de multiplicação.',
            order: 3,
            required: true
          },
          {
            id: 'step-estagio-co-lider',
            title: '4. Estágio Prático como Co-Líder',
            description: 'Atuação como vice-líder de uma célula por no mínimo 6 reuniões sob supervisão.',
            order: 4,
            required: true
          },
          {
            id: 'step-consagracao-lider',
            title: '5. Consagração & Envio como Líder Titular',
            description: 'Comissionamento público no culto dominical e abertura da nova célula.',
            order: 5,
            required: true,
            target_stage: 'LEADER'
          }
        ]
      }
    ];

    for (const t of defaultTracks) {
      await KoinoniaDB.saveDiscipleshipTrack(t);
    }
  },

  // --- CENTRAL DE DISPAROS EM MASSA & HISTÓRICO DE MENSAGENS (ETAPA 2 DO ROADMAP) ---
  subscribeMessageLogs: (orgId: string, callback: (logs: MessageLog[]) => void) => {
    const q = query(collection(db, "message_logs"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => mapMessageLogDoc(doc.data()));
      callback(logs.sort((a, b) => b.sent_at.getTime() - a.sent_at.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'message_logs'));
  },

  saveMessageLog: async (log: MessageLog) => {
    try {
      const payload = sanitizeForFirestore({
        ...log,
        sent_at: parseFirestoreDate(log.sent_at)
      });
      await setDoc(doc(db, "message_logs", log.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `message_logs/${log.id}`); }
  },

  deleteMessageLog: async (id: string) => {
    try {
      await deleteDoc(doc(db, "message_logs", id));
    } catch (err) { handleFirestoreError(err, 'delete', `message_logs/${id}`); }
  },

  subscribeBroadcastCampaigns: (orgId: string, callback: (campaigns: BroadcastCampaign[]) => void) => {
    const q = query(collection(db, "broadcast_campaigns"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const campaigns = snapshot.docs.map(doc => mapBroadcastCampaignDoc(doc.data()));
      callback(campaigns.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'broadcast_campaigns'));
  },

  saveBroadcastCampaign: async (campaign: BroadcastCampaign) => {
    try {
      const payload = sanitizeForFirestore({
        ...campaign,
        created_at: parseFirestoreDate(campaign.created_at)
      });
      await setDoc(doc(db, "broadcast_campaigns", campaign.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `broadcast_campaigns/${campaign.id}`); }
  },

  deleteBroadcastCampaign: async (id: string) => {
    try {
      await deleteDoc(doc(db, "broadcast_campaigns", id));
    } catch (err) { handleFirestoreError(err, 'delete', `broadcast_campaigns/${id}`); }
  },

  // --- ESCALAS DE MINISTÉRIOS & VOLUNTARIADO (ETAPA 3 DO ROADMAP) ---
  subscribeMinistries: (orgId: string, callback: (ministries: Ministry[]) => void) => {
    const q = query(collection(db, "ministries"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapMinistryDoc(doc.data()));
      callback(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, 'list', 'ministries'));
  },

  saveMinistry: async (ministry: Ministry) => {
    try {
      const payload = sanitizeForFirestore({
        ...ministry,
        active: ministry.active !== false,
        created_at: parseFirestoreDate(ministry.created_at)
      });
      await setDoc(doc(db, "ministries", ministry.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `ministries/${ministry.id}`); }
  },

  deleteMinistry: async (id: string) => {
    try {
      await deleteDoc(doc(db, "ministries", id));
    } catch (err) { handleFirestoreError(err, 'delete', `ministries/${id}`); }
  },

  subscribeMinistrySchedules: (orgId: string, callback: (schedules: MinistrySchedule[]) => void) => {
    const q = query(collection(db, "ministry_schedules"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapMinistryScheduleDoc(doc.data()));
      callback(list.sort((a, b) => a.service_date.getTime() - b.service_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'ministry_schedules'));
  },

  saveMinistrySchedule: async (schedule: MinistrySchedule) => {
    try {
      const payload = sanitizeForFirestore({
        ...schedule,
        service_date: parseFirestoreDate(schedule.service_date),
        created_at: parseFirestoreDate(schedule.created_at)
      });
      await setDoc(doc(db, "ministry_schedules", schedule.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `ministry_schedules/${schedule.id}`); }
  },

  deleteMinistrySchedule: async (id: string) => {
    try {
      await deleteDoc(doc(db, "ministry_schedules", id));
    } catch (err) { handleFirestoreError(err, 'delete', `ministry_schedules/${id}`); }
  },

  seedInitialMinistries: async (orgId: string, churchId: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaults: Ministry[] = [
      {
        id: `min-louvor_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Louvor & Adoração',
        description: 'Ministração musical nos cultos, ensaios semanais e eventos especiais.',
        default_roles: ['Ministro(a) / Voz Principal', 'Backing Vocal', 'Violão / Guitarra', 'Teclado', 'Baixo', 'Bateria'],
        volunteer_ids: [],
        active: true,
        created_at: new Date()
      },
      {
        id: `min-midia_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Mídia, Som & Projeção',
        description: 'Operação de áudio, projeção de letras/versículos, transmissão ao vivo e fotografia.',
        default_roles: ['Mesa de Som', 'Projeção / Telão', 'Transmissão / Câmera', 'Fotografia & Stories'],
        volunteer_ids: [],
        active: true,
        created_at: new Date()
      },
      {
        id: `min-recepcao_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Recepção & Boas-Vindas',
        description: 'Acolhimento na porta, orientação de assentos e auxílio no check-in digital de visitantes.',
        default_roles: ['Recepção Porta Principal', 'Check-in Digital / QR Code', 'Apoio de Corredor / Ordem'],
        volunteer_ids: [],
        active: true,
        created_at: new Date()
      },
      {
        id: `min-kids_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        name: 'Koinonya Kids',
        description: 'Ensino bíblico infantil, berçário e recreação cristã durante os cultos.',
        default_roles: ['Professor(a) Turma Kids', 'Auxiliar de Sala', 'Berçário', 'Check-in Kids'],
        volunteer_ids: [],
        active: true,
        created_at: new Date()
      }
    ];
    for (const m of defaults) {
      await KoinoniaDB.saveMinistry(m);
    }
  },

  // --- CHECK-IN DE CULTOS & KOINONYA KIDS (ETAPA 4 DO ROADMAP) ---
  subscribeServiceCheckins: (orgId: string, callback: (checkins: ServiceCheckin[]) => void) => {
    const q = query(collection(db, "service_checkins"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapServiceCheckinDoc(doc.data()));
      callback(list.sort((a, b) => b.checked_in_at.getTime() - a.checked_in_at.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'service_checkins'));
  },

  saveServiceCheckin: async (checkin: ServiceCheckin) => {
    try {
      const payload = sanitizeForFirestore({
        ...checkin,
        service_date: parseFirestoreDate(checkin.service_date),
        checked_in_at: parseFirestoreDate(checkin.checked_in_at),
        checked_out_at: checkin.checked_out_at ? parseFirestoreDate(checkin.checked_out_at) : null,
        created_at: parseFirestoreDate(checkin.created_at)
      });
      await setDoc(doc(db, "service_checkins", checkin.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `service_checkins/${checkin.id}`); }
  },

  deleteServiceCheckin: async (id: string) => {
    try {
      await deleteDoc(doc(db, "service_checkins", id));
    } catch (err) { handleFirestoreError(err, 'delete', `service_checkins/${id}`); }
  },

  // --- CUIDADO PASTORAL, PEDIDOS DE ORAÇÃO & VISITAS (ETAPA 5 DO ROADMAP) ---
  subscribePrayerRequests: (orgId: string, callback: (requests: PrayerRequest[]) => void) => {
    const q = query(collection(db, "prayer_requests"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapPrayerRequestDoc(doc.data()));
      callback(list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'prayer_requests'));
  },

  savePrayerRequest: async (req: PrayerRequest) => {
    try {
      const payload = sanitizeForFirestore({
        ...req,
        answered_at: req.answered_at ? parseFirestoreDate(req.answered_at) : null,
        created_at: parseFirestoreDate(req.created_at)
      });
      await setDoc(doc(db, "prayer_requests", req.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `prayer_requests/${req.id}`); }
  },

  deletePrayerRequest: async (id: string) => {
    try {
      await deleteDoc(doc(db, "prayer_requests", id));
    } catch (err) { handleFirestoreError(err, 'delete', `prayer_requests/${id}`); }
  },

  subscribePastoralVisits: (orgId: string, callback: (visits: PastoralVisit[]) => void) => {
    const q = query(collection(db, "pastoral_visits"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapPastoralVisitDoc(doc.data()));
      callback(list.sort((a, b) => a.scheduled_date.getTime() - b.scheduled_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'pastoral_visits'));
  },

  savePastoralVisit: async (visit: PastoralVisit) => {
    try {
      const payload = sanitizeForFirestore({
        ...visit,
        scheduled_date: parseFirestoreDate(visit.scheduled_date),
        completed_at: visit.completed_at ? parseFirestoreDate(visit.completed_at) : null,
        created_at: parseFirestoreDate(visit.created_at)
      });
      await setDoc(doc(db, "pastoral_visits", visit.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `pastoral_visits/${visit.id}`); }
  },

  deletePastoralVisit: async (id: string) => {
    try {
      await deleteDoc(doc(db, "pastoral_visits", id));
    } catch (err) { handleFirestoreError(err, 'delete', `pastoral_visits/${id}`); }
  },

  // --- FATURAMENTO SAAS & LEDGER DE FATURAS (ETAPA 6 DO ROADMAP) ---
  subscribeAllSaaSInvoices: (callback: (invoices: SaaSInvoice[]) => void) => {
    const q = collection(db, "saas_invoices");
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapSaaSInvoiceDoc(doc.data()));
      callback(list.sort((a, b) => b.due_date.getTime() - a.due_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'saas_invoices'));
  },

  subscribeOrgInvoices: (orgId: string, callback: (invoices: SaaSInvoice[]) => void) => {
    const q = query(collection(db, "saas_invoices"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapSaaSInvoiceDoc(doc.data()));
      callback(list.sort((a, b) => b.due_date.getTime() - a.due_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'saas_invoices'));
  },

  saveSaaSInvoice: async (invoice: SaaSInvoice) => {
    try {
      const payload = sanitizeForFirestore({
        ...invoice,
        amount: Number(invoice.amount) || 0,
        due_date: parseFirestoreDate(invoice.due_date),
        paid_at: invoice.paid_at ? parseFirestoreDate(invoice.paid_at) : null,
        created_at: parseFirestoreDate(invoice.created_at)
      });
      await setDoc(doc(db, "saas_invoices", invoice.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `saas_invoices/${invoice.id}`); }
  },

  deleteSaaSInvoice: async (id: string) => {
    try {
      await deleteDoc(doc(db, "saas_invoices", id));
    } catch (err) { handleFirestoreError(err, 'delete', `saas_invoices/${id}`); }
  },

  generateMonthlySaaSInvoices: async (
    orgs: Organization[],
    existingInvoices: SaaSInvoice[],
    referenceMonth: string
  ): Promise<number> => {
    let createdCount = 0;
    const [yearStr, monthStr] = referenceMonth.split('-');
    const dueYear = Number(yearStr) || new Date().getFullYear();
    const dueMonth = (Number(monthStr) || (new Date().getMonth() + 1)) - 1;
    const defaultDueDate = new Date(dueYear, dueMonth, 10, 23, 59, 0);

    for (const org of orgs) {
      const status = org.subscription_status || (org.active ? 'ACTIVE' : 'SUSPENDED');
      if (status === 'CANCELED') continue;

      const alreadyExists = existingInvoices.some(
        inv => inv.org_id === org.id && inv.reference_month === referenceMonth && inv.status !== 'CANCELED'
      );
      if (alreadyExists) continue;

      const planDefault = org.plan === 'ENTERPRISE' ? 499 : org.plan === 'MULTI' ? 249 : 149;
      const amount = typeof org.monthly_price === 'number' ? org.monthly_price : planDefault;
      const invoiceId = `inv_${org.id}_${referenceMonth.replace(/[^a-zA-Z0-9]/g, '')}`;
      const pixSlug = org.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);

      const newInvoice: SaaSInvoice = {
        id: invoiceId,
        org_id: org.id,
        org_name: org.name,
        amount,
        due_date: defaultDueDate,
        paid_at: null,
        status: defaultDueDate.getTime() < Date.now() ? 'OVERDUE' : 'PENDING',
        payment_method: 'PIX',
        reference_month: referenceMonth,
        pix_code: `00020126580014BR.GOV.BCB.PIX0136financeiro@koinonya.app5204000053039865802BR5913KOINONYA SAAS6009SAO PAULO62150511${pixSlug}${referenceMonth.replace('-', '')}6304A1B2`,
        notes: `Mensalidade ${org.plan || 'IGREJA'} - Ref. ${referenceMonth}`,
        created_at: new Date()
      };

      await KoinoniaDB.saveSaaSInvoice(newInvoice);
      createdCount += 1;
    }

    return createdCount;
  },

  // --- EVENTOS, INSCRIÇÕES & PORTAL PÚBLICO DA IGREJA (ETAPA 7 DO ROADMAP) ---
  subscribeChurchEvents: (orgId: string, callback: (events: ChurchEvent[]) => void) => {
    const q = query(collection(db, "church_events"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapChurchEventDoc(doc.data()));
      callback(list.sort((a, b) => a.start_date.getTime() - b.start_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'church_events'));
  },

  subscribePublicChurchEvents: (orgId: string, callback: (events: ChurchEvent[]) => void) => {
    const q = query(
      collection(db, "church_events"),
      where("org_id", "==", orgId),
      where("allow_public_registration", "==", true),
      where("active", "==", true)
    );
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapChurchEventDoc(doc.data()));
      callback(list.sort((a, b) => a.start_date.getTime() - b.start_date.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'church_events'));
  },

  saveChurchEvent: async (ev: ChurchEvent) => {
    try {
      const payload = sanitizeForFirestore({
        ...ev,
        capacity: Number(ev.capacity) || 100,
        registration_fee: Number(ev.registration_fee) || 0,
        allow_public_registration: ev.allow_public_registration !== false,
        active: ev.active !== false,
        start_date: parseFirestoreDate(ev.start_date),
        created_at: parseFirestoreDate(ev.created_at)
      });
      await setDoc(doc(db, "church_events", ev.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `church_events/${ev.id}`); }
  },

  deleteChurchEvent: async (id: string) => {
    try {
      await deleteDoc(doc(db, "church_events", id));
    } catch (err) { handleFirestoreError(err, 'delete', `church_events/${id}`); }
  },

  subscribeEventRegistrations: (orgId: string, callback: (regs: EventRegistration[]) => void) => {
    const q = query(collection(db, "event_registrations"), where("org_id", "==", orgId));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => mapEventRegistrationDoc(doc.data()));
      callback(list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
    }, (err) => handleFirestoreError(err, 'list', 'event_registrations'));
  },

  saveEventRegistration: async (reg: EventRegistration) => {
    try {
      const payload = sanitizeForFirestore({
        ...reg,
        amount_paid: Number(reg.amount_paid) || 0,
        checked_in_at: reg.checked_in_at ? parseFirestoreDate(reg.checked_in_at) : null,
        created_at: parseFirestoreDate(reg.created_at)
      });
      await setDoc(doc(db, "event_registrations", reg.id), payload);
    } catch (err) { handleFirestoreError(err, 'create', `event_registrations/${reg.id}`); }
  },

  submitPublicEventRegistration: async (data: {
    org_id: string;
    church_id: string;
    event_id: string;
    event_title: string;
    participant_name: string;
    participant_phone: string;
    participant_email?: string;
    registration_fee: number;
    notes?: string;
  }): Promise<EventRegistration> => {
    const regId = 'reg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ticketCode = `KNY-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Date.now()).slice(-3)}`;
    const isFree = (Number(data.registration_fee) || 0) <= 0;

    const reg: EventRegistration = {
      id: regId,
      org_id: data.org_id,
      church_id: data.church_id,
      event_id: data.event_id,
      event_title: data.event_title,
      participant_name: data.participant_name.trim(),
      participant_phone: data.participant_phone.trim(),
      participant_email: data.participant_email?.trim() || '',
      ticket_code: ticketCode,
      payment_status: isFree ? 'FREE' : 'PENDING',
      amount_paid: isFree ? 0 : Number(data.registration_fee),
      status: 'CONFIRMED',
      source: 'PUBLIC_PORTAL',
      notes: data.notes?.trim() || '',
      checked_in_at: null,
      created_at: new Date()
    };

    try {
      await setDoc(doc(db, "event_registrations", reg.id), sanitizeForFirestore(reg));
      return reg;
    } catch (err) {
      handleFirestoreError(err, 'create', `event_registrations/${reg.id}`);
      throw err;
    }
  },

  deleteEventRegistration: async (id: string) => {
    try {
      await deleteDoc(doc(db, "event_registrations", id));
    } catch (err) { handleFirestoreError(err, 'delete', `event_registrations/${id}`); }
  },

  submitPublicPrayerRequest: async (data: {
    org_id: string;
    church_id: string;
    requester_name: string;
    requester_phone?: string;
    category: PrayerRequest['category'];
    urgency: PrayerRequest['urgency'];
    privacy: PrayerRequest['privacy'];
    request_text: string;
  }): Promise<PrayerRequest> => {
    const reqId = 'pray_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const payload: PrayerRequest = {
      id: reqId,
      org_id: data.org_id,
      church_id: data.church_id,
      requester_name: data.requester_name.trim(),
      requester_phone: data.requester_phone?.trim() || '',
      category: data.category || 'OTHER',
      urgency: data.urgency || 'NORMAL',
      privacy: data.privacy || 'LEADERS_ONLY',
      request_text: data.request_text.trim(),
      status: 'RECEIVED',
      prayer_count: 0,
      source: 'QR_CODE',
      created_at: new Date()
    };

    try {
      await setDoc(doc(db, "prayer_requests", payload.id), sanitizeForFirestore(payload));
      return payload;
    } catch (err) {
      handleFirestoreError(err, 'create', `prayer_requests/${payload.id}`);
      throw err;
    }
  },

  seedInitialChurchEvents: async (orgId: string, churchId: string) => {
    const orgSlug = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);

    const defaults: ChurchEvent[] = [
      {
        id: `cev_batismo_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Batismo nas Águas & Celebração de Novas Vidas',
        description: 'Inscrição oficial para novos convertidos e discípulos que concluíram a classe pré-batismal.',
        category: 'BAPTISM',
        start_date: nextWeek,
        start_time: '10:00',
        location: 'Templo Principal • Tanque Batismal',
        capacity: 60,
        registration_fee: 0,
        allow_public_registration: true,
        status: 'OPEN',
        active: true,
        created_by_name: 'Koinonya',
        created_at: new Date()
      },
      {
        id: `cev_encontro_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Encontro com Deus • Imersão Espiritual',
        description: 'Fim de semana de cura, restauração familiar e fortalecimento espiritual para membros e visitantes.',
        category: 'RETREAT',
        start_date: twoWeeks,
        start_time: '19:30',
        location: 'Chácara Recanto da Graça',
        capacity: 120,
        registration_fee: 120,
        allow_public_registration: true,
        status: 'OPEN',
        active: true,
        created_by_name: 'Koinonya',
        created_at: new Date()
      },
      {
        id: `cev_lideranca_${orgSlug}`,
        org_id: orgId,
        church_id: churchId,
        title: 'Conferência Anual de Liderança & Células',
        description: 'Capacitação intensiva para líderes de células, voluntários de ministérios e consolidadores.',
        category: 'CONFERENCE',
        start_date: nextMonth,
        start_time: '09:00',
        location: 'Auditório Central',
        capacity: 250,
        registration_fee: 45,
        allow_public_registration: true,
        status: 'OPEN',
        active: true,
        created_by_name: 'Koinonya',
        created_at: new Date()
      }
    ];

    for (const ev of defaults) {
      await KoinoniaDB.saveChurchEvent(ev);
    }
  }
};
