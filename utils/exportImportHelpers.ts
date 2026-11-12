import { Member, PipelineStage, SystemUser, Cell, FinancialTransaction, Church, Organization, ScheduleEvent } from '../types';

/**
 * Triggers a browser download of a text/binary blob.
 */
export const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a CSV file with UTF-8 BOM so Excel opens it with accents preserved.
 */
export const downloadCSV = (filename: string, csvContent: string) => {
  // \uFEFF is UTF-8 Byte Order Mark (BOM), essential for Microsoft Excel to display accents (ã, é, ç) correctly
  const bomContent = '\uFEFF' + csvContent;
  downloadFile(filename, bomContent, 'text/csv;charset=utf-8;');
};

/**
 * Generates and downloads a JSON file formatted with indentation.
 */
export const downloadJSON = (filename: string, data: any) => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(filename, jsonContent, 'application/json;charset=utf-8;');
};

/**
 * Official CSV template for importing contacts into Koinonia.
 */
export const generateContactsTemplateCSV = (): string => {
  const headers = [
    'Nome Completo',
    'Email',
    'Telefone',
    'Genero',
    'Bairro',
    'CEP',
    'Endereco',
    'Etapa',
    'Canal',
    'Notas'
  ].join(';');

  const sampleRows = [
    [
      'Lucas Silva Santos',
      'lucas.silva@exemplo.com',
      '(11) 98888-1111',
      'Masculino',
      'Bela Vista',
      '01310-100',
      'Av. Paulista, 1000 - Apto 42',
      'NOVO',
      'VISITA_PRESENCIAL',
      'Primeira visita no culto da família'
    ].join(';'),
    [
      'Ana Paula Ferreira',
      'ana.paula@exemplo.com',
      '(11) 97777-2222',
      'Feminino',
      'Jardins',
      '01415-000',
      'Rua Oscar Freire, 500',
      'PRIMEIRO_CONTATO',
      'QR_CODE',
      'Tem interesse no ministério de louvor'
    ].join(';'),
    [
      'Marcos Vinicius Oliveira',
      'marcos.v@exemplo.com',
      '(11) 96666-3333',
      'Masculino',
      'Vila Mariana',
      '04001-001',
      'Rua Domingos de Morais, 850',
      'MEMBRO',
      'INDICATION',
      'Transferência de membro de outra igreja'
    ].join(';')
  ];

  return [headers, ...sampleRows].join('\r\n');
};

export interface ParsedImportResult {
  validMembers: Partial<Member>[];
  totalRows: number;
  invalidRowsCount: number;
  previewRows: {
    name: string;
    phone: string;
    email: string;
    neighborhood: string;
    city: string;
    stage: string;
  }[];
}

/**
 * Parses CSV text with auto-detected delimiter (comma or semicolon).
 */
export const parseContactsCSV = (csvText: string, defaultStageId: string = 'NEW'): ParsedImportResult => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { validMembers: [], totalRows: 0, invalidRowsCount: 0, previewRows: [] };
  }

  // Detect delimiter from first non-empty line
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ',';
  else if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';

  // Helper to split a CSV line respecting quotes
  const splitCSVLine = (line: string, delim: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const rawHeaders = splitCSVLine(lines[0], delimiter).map(h => h.toLowerCase().trim());
  
  // Find column indices
  const findIndex = (aliases: string[]) => rawHeaders.findIndex(h => aliases.some(a => h.includes(a)));

  const nameIdx = findIndex(['nome', 'name']);
  const emailIdx = findIndex(['email', 'e-mail']);
  const phoneIdx = findIndex(['telefone', 'celular', 'whatsapp', 'phone', 'fone']);
  const genderIdx = findIndex(['genero', 'gênero', 'sexo', 'gender']);
  const neighborhoodIdx = findIndex(['bairro', 'neighborhood', 'regiao', 'região']);
  const cepIdx = findIndex(['cep', 'zipcode', 'postal']);
  const addressIdx = findIndex(['endereco', 'endereço', 'rua', 'address', 'logradouro']);
  const cityIdx = findIndex(['cidade', 'city', 'municipio', 'município']);
  const stageIdx = findIndex(['etapa', 'stage', 'fase', 'status']);
  const channelIdx = findIndex(['canal', 'channel', 'origem']);
  const notesIdx = findIndex(['nota', 'notas', 'notes', 'observacao', 'observações', 'pedido']);

  const validMembers: Partial<Member>[] = [];
  const previewRows: ParsedImportResult['previewRows'] = [];
  let invalidRowsCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);
    const name = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx].trim() : (cols[0] ? cols[0].trim() : '');

    if (!name || name.length < 2) {
      invalidRowsCount++;
      continue;
    }

    const email = (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx].trim() : '';
    const phone = (phoneIdx >= 0 && cols[phoneIdx]) ? cols[phoneIdx].trim() : '';
    const gender = (genderIdx >= 0 && cols[genderIdx]) ? cols[genderIdx].trim() : '';
    const neighborhood = (neighborhoodIdx >= 0 && cols[neighborhoodIdx]) ? cols[neighborhoodIdx].trim() : '';
    const cep = (cepIdx >= 0 && cols[cepIdx]) ? cols[cepIdx].trim() : '';
    const address = (addressIdx >= 0 && cols[addressIdx]) ? cols[addressIdx].trim() : '';
    const city = (cityIdx >= 0 && cols[cityIdx]) ? cols[cityIdx].trim() : '';
    const stage = (stageIdx >= 0 && cols[stageIdx]) ? cols[stageIdx].trim() : defaultStageId;
    const channel = (channelIdx >= 0 && cols[channelIdx]) ? cols[channelIdx].trim() : 'CSV_IMPORT';
    const notes = (notesIdx >= 0 && cols[notesIdx]) ? cols[notesIdx].trim() : '';

    const member: Partial<Member> = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      phone,
      gender,
      neighborhood,
      cep,
      address,
      city,
      stage: stage || defaultStageId,
      channel,
      notes,
      active: true,
      engagement_score: 50,
      registration_date: new Date(),
      last_activity: new Date()
    };

    validMembers.push(member);

    if (previewRows.length < 8) {
      previewRows.push({
        name,
        phone: phone || '-',
        email: email || '-',
        neighborhood: neighborhood || '-',
        city: city || '-',
        stage: stage || defaultStageId
      });
    }
  }

  return {
    validMembers,
    totalRows: lines.length - 1,
    invalidRowsCount,
    previewRows
  };
};

/**
 * Exports members/contacts as a CSV file.
 */
export const exportContactsCSV = (
  members: Member[],
  stages: PipelineStage[] = [],
  team: SystemUser[] = [],
  cells: Cell[] = []
): string => {
  const stageMap = new Map(stages.map(s => [s.id, s.label]));
  const teamMap = new Map(team.map(t => [t.id, t.name]));
  const cellMap = new Map(cells.map(c => [c.id, c.name]));

  const headers = [
    'ID',
    'Nome Completo',
    'Email',
    'Telefone / WhatsApp',
    'Gênero',
    'Bairro / Região',
    'CEP',
    'Endereço Completo',
    'Cidade',
    'Núcleo Familiar',
    'Etapa no Pipeline',
    'Líder Responsável',
    'Célula / Grupo',
    'Canal de Entrada',
    'Score de Engajamento',
    'Status (Ativo/Arquivado)',
    'Data de Cadastro'
  ].join(';');

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = members.map(m => {
    const formattedDate = m.registration_date 
      ? new Date(m.registration_date).toLocaleDateString('pt-BR') 
      : '';

    return [
      escapeCSV(m.id),
      escapeCSV(m.name),
      escapeCSV(m.email || ''),
      escapeCSV(m.phone || ''),
      escapeCSV(m.gender || ''),
      escapeCSV(m.neighborhood || ''),
      escapeCSV(m.cep || ''),
      escapeCSV(m.address || ''),
      escapeCSV(m.city || ''),
      escapeCSV(m.household_name || ''),
      escapeCSV(stageMap.get(m.stage) || m.stage),
      escapeCSV(m.responsible_leader_id ? teamMap.get(m.responsible_leader_id) || 'Sem líder' : 'Sem líder'),
      escapeCSV(m.cell_id ? cellMap.get(m.cell_id) || 'Sem célula' : 'Sem célula'),
      escapeCSV(m.channel || 'MANUAL'),
      escapeCSV(m.engagement_score || 50),
      escapeCSV(m.active === false ? 'Arquivado / Lixeira' : 'Ativo'),
      escapeCSV(formattedDate)
    ].join(';');
  });

  return [headers, ...rows].join('\r\n');
};

/**
 * Exports complete church database payload (JSON format) according to LGPD and governance specs.
 */
export const generateChurchDataBackup = (data: {
  church?: Church | null;
  organization?: Organization | null;
  members?: Member[];
  cells?: Cell[];
  transactions?: FinancialTransaction[];
  team?: SystemUser[];
  events?: ScheduleEvent[];
}) => {
  return {
    koinonia_export_version: '2.0.0',
    exported_at: new Date().toISOString(),
    governance: {
      platform: 'Koinonya Church Management',
      lgpd_compliance: true,
      export_type: 'FULL_CHURCH_BACKUP',
      church_name: data.church?.name || data.organization?.name || 'Igreja Local',
      church_cnpj: data.church?.cnpj || 'N/I',
      church_pastor: data.church?.pastor_name || 'N/I'
    },
    statistics: {
      total_members: data.members?.length || 0,
      active_members: data.members?.filter(m => m.active !== false).length || 0,
      total_cells: data.cells?.length || 0,
      total_transactions: data.transactions?.length || 0,
      total_team_users: data.team?.length || 0,
      total_events: data.events?.length || 0
    },
    data: {
      church: data.church || null,
      organization: data.organization || null,
      members: data.members || [],
      cells: data.cells || [],
      financial_transactions: data.transactions || [],
      team_users: (data.team || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        duty: u.duty,
        whatsapp: u.whatsapp,
        permissions: u.permissions
      })),
      schedule_events: data.events || []
    }
  };
};
