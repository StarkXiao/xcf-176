import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateEvidenceId(): string {
  return `ev_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function generateConnectionId(): string {
  return `conn_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function generateCaseId(): string {
  return `case_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function generateTagId(): string {
  return `tag_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

export function generateShortId(length: number = 8): string {
  return uuidv4().replace(/-/g, '').slice(0, length);
}
