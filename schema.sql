-- CareFlow Smart Health Resource Management System
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- This is a student demo. Do not store real patient or clinical data.

create extension if not exists pgcrypto;

-- Authenticated users share the demo workspace. RLS prevents anonymous access.
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  age integer not null check (age between 0 and 125),
  gender text not null check (gender in ('Female','Male','Other','Prefer not to say')),
  phone text not null,
  blood_group text not null default 'Unknown' check (blood_group in ('Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-')),
  condition_note text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  specialty text not null,
  phone text,
  email text,
  available boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  appointment_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint appointment_doctor_slot_unique unique (doctor_id, appointment_at)
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  bed_number text not null unique,
  ward text not null,
  status text not null default 'available' check (status in ('available','occupied','maintenance')),
  patient_id uuid references public.patients(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint occupied_bed_requires_patient check (
    (status = 'occupied' and patient_id is not null) or
    (status <> 'occupied')
  )
);

create table if not exists public.medicine_inventory (
  id uuid primary key default gen_random_uuid(),
  medicine_name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 10 check (reorder_level >= 0),
  unit text not null default 'units',
  expiry_date date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_name text not null,
  asset_code text not null unique,
  status text not null default 'available' check (status in ('available','in_use','maintenance')),
  location text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_requests (
  id uuid primary key default gen_random_uuid(),
  resource_name text not null,
  requested_by text not null,
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'pending' check (status in ('pending','processed','rejected')),
  details text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_by uuid default auth.uid() references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb
);

create index if not exists idx_patients_name on public.patients using btree (full_name);
create index if not exists idx_doctors_specialty on public.doctors using btree (specialty);
create index if not exists idx_appointments_time on public.appointments using btree (appointment_at);
create index if not exists idx_appointments_patient on public.appointments using btree (patient_id);
create index if not exists idx_appointments_doctor on public.appointments using btree (doctor_id);
create index if not exists idx_beds_status on public.beds using btree (status);
create index if not exists idx_medicine_stock on public.medicine_inventory using btree (quantity, reorder_level);
create index if not exists idx_requests_queue on public.resource_requests using btree (status, priority, created_at);

-- RLS: only authenticated users can read or change records.
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.beds enable row level security;
alter table public.medicine_inventory enable row level security;
alter table public.equipment enable row level security;
alter table public.resource_requests enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "Authenticated users can manage patients" on public.patients;
create policy "Authenticated users can manage patients" on public.patients
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage doctors" on public.doctors;
create policy "Authenticated users can manage doctors" on public.doctors
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage appointments" on public.appointments;
create policy "Authenticated users can manage appointments" on public.appointments
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage beds" on public.beds;
create policy "Authenticated users can manage beds" on public.beds
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage medicine inventory" on public.medicine_inventory;
create policy "Authenticated users can manage medicine inventory" on public.medicine_inventory
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage equipment" on public.equipment;
create policy "Authenticated users can manage equipment" on public.equipment
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage resource requests" on public.resource_requests;
create policy "Authenticated users can manage resource requests" on public.resource_requests
for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can read activity logs" on public.activity_logs;
create policy "Authenticated users can read activity logs" on public.activity_logs
for select to authenticated using (true);

-- Audit logging for inserts, updates and deletes.
create or replace function public.careflow_audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  row_id uuid;
  row_summary jsonb;
begin
  if (TG_OP = 'DELETE') then
    row_id := OLD.id;
    row_summary := to_jsonb(OLD);
  else
    row_id := NEW.id;
    row_summary := to_jsonb(NEW);
  end if;

  insert into public.activity_logs(table_name, record_id, action, changed_by, summary)
  values (TG_TABLE_NAME, row_id, TG_OP, auth.uid(), row_summary);

  if (TG_OP = 'DELETE') then return OLD; end if;
  return NEW;
end;
$$;

drop trigger if exists audit_patients on public.patients;
create trigger audit_patients after insert or update or delete on public.patients for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_doctors on public.doctors;
create trigger audit_doctors after insert or update or delete on public.doctors for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_appointments on public.appointments;
create trigger audit_appointments after insert or update or delete on public.appointments for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_beds on public.beds;
create trigger audit_beds after insert or update or delete on public.beds for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_medicine_inventory on public.medicine_inventory;
create trigger audit_medicine_inventory after insert or update or delete on public.medicine_inventory for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_equipment on public.equipment;
create trigger audit_equipment after insert or update or delete on public.equipment for each row execute function public.careflow_audit_trigger();
drop trigger if exists audit_resource_requests on public.resource_requests;
create trigger audit_resource_requests after insert or update or delete on public.resource_requests for each row execute function public.careflow_audit_trigger();

-- Optional demo data is in seed.sql. Run it only after creating an account and signing in,
-- or leave it empty and add records through the application.
