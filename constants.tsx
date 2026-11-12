
import React from 'react';
import { MemberStage, Member, ScheduleEvent, EventType, PipelineStage } from './types';
import { 
  UserPlus, 
  Phone, 
  Clock, 
  CheckCircle,
  Smartphone,
  Globe,
  Instagram,
  Facebook,
  Heart,
  Flame,
  Droplets,
  Users,
  Award,
  BookOpen,
  Shield,
  Sparkles,
  Tag
} from 'lucide-react';

export const getStageIcon = (iconName?: string, className = "w-5 h-5") => {
  switch (iconName) {
    case 'UserPlus': return <UserPlus className={className} />;
    case 'Phone': return <Phone className={className} />;
    case 'Clock': return <Clock className={className} />;
    case 'CheckCircle': return <CheckCircle className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Droplets': return <Droplets className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Award': return <Award className={className} />;
    case 'BookOpen': return <BookOpen className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    default: return <Tag className={className} />;
  }
};

export const STAGE_COLOR_PRESETS = [
  { id: 'blue', label: 'Azul', color: 'bg-blue-100 text-blue-800', border: 'border-blue-300' },
  { id: 'amber', label: 'Âmbar', color: 'bg-amber-100 text-amber-800', border: 'border-amber-300' },
  { id: 'purple', label: 'Roxo', color: 'bg-purple-100 text-purple-800', border: 'border-purple-300' },
  { id: 'emerald', label: 'Verde', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300' },
  { id: 'rose', label: 'Rosa', color: 'bg-rose-100 text-rose-800', border: 'border-rose-300' },
  { id: 'indigo', label: 'Índigo', color: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-300' },
  { id: 'cyan', label: 'Ciano', color: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-300' },
  { id: 'orange', label: 'Laranja', color: 'bg-orange-100 text-orange-800', border: 'border-orange-300' },
];

export const STAGE_ICON_OPTIONS = [
  { id: 'UserPlus', label: 'Novo Contato' },
  { id: 'Phone', label: 'Ligação / Primeiro Contato' },
  { id: 'Clock', label: 'Retornando / Frequência' },
  { id: 'Heart', label: 'Acolhimento / Integração' },
  { id: 'BookOpen', label: 'Discipulado / Lição' },
  { id: 'Flame', label: 'Encontro / Avivamento' },
  { id: 'Droplets', label: 'Batismo' },
  { id: 'Users', label: 'Pequeno Grupo / Célula / PG' },
  { id: 'Award', label: 'Treinamento / Escola' },
  { id: 'CheckCircle', label: 'Membro Integrado' },
  { id: 'Shield', label: 'Liderança' },
  { id: 'Sparkles', label: 'Ministério / Voluntário' }
];

export const DEFAULT_STAGES: PipelineStage[] = [
  { 
    id: MemberStage.NEW, 
    label: 'Novo', 
    color: 'bg-blue-100 text-blue-800', 
    border: 'border-blue-200',
    iconName: 'UserPlus',
    automation: 'Boas-vindas imediato'
  },
  { 
    id: MemberStage.FIRST_CONTACT, 
    label: 'Primeiro Contato', 
    color: 'bg-amber-100 text-amber-800', 
    border: 'border-amber-200',
    iconName: 'Phone',
    automation: 'Lembrete de ligação'
  },
  { 
    id: MemberStage.RETURNING, 
    label: 'Retornando', 
    color: 'bg-purple-100 text-purple-800', 
    border: 'border-purple-200',
    iconName: 'Clock',
    automation: 'Convite para PG'
  },
  { 
    id: MemberStage.MEMBER, 
    label: 'Membro', 
    color: 'bg-emerald-100 text-emerald-800', 
    border: 'border-emerald-200',
    iconName: 'CheckCircle',
    automation: 'Integração ministerial'
  }
];

export const STAGES = DEFAULT_STAGES;

export const INITIAL_MEMBERS: Member[] = [
  {
    id: '1',
    org_id: 'default',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '+55 11 98888-8888',
    cep: '01310-100',
    neighborhood: 'Bela Vista',
    city: 'São Paulo/SP',
    address: 'Av. Paulista, 1000 - Apto 32',
    stage: MemberStage.NEW,
    last_activity: new Date(),
    engagement_score: 45,
    registration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    channel: 'QR_CODE',
    church_id: '1'
  },
  {
    id: '2',
    org_id: 'default',
    name: 'Maria Oliveira',
    email: 'maria@email.com',
    phone: '+55 11 97777-7777',
    cep: '04001-001',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo/SP',
    address: 'Rua Domingos de Morais, 540',
    stage: MemberStage.FIRST_CONTACT,
    last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    engagement_score: 78,
    registration_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    channel: 'WEBSITE',
    church_id: '1'
  },
  {
    id: '3',
    org_id: 'default',
    name: 'Carlos Santos',
    email: 'carlos@email.com',
    phone: '+55 11 96666-6666',
    cep: '01415-000',
    neighborhood: 'Jardins',
    city: 'São Paulo/SP',
    address: 'Rua Bela Cintra, 890',
    stage: MemberStage.MEMBER,
    last_activity: new Date(),
    engagement_score: 92,
    registration_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    channel: 'INSTAGRAM',
    church_id: '1'
  }
];

export const INITIAL_EVENTS: ScheduleEvent[] = [
  {
    id: 'e1',
    org_id: 'default',
    title: 'Culto de Celebração',
    description: 'Culto principal de domingo com foco em novos visitantes.',
    start_date: new Date(new Date().setHours(18, 0, 0, 0)),
    end_date: new Date(new Date().setHours(20, 0, 0, 0)),
    location: 'Santuário Principal',
    type: EventType.SERVICE,
    church_id: '1',
    created_at: new Date()
  },
  {
    id: 'e2',
    org_id: 'default',
    title: 'Reunião de Liderança',
    description: 'Alinhamento estratégico com os líderes de departamentos.',
    start_date: new Date(new Date().setDate(new Date().getDate() + 1)),
    end_date: new Date(new Date().setDate(new Date().getDate() + 1)),
    location: 'Sala de Conferências',
    type: EventType.MEETING,
    church_id: '1',
    created_at: new Date()
  }
];

export const INTEGRATIONS = [
  { name: 'WhatsApp API', icon: <Smartphone className="w-5 h-5 text-green-500" />, status: 'Conectado' },
  { name: 'Instagram Direct', icon: <Instagram className="w-5 h-5 text-pink-500" />, status: 'Conectado' },
  { name: 'Facebook Messenger', icon: <Facebook className="w-5 h-5 text-blue-600" />, status: 'Conectado' },
  { name: 'Sementeira Digital Sync', icon: <Globe className="w-5 h-5 text-emerald-600" />, status: 'Aguardando' },
];

export const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: 'Administrador(a)',
  PASTOR: 'Pastor(a)',
  LEADER: 'Líder / Coordenador(a)',
  RECEPTION: 'Recepção / Boas-Vindas',
  VOLUNTEER: 'Voluntário(a) / Apoio',
  SUPER_ADMIN: 'Super Administrador(a)',
};

export const ACCESS_COLOR_PRESETS = [
  { id: 'indigo', label: 'Índigo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'purple', label: 'Roxo', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'emerald', label: 'Verde', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'blue', label: 'Azul', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'amber', label: 'Âmbar', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'rose', label: 'Rosa', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'cyan', label: 'Ciano', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'slate', label: 'Cinza', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const AVAILABLE_PERMISSIONS = [
  { id: 'contatos_view', label: 'Visualizar Contatos', category: 'Contatos & Visitantes' },
  { id: 'contatos_edit', label: 'Cadastrar e Editar Contatos', category: 'Contatos & Visitantes' },
  { id: 'contatos_delete', label: 'Excluir Contatos', category: 'Contatos & Visitantes' },
  { id: 'pipeline_view', label: 'Visualizar Pipeline & Kanban', category: 'Pipeline' },
  { id: 'pipeline_edit', label: 'Mover e Gerenciar Fases', category: 'Pipeline' },
  { id: 'celulas_view', label: 'Visualizar Células e PG', category: 'Células' },
  { id: 'celulas_edit', label: 'Cadastrar Células e Lançar Reuniões', category: 'Células' },
  { id: 'discipulado_view', label: 'Visualizar Trilhas de Discipulado', category: 'Discipulado' },
  { id: 'discipulado_edit', label: 'Gerenciar Passos e Matricular Discípulos', category: 'Discipulado' },
  { id: 'ministries_view', label: 'Visualizar Ministérios e Escalas', category: 'Ministérios & Escalas' },
  { id: 'ministries_edit', label: 'Gerenciar Ministérios e Escalar Voluntários', category: 'Ministérios & Escalas' },
  { id: 'checkin_view', label: 'Visualizar Check-in de Cultos & Kids', category: 'Check-in & Kids' },
  { id: 'checkin_edit', label: 'Registrar Presença e Check-out Kids', category: 'Check-in & Kids' },
  { id: 'pastoral_view', label: 'Visualizar Pedidos de Oração & Visitas', category: 'Cuidado Pastoral' },
  { id: 'pastoral_edit', label: 'Gerenciar Orações, Visitas & Aconselhamento', category: 'Cuidado Pastoral' },
  { id: 'events_view', label: 'Visualizar Eventos, Inscrições & Portal', category: 'Eventos & Portal' },
  { id: 'events_edit', label: 'Gerenciar Eventos, Vagas & Check-in de Inscritos', category: 'Eventos & Portal' },
  { id: 'financeiro_view', label: 'Visualizar Extrato Financeiro', category: 'Financeiro' },
  { id: 'financeiro_edit', label: 'Lançar Entradas e Saídas', category: 'Financeiro' },
  { id: 'agenda_view', label: 'Visualizar Calendário e Agenda', category: 'Agenda' },
  { id: 'agenda_edit', label: 'Agendar Eventos e Visitas', category: 'Agenda' },
  { id: 'equipe_view', label: 'Visualizar Membros da Equipe', category: 'Equipe' },
  { id: 'equipe_edit', label: 'Adicionar e Editar Líderes', category: 'Equipe' },
  { id: 'automation_manage', label: 'Configurar Automações WhatsApp', category: 'Automação & IA' },
  { id: 'ai_insights', label: 'Gerar Diagnóstico Pastoral com IA', category: 'Automação & IA' },
  { id: 'church_edit', label: 'Editar Dados da Igreja e Sede', category: 'Administração' },
  { id: 'settings_manage', label: 'Gerenciar Níveis de Acesso e Permissões', category: 'Administração' },
];

export const DEFAULT_ACCESS_LEVELS = [
  {
    id: 'admin',
    name: 'Administrador(a)',
    roleKey: 'ADMIN',
    desc: 'Acesso irrestrito a todos os módulos, configurações globais e segurança.',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    isSystem: true,
    permissions: [
      'contatos_view', 'contatos_edit', 'contatos_delete',
      'pipeline_view', 'pipeline_edit',
      'celulas_view', 'celulas_edit',
      'discipulado_view', 'discipulado_edit',
      'ministries_view', 'ministries_edit',
      'checkin_view', 'checkin_edit',
      'pastoral_view', 'pastoral_edit',
      'events_view', 'events_edit',
      'financeiro_view', 'financeiro_edit',
      'agenda_view', 'agenda_edit',
      'equipe_view', 'equipe_edit',
      'church_edit',
      'automation_manage',
      'ai_insights',
      'settings_manage'
    ]
  },
  {
    id: 'pastor',
    name: 'Pastor(a)',
    roleKey: 'PASTOR',
    desc: 'Visão executiva e pastoral, IA avançada, relatórios, cuidado de equipe e células.',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    isSystem: true,
    permissions: [
      'contatos_view', 'contatos_edit',
      'pipeline_view', 'pipeline_edit',
      'celulas_view', 'celulas_edit',
      'discipulado_view', 'discipulado_edit',
      'ministries_view', 'ministries_edit',
      'checkin_view', 'checkin_edit',
      'pastoral_view', 'pastoral_edit',
      'events_view', 'events_edit',
      'financeiro_view',
      'agenda_view', 'agenda_edit',
      'equipe_view',
      'automation_manage',
      'ai_insights'
    ]
  },
  {
    id: 'leader',
    name: 'Líder / Coordenador(a)',
    roleKey: 'LEADER',
    desc: 'Gestão direta de pessoas, pequenos grupos/células, acompanhamento no pipeline e agenda.',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    isSystem: true,
    permissions: [
      'contatos_view', 'contatos_edit',
      'pipeline_view',
      'celulas_view', 'celulas_edit',
      'discipulado_view',
      'ministries_view', 'ministries_edit',
      'checkin_view', 'checkin_edit',
      'pastoral_view', 'pastoral_edit',
      'events_view', 'events_edit',
      'agenda_view', 'agenda_edit',
      'automation_manage'
    ]
  },
  {
    id: 'reception',
    name: 'Recepção / Boas-Vindas',
    roleKey: 'RECEPTION',
    desc: 'Recepção no culto, cadastro rápido de visitantes, QR Code e primeiro acolhimento.',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    isSystem: true,
    permissions: [
      'contatos_view', 'contatos_edit',
      'pipeline_view',
      'checkin_view', 'checkin_edit',
      'pastoral_view',
      'events_view',
      'agenda_view'
    ]
  },
  {
    id: 'volunteer',
    name: 'Voluntário(a) / Apoio',
    roleKey: 'VOLUNTEER',
    desc: 'Apoio operacional em eventos, cultos e conferência de reuniões de pequenos grupos.',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    isSystem: true,
    permissions: [
      'contatos_view',
      'checkin_view',
      'pastoral_view',
      'events_view',
      'agenda_view'
    ]
  }
];

export const USER_STATUS_CONFIG = {
  online: {
    id: 'online',
    label: 'On-line',
    dotClass: 'bg-emerald-500',
    pingClass: 'bg-emerald-400',
    ringClass: 'ring-emerald-500/20',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    desc: 'Disponível para atendimento'
  },
  busy: {
    id: 'busy',
    label: 'Ocupado',
    dotClass: 'bg-amber-500',
    pingClass: 'bg-amber-400',
    ringClass: 'ring-amber-500/20',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    desc: 'Em culto, reunião ou aconselhamento'
  },
  offline: {
    id: 'offline',
    label: 'Off-line',
    dotClass: 'bg-rose-500',
    pingClass: 'bg-rose-400',
    ringClass: 'ring-rose-500/20',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    desc: 'Indisponível no momento'
  }
} as const;

