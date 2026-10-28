-- Sollis Lab Competency Hub starter schema. Run in a NEW Supabase project SQL editor.
-- All personal records and document objects are private. No public/anonymous access.
-- Review and test policies with your security/compliance team before production use.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','viewer')),
  allowed_sites text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 180),
  email text not null default '',
  role text not null,
  site text not null,
  hire_date date not null,
  status text not null default 'active' check (status in ('active','offboarded')),
  offboard_reason text check (offboard_reason in ('resigned','terminated')),
  offboarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint offboard_consistency check (status='active' or (offboard_reason is not null and offboarded_at is not null))
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  platform_id text not null,
  first_testing_date date not null,
  complexity text not null check (complexity in ('waived','nonwaived','site-policy')),
  created_at timestamptz not null default now(),
  unique (employee_id, platform_id)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  phase text not null check (phase in ('initial_training','initial_competency','six_month','annual')),
  cycle integer not null default 0 check (cycle >= 0),
  due_date date not null,
  started_at timestamptz,
  completed_at timestamptz,
  assessor text not null default '',
  elements jsonb not null default '[]'::jsonb check (jsonb_typeof(elements)='array'),
  notes text not null default '',
  outcome text not null default 'pending' check (outcome in ('pending','competent','remediation')),
  created_at timestamptz not null default now(),
  unique (enrollment_id,phase,cycle)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete restrict,
  assessment_id uuid references public.assessments(id) on delete restrict,
  platform_id text,
  file_name text not null,
  mime_type text not null,
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint file_or_link check ((storage_path is not null and external_url is null) or (storage_path is null and external_url is not null)),
  constraint assessment_employee check (assessment_id is null or employee_id is not null)
);

create table if not exists public.reminder_logs (
  id bigint generated always as identity primary key,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  reminder_key text not null,
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(assessment_id,reminder_key)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  actor_id uuid,
  prior_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create or replace function private.is_authorized() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_users u where u.user_id=(select auth.uid()) and u.active);
$$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_users u where u.user_id=(select auth.uid()) and u.active and u.role='admin');
$$;
create or replace function private.can_read_site(p_site text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_users u where u.user_id=(select auth.uid()) and u.active and (u.role='admin' or p_site=any(u.allowed_sites)));
$$;
create or replace function private.can_write_site(p_site text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_users u where u.user_id=(select auth.uid()) and u.active and (u.role='admin' or (u.role='manager' and p_site=any(u.allowed_sites))));
$$;
create or replace function private.can_access_employee(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.employees e where e.id=p_id and private.can_read_site(e.site));
$$;
create or replace function private.can_write_employee(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.employees e where e.id=p_id and e.status='active' and private.can_write_site(e.site));
$$;
create or replace function private.can_read_enrollment(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.enrollments e where e.id=p_id and private.can_access_employee(e.employee_id));
$$;
create or replace function private.can_write_enrollment(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.enrollments e where e.id=p_id and private.can_write_employee(e.employee_id));
$$;
create or replace function private.is_valid_storage_path(p_path text, p_writable boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare head text;
begin
 head:=split_part(p_path,'/',1);
 if head='templates' then
   return case when p_writable then private.is_admin() else private.is_authorized() end;
 end if;
 if head !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
 if p_writable then return private.can_write_employee(head::uuid); end if;
 return private.can_access_employee(head::uuid);
exception when others then return false;
end;
$$;

-- RLS enabled on every table, including users, audit and reminder logs.
alter table public.app_users enable row level security;
alter table public.employees enable row level security;
alter table public.enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.documents enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.audit_events enable row level security;

create policy "read-own-user-or-admin" on public.app_users for select to authenticated using (user_id=(select auth.uid()) or private.is_admin());
create policy "admins-manage-users" on public.app_users for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "read-staff-by-site" on public.employees for select to authenticated using (private.can_read_site(site));
create policy "create-staff-by-site" on public.employees for insert to authenticated with check (private.can_write_site(site) and status='active');
create policy "update-staff-by-site" on public.employees for update to authenticated using (private.can_write_site(site)) with check (private.can_write_site(site));
create policy "read-enrollment" on public.enrollments for select to authenticated using (private.can_access_employee(employee_id));
create policy "add-enrollment" on public.enrollments for insert to authenticated with check (private.can_write_employee(employee_id));
create policy "read-assessments" on public.assessments for select to authenticated using (private.can_read_enrollment(enrollment_id));
create policy "add-assessments" on public.assessments for insert to authenticated with check (private.can_write_enrollment(enrollment_id));
create policy "update-assessments" on public.assessments for update to authenticated using (private.can_write_enrollment(enrollment_id)) with check (private.can_write_enrollment(enrollment_id));
create policy "read-documents" on public.documents for select to authenticated using ((employee_id is null and private.is_authorized()) or (employee_id is not null and private.can_access_employee(employee_id)));
create policy "add-documents" on public.documents for insert to authenticated with check (
  (employee_id is null and assessment_id is null and private.is_admin()) or
  (employee_id is not null and private.can_write_employee(employee_id) and (assessment_id is null or exists(
   select 1 from public.assessments a join public.enrollments en on en.id=a.enrollment_id where a.id=assessment_id and en.employee_id=documents.employee_id
  )))
);
create policy "read-reminder-log-admin" on public.reminder_logs for select to authenticated using (private.is_admin());
create policy "read-audit-admin" on public.audit_events for select to authenticated using (private.is_admin());

-- Assessor and completed assessments cannot be silently edited in-place.
create or replace function private.guard_assessment_update() returns trigger language plpgsql set search_path='' as $$
declare required_six boolean;
begin
 if old.completed_at is not null then raise exception 'Completed assessment records are locked. Use a new corrective assessment record.'; end if;
 if old.enrollment_id<>new.enrollment_id or old.phase<>new.phase or old.cycle<>new.cycle or old.due_date<>new.due_date then
   raise exception 'Assessment identity and due date are immutable';
 end if;
 if new.completed_at is not null then
   select (en.complexity='nonwaived' or new.phase='initial_training') into required_six from public.enrollments en where en.id=new.enrollment_id;
   if new.outcome<>'competent' or length(trim(new.assessor))=0 then raise exception 'A competent outcome and assessor are required for completion';end if;
   if required_six and (jsonb_array_length(new.elements)<>6) then raise exception 'Six elements are required for this assessment';end if;
 end if;
 return new;
end;
$$;
create trigger competency_lock before update on public.assessments for each row execute function private.guard_assessment_update();

-- Restrict offboarding to admins. Keep staff identities and site assignments stable.
create or replace function private.guard_employee_update() returns trigger language plpgsql set search_path='' as $$
begin
 if new.name<>old.name or new.site<>old.site or new.hire_date<>old.hire_date or new.role<>old.role or new.email<>old.email then
    raise exception 'Employee profile edits are disabled in this version. Contact an administrator for audited corrections.';
 end if;
 if new.status<>old.status or new.offboard_reason is distinct from old.offboard_reason or new.offboarded_at is distinct from old.offboarded_at then
   if not private.is_admin() then raise exception 'Only an admin may offboard employees';end if;
   if old.status='offboarded' then raise exception 'Offboarded records are immutable';end if;
 end if;
 return new;
end;
$$;
create trigger staff_status_guard before update on public.employees for each row execute function private.guard_employee_update();

create or replace function private.log_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_events(table_name,record_id,action,actor_id,prior_data,new_data)
  values (TG_TABLE_NAME,case when TG_OP='DELETE' then old.id else new.id end,TG_OP,auth.uid(),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return case when TG_OP='DELETE' then old else new end;
end;
$$;
create trigger audit_employees after insert or update on public.employees for each row execute function private.log_change();
create trigger audit_enrollments after insert or update on public.enrollments for each row execute function private.log_change();
create trigger audit_assessments after insert or update on public.assessments for each row execute function private.log_change();
create trigger audit_documents after insert on public.documents for each row execute function private.log_change();

-- Files stay private. Max file size 25 MB; only approved office formats and images.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('competency-files','competency-files',false,26214400,array[
 'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','application/octet-stream'
]) on conflict (id) do nothing;
create policy "read-private-competency-files" on storage.objects for select to authenticated
 using (bucket_id='competency-files' and private.is_valid_storage_path(name,false));
create policy "upload-private-competency-files" on storage.objects for insert to authenticated
 with check (bucket_id='competency-files' and private.is_valid_storage_path(name,true));
-- Do not grant user deletes or public access to prevent accidental evidence loss.

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
revoke all on public.reminder_logs from anon,authenticated;
revoke all on public.audit_events from anon,authenticated;
grant select on public.reminder_logs to authenticated;
grant select on public.audit_events to authenticated;

-- INITIAL ADMIN STEP (after adding your first user in Authentication > Users):
-- insert into public.app_users(user_id,role,allowed_sites) values
-- ('YOUR_AUTH_USER_UUID','admin','{}');
-- Manager example: insert into public.app_users(user_id,role,allowed_sites) values
-- ('MANAGER_AUTH_UUID','manager',ARRAY['Beverly Hills','Santa Monica']);