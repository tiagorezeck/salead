/**
 * Módulo Central de Validação, Normalização e Máscaras de Dados
 * Política Global de Padronização de Dados - Sistema CRM COMET
 */

// ============================================================================
// 1. TELEFONE (+55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX)
// ============================================================================

/**
 * Normaliza qualquer número de telefone brasileiro para o padrão internacional:
 * +55 (XX) XXXXX-XXXX (Celular - 9 dígitos)
 * +55 (XX) XXXX-XXXX  (Fixo - 8 dígitos)
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");

  // Se começar com 55 e tiver mais de 11 dígitos, remove o prefixo 55 temporariamente se for código do país
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Preenche DDD padrão 24 (ou outro) se houver apenas 8 ou 9 dígitos
  if (digits.length === 8 || digits.length === 9) {
    digits = "24" + digits;
  }

  if (digits.length < 10) return raw.trim(); // Inválido, mantém para feedback

  const ddd = digits.slice(0, 2);
  const numberBody = digits.slice(2, 11); // max 9 dígitos

  if (numberBody.length === 9) {
    const part1 = numberBody.slice(0, 5);
    const part2 = numberBody.slice(5, 9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  } else if (numberBody.length === 8) {
    const part1 = numberBody.slice(0, 4);
    const part2 = numberBody.slice(4, 8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  return raw.trim();
}

/**
 * Máscara dinâmica para input de telefone enquanto o usuário digita.
 */
export function maskPhoneInput(value: string): string {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");
  
  // Se o usuário digitou ou colou com +55 no início
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  // Limita a no máximo 11 dígitos de número local (DDD + 9 dígitos)
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `+55 (${digits}`;
  if (digits.length <= 6) return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Valida se um telefone está no formato correto e completo.
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string; normalized: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: "Telefone é obrigatório.", normalized: "" };
  }
  const normalized = normalizePhone(phone);
  const regex = /^\+55\s\(\d{2}\)\s\d{4,5}-\d{4}$/;
  if (!regex.test(normalized)) {
    return {
      isValid: false,
      error: "Telefone inválido. Formato exigido: +55 (XX) XXXXX-XXXX",
      normalized
    };
  }
  return { isValid: true, normalized };
}


// ============================================================================
// 2. CPF (000.000.000-00 com validação matemática)
// ============================================================================

export function maskCPF(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function validateCPFMath(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // Bloqueia 111.111.111-11, 000.000.000-00, etc.

  let sum = 0;
  let remainder = 0;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11))) return false;

  return true;
}

export function validateCPF(cpf: string): { isValid: boolean; error?: string; normalized: string } {
  if (!cpf || !cpf.trim()) {
    return { isValid: false, error: "CPF é obrigatório.", normalized: "" };
  }
  const digits = cpf.replace(/\D/g, "");
  const formatted = maskCPF(digits);

  if (digits.length !== 11) {
    return { isValid: false, error: "CPF deve conter exatamente 11 dígitos.", normalized: formatted };
  }

  if (!validateCPFMath(digits)) {
    return { isValid: false, error: "CPF com dígitos verificadores inválidos.", normalized: formatted };
  }

  return { isValid: true, normalized: formatted };
}


// ============================================================================
// 3. CNPJ (00.000.000/0000-00 com validação matemática)
// ============================================================================

export function maskCNPJ(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function validateCNPJMath(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const dv = digits.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(dv.charAt(0))) return false;

  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(dv.charAt(1))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): { isValid: boolean; error?: string; normalized: string } {
  if (!cnpj || !cnpj.trim()) {
    return { isValid: false, error: "CNPJ é obrigatório.", normalized: "" };
  }
  const digits = cnpj.replace(/\D/g, "");
  const formatted = maskCNPJ(digits);

  if (digits.length !== 14) {
    return { isValid: false, error: "CNPJ deve conter exatamente 14 dígitos.", normalized: formatted };
  }

  if (!validateCNPJMath(digits)) {
    return { isValid: false, error: "CNPJ com dígitos verificadores inválidos.", normalized: formatted };
  }

  return { isValid: true, normalized: formatted };
}


// ============================================================================
// 4. CEP (00000-000)
// ============================================================================

export function maskCEP(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function validateCEP(cep: string): { isValid: boolean; error?: string; normalized: string } {
  if (!cep || !cep.trim()) {
    return { isValid: false, error: "CEP é obrigatório.", normalized: "" };
  }
  const digits = cep.replace(/\D/g, "");
  const formatted = maskCEP(digits);

  if (digits.length !== 8) {
    return { isValid: false, error: "CEP deve conter exatamente 8 dígitos (00000-000).", normalized: formatted };
  }

  return { isValid: true, normalized: formatted };
}


// ============================================================================
// 5. DATA (DD/MM/AAAA)
// ============================================================================

export function maskDateBR(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function formatDateBR(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    const day = String(dateInput.getDate()).padStart(2, "0");
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Se já for string DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    return dateInput;
  }

  // Se for ISO ou timestamp
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return dateInput;
}

export function validateDateBR(dateStr: string): { isValid: boolean; error?: string; isoDate?: string; formatted: string } {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: false, error: "Data é obrigatória.", formatted: "" };
  }

  const formatted = maskDateBR(dateStr);
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = formatted.match(regex);

  if (!match) {
    return { isValid: false, error: "Data inválida. Utilizar padrão DD/MM/AAAA", formatted };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const year = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) {
    return { isValid: false, error: "Ano deve estar entre 1900 e 2100.", formatted };
  }

  const dateObj = new Date(year, month, day);

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month ||
    dateObj.getDate() !== day
  ) {
    return { isValid: false, error: "Data calendário inexistente (ex: 31/02).", formatted };
  }

  return { isValid: true, isoDate: dateObj.toISOString(), formatted };
}


// ============================================================================
// 6. HORA (HH:MM)
// ============================================================================

export function maskTime(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export function validateTime(timeStr: string): { isValid: boolean; error?: string; formatted: string } {
  if (!timeStr || !timeStr.trim()) {
    return { isValid: false, error: "Hora é obrigatória.", formatted: "" };
  }

  const formatted = maskTime(timeStr);
  const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

  if (!regex.test(formatted)) {
    return { isValid: false, error: "Hora inválida. Formato exigido: HH:MM (00:00 às 23:59).", formatted };
  }

  return { isValid: true, formatted };
}


// ============================================================================
// 7. MOEDA / VALORES MONETÁRIOS (R$ 1.234,56)
// ============================================================================

export function formatCurrencyBR(value: number | string | null | undefined): string {
  const num = typeof value === "number" ? value : parseFloat(String(value || 0).replace(",", "."));
  if (isNaN(num)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(num);
}

export function parseCurrencyBR(valStr: string): number {
  if (!valStr) return 0;
  // Remove R$, espaços e converte formato PT-BR para númeroJS
  const clean = valStr
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function maskCurrencyInput(value: string): string {
  if (!value) return "R$ 0,00";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "R$ 0,00";
  const num = parseInt(digits, 10) / 100;
  return formatCurrencyBR(num);
}


// ============================================================================
// 8. PORCENTAGEM (00,00%)
// ============================================================================

export function formatPercentBR(value: number | string | null | undefined): string {
  const num = typeof value === "number" ? value : parseFloat(String(value || 0).replace(",", "."));
  if (isNaN(num)) return "0,00%";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + "%";
}

export function parsePercentBR(valStr: string): number {
  if (!valStr) return 0;
  const clean = valStr.replace(/[%]/g, "").replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}


// ============================================================================
// 9. E-MAIL
// ============================================================================

export function validateEmail(email: string): { isValid: boolean; error?: string; normalized: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: "E-mail é obrigatório.", normalized: "" };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (/\s/.test(cleanEmail)) {
    return { isValid: false, error: "E-mail não pode conter espaços.", normalized: cleanEmail };
  }

  // Regex rigoroso para estrutura de e-mail com domínio válido
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: "E-mail com estrutura ou domínio inválido (exemplo@dominio.com).", normalized: cleanEmail };
  }

  return { isValid: true, normalized: cleanEmail };
}


// ============================================================================
// 10. SKU / CÓDIGO DE PRODUTO
// ============================================================================

export function formatSKU(sku: string): string {
  if (!sku) return "";
  return sku.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export function validateSKU(sku: string): { isValid: boolean; error?: string; normalized: string } {
  if (!sku || !sku.trim()) {
    return { isValid: false, error: "SKU do produto é obrigatório.", normalized: "" };
  }

  const normalized = formatSKU(sku);
  if (normalized.length < 3) {
    return { isValid: false, error: "SKU deve ter no mínimo 3 caracteres alfanuméricos.", normalized };
  }

  return { isValid: true, normalized };
}


// ============================================================================
// 11. INSCRIÇÃO ESTADUAL E MUNICIPAL
// ============================================================================

export function normalizeInscricaoEstadual(ie: string): string {
  if (!ie) return "";
  if (ie.trim().toUpperCase() === "ISENTO") return "ISENTO";
  return ie.replace(/\D/g, "");
}

export function validateInscricaoEstadual(ie: string): { isValid: boolean; error?: string; normalized: string } {
  if (!ie || !ie.trim()) {
    return { isValid: true, normalized: "" }; // Opcional se for isento
  }

  const normalized = normalizeInscricaoEstadual(ie);
  if (normalized === "ISENTO") return { isValid: true, normalized };

  if (normalized.length < 8 || normalized.length > 14) {
    return { isValid: false, error: "Inscrição Estadual deve ter entre 8 e 14 dígitos ou 'ISENTO'.", normalized };
  }

  return { isValid: true, normalized };
}


// ============================================================================
// 12. AUDITORIA E NORMALIZAÇÃO DE REGISTROS COMPLETOS (LEADS / CLIENTES)
// ============================================================================

export interface DataAuditResult {
  recordId: string;
  recordName: string;
  field: string;
  originalValue: any;
  normalizedValue: any;
  status: "corrected" | "invalid_requires_manual_fix" | "valid";
  issueReason?: string;
}

/**
 * Audita e normaliza um registro de Lead de acordo com todas as regras do sistema.
 */
export function auditAndNormalizeLead(lead: any): {
  normalizedLead: any;
  auditTrail: DataAuditResult[];
} {
  const auditTrail: DataAuditResult[] = [];
  const normalized = { ...lead };

  // 1. Telefone / WhatsApp
  if (lead.whatsapp) {
    const res = validatePhone(lead.whatsapp);
    if (res.isValid) {
      if (lead.whatsapp !== res.normalized) {
        auditTrail.push({
          recordId: lead.id,
          recordName: lead.name || "Sem Nome",
          field: "whatsapp",
          originalValue: lead.whatsapp,
          normalizedValue: res.normalized,
          status: "corrected"
        });
        normalized.whatsapp = res.normalized;
      }
    } else {
      auditTrail.push({
        recordId: lead.id,
        recordName: lead.name || "Sem Nome",
        field: "whatsapp",
        originalValue: lead.whatsapp,
        normalizedValue: lead.whatsapp,
        status: "invalid_requires_manual_fix",
        issueReason: res.error
      });
    }
  }

  // 2. E-mail
  if (lead.email) {
    const res = validateEmail(lead.email);
    if (res.isValid) {
      if (lead.email !== res.normalized) {
        auditTrail.push({
          recordId: lead.id,
          recordName: lead.name || "Sem Nome",
          field: "email",
          originalValue: lead.email,
          normalizedValue: res.normalized,
          status: "corrected"
        });
        normalized.email = res.normalized;
      }
    } else {
      auditTrail.push({
        recordId: lead.id,
        recordName: lead.name || "Sem Nome",
        field: "email",
        originalValue: lead.email,
        normalizedValue: lead.email,
        status: "invalid_requires_manual_fix",
        issueReason: res.error
      });
    }
  }

  // 3. Valor (Numérico)
  if (lead.value !== undefined && lead.value !== null) {
    const parsedVal = typeof lead.value === "number" ? lead.value : parseCurrencyBR(String(lead.value));
    if (typeof lead.value === "string") {
      auditTrail.push({
        recordId: lead.id,
        recordName: lead.name || "Sem Nome",
        field: "value",
        originalValue: lead.value,
        normalizedValue: parsedVal,
        status: "corrected"
      });
    }
    normalized.value = parsedVal;
  }

  // 4. Data de Criação / Interação
  if (lead.createdAt) {
    const dateVal = formatDateBR(lead.createdAt);
    if (dateVal && lead.createdAt !== dateVal && !lead.createdAt.includes("T")) {
      auditTrail.push({
        recordId: lead.id,
        recordName: lead.name || "Sem Nome",
        field: "createdAt",
        originalValue: lead.createdAt,
        normalizedValue: dateVal,
        status: "corrected"
      });
    }
  }

  return { normalizedLead: normalized, auditTrail };
}
