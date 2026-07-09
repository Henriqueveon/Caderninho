export type Role = "owner" | "professional" | "client";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "done"
  | "no_show"
  | "canceled";

export interface StudioSettings {
  min_cancel_hours?: number;
  slot_step_minutes?: number;
  opening_hours?: { start: string; end: string };
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  settings: StudioSettings;
  created_at: string;
}

export interface Profile {
  id: string;
  studio_id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Professional {
  id: string;
  studio_id: string;
  profile_id: string;
  commission_pct: number;
  bio: string | null;
  color: string;
  active: boolean;
}

export interface Service {
  id: string;
  studio_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  commission_pct_override: number | null;
  active: boolean;
}

export interface AvailabilityRule {
  id: string;
  studio_id: string;
  professional_id: string;
  weekday: number; // 0 = domingo
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface AvailabilityException {
  id: string;
  studio_id: string;
  professional_id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  type: "block" | "extra";
  reason: string | null;
}

export interface Appointment {
  id: string;
  studio_id: string;
  professional_id: string;
  client_id: string | null;
  client_name_snapshot: string | null;
  service_id: string;
  price_snapshot: number;
  commission_pct_snapshot: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: AppointmentStatus;
  canceled_by: "client" | "professional" | "owner" | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Earning {
  id: string;
  studio_id: string;
  professional_id: string;
  appointment_id: string;
  gross_value: number;
  commission_value: number;
  studio_value: number;
  earned_at: string;
}

export interface Goal {
  id: string;
  studio_id: string;
  professional_id: string;
  month: string;
  target_type: "revenue" | "appointments";
  target_value: number;
  bonus_type: "fixed" | "extra_pct";
  bonus_value: number;
}

export interface Bonus {
  id: string;
  studio_id: string;
  professional_id: string;
  goal_id: string | null;
  month: string;
  value: number;
  status: "pending" | "paid";
}

export interface Invite {
  id: string;
  studio_id: string;
  token: string;
  email: string;
  full_name: string | null;
  commission_pct: number;
  accepted_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  studio_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
