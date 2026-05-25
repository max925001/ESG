// frontend/src/utils/mockData.ts
import { RawUpload, NormalizedRecord, ValidationIssue, AuditLog } from '../types';

export const mockUploads: RawUpload[] = [
  {
    id: "upload-1",
    user: "user-1",
    status: "COMPLETED",
    source_type: "sap",
    original_filename: "sap_fuel_may2026.csv",
    row_count: 4,
    error_message: null,
    created_at: "2026-05-24T10:15:30Z",
    updated_at: "2026-05-24T10:15:33Z"
  },
  {
    id: "upload-2",
    user: "user-1",
    status: "COMPLETED",
    source_type: "utility",
    original_filename: "utility_electricity_q2.csv",
    row_count: 2,
    error_message: null,
    created_at: "2026-05-23T14:30:00Z",
    updated_at: "2026-05-23T14:30:04Z"
  },
  {
    id: "upload-3",
    user: "user-2",
    status: "COMPLETED",
    source_type: "travel",
    original_filename: "travel_bookings_corporate_api.json",
    row_count: 2,
    error_message: null,
    created_at: "2026-05-22T08:00:00Z",
    updated_at: "2026-05-22T08:00:02Z"
  },
  {
    id: "upload-4",
    user: "user-1",
    status: "FAILED",
    source_type: "sap",
    original_filename: "unaligned_sap_v2.csv",
    row_count: 0,
    error_message: "Process failed: Normalization failed: Invalid quantity numeric format: N/A",
    created_at: "2026-05-20T11:00:00Z",
    updated_at: "2026-05-20T11:00:01Z"
  }
];

export const mockRecords: NormalizedRecord[] = [
  {
    id: "rec-1",
    raw_upload: "upload-1",
    raw_record: "raw-rec-1",
    record_date: "2026-05-20",
    standard_category: "fuel",
    quantity: "3785.4118",
    unit: "L",
    data: {
      invoice_number: "INV-SAP-101",
      fuel_type: "diesel",
      original_quantity: "1000",
      original_unit: "gallons"
    },
    status: "PENDING",
    created_at: "2026-05-24T10:15:32Z"
  },
  {
    id: "rec-2",
    raw_upload: "upload-1",
    raw_record: "raw-rec-2",
    record_date: "2026-05-20",
    standard_category: "fuel",
    quantity: "55000.0000",
    unit: "L",
    data: {
      invoice_number: "INV-SAP-102",
      fuel_type: "petrol",
      original_quantity: "55000",
      original_unit: "liters"
    },
    status: "PENDING",
    created_at: "2026-05-24T10:15:32Z"
  },
  {
    id: "rec-3",
    raw_upload: "upload-1",
    raw_record: "raw-rec-3",
    record_date: "2026-05-21",
    standard_category: "fuel",
    quantity: "0.0000",
    unit: "L",
    data: {
      invoice_number: "INV-SAP-103",
      fuel_type: "diesel",
      original_quantity: "0",
      original_unit: "liters"
    },
    status: "PENDING",
    created_at: "2026-05-24T10:15:33Z"
  },
  {
    id: "rec-4",
    raw_upload: "upload-1",
    raw_record: "raw-rec-4",
    record_date: "2026-05-22",
    standard_category: "fuel",
    quantity: "2500.0000",
    unit: "L",
    data: {
      invoice_number: "INV-SAP-101",
      fuel_type: "diesel",
      original_quantity: "2500",
      original_unit: "liters"
    },
    status: "PENDING",
    created_at: "2026-05-24T10:15:33Z"
  },
  {
    id: "rec-5",
    raw_upload: "upload-2",
    raw_record: "raw-rec-5",
    record_date: "2026-05-15",
    standard_category: "electricity",
    quantity: "10500.0000",
    unit: "kWh",
    data: {
      account_number: "1234567",
      invoice_number: "INV-UT-501",
      original_quantity: "10.5",
      original_unit: "MWh"
    },
    status: "APPROVED",
    created_at: "2026-05-23T14:30:02Z"
  },
  {
    id: "rec-6",
    raw_upload: "upload-2",
    raw_record: "raw-rec-6",
    record_date: "2026-05-16",
    standard_category: "electricity",
    quantity: "120000.0000",
    unit: "kWh",
    data: {
      account_number: "1234567",
      invoice_number: "INV-UT-502",
      original_quantity: "120.0",
      original_unit: "MWh"
    },
    status: "PENDING",
    created_at: "2026-05-23T14:30:03Z"
  },
  {
    id: "rec-7",
    raw_upload: "upload-3",
    raw_record: "raw-rec-7",
    record_date: "2026-05-18",
    standard_category: "travel",
    quantity: "5552.2368",
    unit: "km",
    data: {
      ticket_number: "TKT-TR-901",
      employee_id: "EMP-001",
      departure_airport: "LHR",
      arrival_airport: "JFK",
      original_quantity: "3450",
      original_unit: "miles"
    },
    status: "PENDING",
    created_at: "2026-05-22T08:00:01Z"
  },
  {
    id: "rec-8",
    raw_upload: "upload-3",
    raw_record: "raw-rec-8",
    record_date: "2026-06-25",
    standard_category: "travel",
    quantity: "0.0000",
    unit: "km",
    data: {
      ticket_number: "TKT-TR-902",
      employee_id: "EMP-002",
      departure_airport: "CDG",
      arrival_airport: "DXB",
      original_quantity: "0",
      original_unit: "miles"
    },
    status: "PENDING",
    created_at: "2026-05-22T08:00:02Z"
  }
];

export const mockIssues: ValidationIssue[] = [
  {
    id: "issue-1",
    normalized_record: "rec-8",
    raw_record: "raw-rec-8",
    field_name: "distance_miles",
    severity: "error",
    rule_code: "MISSING_QUANTITY",
    message: "Travel distance is missing or less than or equal to zero.",
    metadata: { quantity: "0.0" },
    resolved: false,
    resolved_by: null,
    resolved_by_email: null,
    created_at: "2026-05-22T08:00:02Z"
  },
  {
    id: "issue-2",
    normalized_record: "rec-8",
    raw_record: "raw-rec-8",
    field_name: "booking_date",
    severity: "warning",
    rule_code: "FUTURE_DATE",
    message: "Booking date '2026-06-25' is in the future.",
    metadata: { booking_date: "2026-06-25", current_date: "2026-05-25" },
    resolved: false,
    resolved_by: null,
    resolved_by_email: null,
    created_at: "2026-05-22T08:00:02Z"
  },
  {
    id: "issue-3",
    normalized_record: "rec-3",
    raw_record: "raw-rec-3",
    field_name: "quantity",
    severity: "error",
    rule_code: "MISSING_QUANTITY",
    message: "Ingestion quantity is missing or less than or equal to zero.",
    metadata: { quantity: "0" },
    resolved: false,
    resolved_by: null,
    resolved_by_email: null,
    created_at: "2026-05-24T10:15:33Z"
  },
  {
    id: "issue-4",
    normalized_record: "rec-2",
    raw_record: "raw-rec-2",
    field_name: "quantity",
    severity: "warning",
    rule_code: "SUSPICIOUS_USAGE",
    message: "Fuel usage is unusually high (> 50000 Liters).",
    metadata: { quantity: "55000.0000", limit: "50000" },
    resolved: false,
    resolved_by: null,
    resolved_by_email: null,
    created_at: "2026-05-24T10:15:32Z"
  },
  {
    id: "issue-5",
    normalized_record: "rec-6",
    raw_record: "raw-rec-6",
    field_name: "usage_mwh",
    severity: "warning",
    rule_code: "SUSPICIOUS_USAGE",
    message: "Electricity usage is unusually high (> 100000 kWh).",
    metadata: { quantity: "120000.0000", limit: "100000" },
    resolved: false,
    resolved_by: null,
    resolved_by_email: null,
    created_at: "2026-05-23T14:30:03Z"
  }
];

export const mockAudits: AuditLog[] = [
  {
    id: "audit-1",
    user: { id: "u-1", email: "manager@test.esg", first_name: "Jane", last_name: "Smith", role: "manager", is_verified: true, created_at: "" },
    action: "DECISION_APPROVED",
    table_name: "normalized_records",
    record_id: "rec-5",
    changes: { old_status: "PENDING", new_status: "APPROVED", comments: "Audited utility read logs." },
    ip_address: "192.168.1.50",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
    created_at: "2026-05-24T14:00:00Z"
  },
  {
    id: "audit-2",
    user: { id: "u-2", email: "analyst@test.esg", first_name: "John", last_name: "Doe", role: "analyst", is_verified: true, created_at: "" },
    action: "UPLOAD_FILE",
    table_name: "raw_uploads",
    record_id: "upload-1",
    changes: { source_type: "sap", filename: "sap_fuel_may2026.csv" },
    ip_address: "192.168.1.52",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0",
    created_at: "2026-05-24T10:15:30Z"
  }
];
