import { AbntDocument, AbntStandardRule, InstitutionalProfile } from '../abnt/types';

export interface SyncAccountPlaceholder {
  connected: boolean;
  provider?: 'cloud_sync';
  lastSyncedAt?: string;
}

export interface DocumentRepository {
  listDocuments(): Promise<AbntDocument[]>;
  getDocument(id: string): Promise<AbntDocument | null>;
  saveDocument(doc: AbntDocument): Promise<AbntDocument>;
  deleteDocument(id: string): Promise<void>;
  exportAllBackup(): Promise<string>;
  importBackup(jsonContent: string): Promise<AbntDocument[]>;
  getStandardsCatalog(): Promise<AbntStandardRule[]>;
  saveStandardsCatalog(rules: AbntStandardRule[]): Promise<void>;
  getInstitutionalProfiles(): Promise<InstitutionalProfile[]>;
  saveInstitutionalProfiles(profiles: InstitutionalProfile[]): Promise<void>;
}
