// frontend/src/types/index.ts
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'analyst' | 'manager' | 'admin';
  is_verified: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access: string;
    refresh: string;
    user: User;
  };
}

export interface RawUpload {
  id: string;
  user: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  source_type: 'sap' | 'utility' | 'travel';
  original_filename: string;
  row_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawRecord {
  id: string;
  raw_upload: string;
  row_number: number;
  data: Record<string, any>;
  created_at: string;
}

export interface NormalizedRecord {
  id: string;
  raw_upload: string;
  raw_record: string;
  record_date: string;
  standard_category: 'fuel' | 'electricity' | 'travel';
  quantity: string;
  unit: string;
  data: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ValidationIssue {
  id: string;
  normalized_record: string | null;
  raw_record: string;
  field_name: string;
  severity: 'warning' | 'error';
  rule_code: string;
  message: string;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_by_email: string | null;
  created_at: string;
}

export interface ApprovalRecord {
  id: string;
  normalized_record: string;
  approved_by: string;
  action: 'approved' | 'rejected';
  comments: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user: User | null;
  action: string;
  table_name: string;
  record_id: string;
  changes: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// AI cleaning suggestion interfaces
export interface ColumnMappingSuggestion {
  raw_header: string;
  suggested_target: string;
  confidence: number;
  rationale: string;
}

export interface SchemaInferenceResult {
  source_type_inference: 'fuel' | 'electricity' | 'travel';
  confidence: number;
  column_mappings: ColumnMappingSuggestion[];
}

export interface CleanedCell {
  column_name: string;
  original_value: any;
  cleaned_value: any;
  change_type: string;
  rationale: string;
}

export interface CleanedRowSuggestion {
  row_number: number;
  is_malformed: boolean;
  cell_fixes: CleanedCell[];
  fully_cleaned_row: Record<string, any>;
}
