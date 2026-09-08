export type BookingSource = "carl" | "opendental" | string;

export interface BookingEvent {
  type: "booking";
  clientId: string;
  source: BookingSource;
  status: "success" | "failed";
  patientOrCustomerName?: string;
  requestedTime?: string;
  errorMessage?: string;
  raw?: unknown;
}

export type CallEndReason =
  | "completed"
  | "hangup_abrupt"
  | "no_answer"
  | "silence_timeout"
  | "voicemail"
  | "error";

export interface CallEvent {
  type: "call";
  clientId: string;
  callId: string;
  durationSeconds: number;
  endReason: CallEndReason;
  transcriptSnippet?: string;
  raw?: unknown;
}

export type ClientEvent = BookingEvent | CallEvent;

export type ErrorCategory = "failed_booking" | "bad_call_ending";

export interface DetectionResult {
  isError: boolean;
  category?: ErrorCategory;
  reason: string;
}

export interface FixResult {
  attempted: boolean;
  succeeded: boolean;
  attempts: number;
  detail: string;
}

export interface ErrorRecord {
  id: string;
  createdAt: string;
  clientId: string;
  category: ErrorCategory;
  reason: string;
  event: ClientEvent;
  fix: FixResult;
  notified: boolean;
  resolved: boolean;
}
