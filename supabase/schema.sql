-- Ejecutar en Supabase SQL Editor.
create type public.user_role as enum ('Administrador', 'Docente', 'Psicólogo/Orientador');
create type public.student_status as enum ('Activo', 'En seguimiento', 'Retirado');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'Docente',
  created_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key default gen_random_uuid(), name text not null, document text not null unique,
  birth_date date not null, course text not null, address text, guardian text not null, phone text,
  disability text not null, diagnosis text, observations text, status public.student_status not null default 'Activo',
  registered_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
  observed_at date not null, academic_progress text, difficulties text, recommendations text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.reasonable_adjustments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null unique references public.students(id) on delete cascade,
  adaptations text, strategies text, supports text, applied_follow_up text,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.follow_ups enable row level security;
alter table public.reasonable_adjustments enable row level security;
create or replace function public.my_role() returns public.user_role language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid() $$;
create policy "authenticated profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.my_role() = 'Administrador');
create policy "admin update profiles" on public.profiles for update to authenticated using (public.my_role() = 'Administrador') with check (public.my_role() = 'Administrador');
create policy "staff read students" on public.students for select to authenticated using (public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador'));
create policy "admin orientador create students" on public.students for insert to authenticated with check (public.my_role() in ('Administrador', 'Psicólogo/Orientador'));
create policy "admin orientador update students" on public.students for update to authenticated using (public.my_role() in ('Administrador', 'Psicólogo/Orientador'));
create policy "admin delete students" on public.students for delete to authenticated using (public.my_role() = 'Administrador');
create policy "staff read followups" on public.follow_ups for select to authenticated using (public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador'));
create policy "staff create followups" on public.follow_ups for insert to authenticated with check (public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador'));
create policy "staff manage adjustments" on public.reasonable_adjustments for all to authenticated using (public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador')) with check (public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador'));
insert into storage.buckets (id, name, public) values ('student-documents', 'student-documents', false) on conflict (id) do nothing;
create policy "staff access student documents" on storage.objects for all to authenticated using (bucket_id = 'student-documents' and public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador')) with check (bucket_id = 'student-documents' and public.my_role() in ('Administrador', 'Docente', 'Psicólogo/Orientador'));
