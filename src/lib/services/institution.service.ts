import { supabase } from '@/lib/supabase/client';

// Single source of truth for institution-management operations. No
// component should ever call Supabase directly for any of this - every
// admin console mutation funnels through here. This is deliberate: it's
// what makes retrofitting audit logging later (see Milestone 1 plan)
// cheap - a handful of functions to touch, not every component that
// happens to call Supabase.

export interface Faculty { id: string; name: string; code: string; createdAt: string; }
export interface Department { id: string; facultyId: string; name: string; code: string; createdAt: string; }
export interface Programme {
  id: string; departmentId: string; name: string; code: string;
  degreeType?: string; durationYears?: number; createdAt: string;
}
export interface AcademicSession {
  id: string; label: string; startDate?: string; endDate?: string; isCurrent: boolean; createdAt: string;
}
export interface JoinCode {
  id: string; code: string; createdBy?: string; expiresAt?: string; isActive: boolean; createdAt: string;
}
export interface InstitutionMember {
  id: string; name: string; baseRole: 'student' | 'lecturer'; title?: string; createdAt: string;
}
export interface InstitutionAdmin {
  id: string; userId: string; name: string; grantedBy?: string; createdAt: string;
}
export interface InstitutionOverview {
  id: string; name: string; shortCode: string;
  facultyCount: number; departmentCount: number; programmeCount: number;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// ---- Institution overview ----

export async function getMyInstitutionOverview(institutionId: string): Promise<InstitutionOverview> {
  const [institution, faculties, departments, programmes] = await Promise.all([
    supabase.from('institutions').select('id, name, short_code').eq('id', institutionId).single(),
    supabase.from('faculties').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId),
    supabase.from('departments').select('id, faculties!inner(institution_id)', { count: 'exact', head: true })
      .eq('faculties.institution_id', institutionId),
    supabase.from('programmes').select('id, departments!inner(faculties!inner(institution_id))', { count: 'exact', head: true })
      .eq('departments.faculties.institution_id', institutionId),
  ]);

  const inst = unwrap(institution as { data: { id: string; name: string; short_code: string } | null; error: { message: string } | null });
  return {
    id: inst.id,
    name: inst.name,
    shortCode: inst.short_code,
    facultyCount: faculties.count ?? 0,
    departmentCount: departments.count ?? 0,
    programmeCount: programmes.count ?? 0,
  };
}

// ---- Faculties ----

export async function listFaculties(institutionId: string): Promise<Faculty[]> {
  const { data, error } = await supabase
    .from('faculties')
    .select('id, name, code, created_at')
    .eq('institution_id', institutionId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({ id: f.id, name: f.name, code: f.code, createdAt: f.created_at }));
}

export async function createFaculty(institutionId: string, name: string, code: string): Promise<void> {
  const { error } = await supabase.from('faculties').insert({ institution_id: institutionId, name, code });
  if (error) throw new Error(error.message);
}

export async function deleteFaculty(facultyId: string): Promise<void> {
  const { error } = await supabase.from('faculties').delete().eq('id', facultyId);
  if (error) throw new Error(error.message);
}

// ---- Departments ----

export async function listDepartments(facultyId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, faculty_id, name, code, created_at')
    .eq('faculty_id', facultyId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({ id: d.id, facultyId: d.faculty_id, name: d.name, code: d.code, createdAt: d.created_at }));
}

export async function createDepartment(facultyId: string, name: string, code: string): Promise<void> {
  const { error } = await supabase.from('departments').insert({ faculty_id: facultyId, name, code });
  if (error) throw new Error(error.message);
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  const { error } = await supabase.from('departments').delete().eq('id', departmentId);
  if (error) throw new Error(error.message);
}

// ---- Programmes ----

export async function listProgrammes(departmentId: string): Promise<Programme[]> {
  const { data, error } = await supabase
    .from('programmes')
    .select('id, department_id, name, code, degree_type, duration_years, created_at')
    .eq('department_id', departmentId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id, departmentId: p.department_id, name: p.name, code: p.code,
    degreeType: p.degree_type ?? undefined, durationYears: p.duration_years ?? undefined, createdAt: p.created_at,
  }));
}

export async function createProgramme(
  departmentId: string, name: string, code: string, degreeType?: string, durationYears?: number
): Promise<void> {
  const { error } = await supabase.from('programmes').insert({
    department_id: departmentId, name, code, degree_type: degreeType ?? null, duration_years: durationYears ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteProgramme(programmeId: string): Promise<void> {
  const { error } = await supabase.from('programmes').delete().eq('id', programmeId);
  if (error) throw new Error(error.message);
}

// ---- Academic sessions ----

export async function listAcademicSessions(institutionId: string): Promise<AcademicSession[]> {
  const { data, error } = await supabase
    .from('academic_sessions')
    .select('id, label, start_date, end_date, is_current, created_at')
    .eq('institution_id', institutionId)
    .order('label', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id, label: s.label, startDate: s.start_date ?? undefined, endDate: s.end_date ?? undefined,
    isCurrent: s.is_current, createdAt: s.created_at,
  }));
}

export async function createAcademicSession(
  institutionId: string, label: string, startDate?: string, endDate?: string
): Promise<void> {
  const { error } = await supabase.from('academic_sessions').insert({
    institution_id: institutionId, label, start_date: startDate ?? null, end_date: endDate ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Marks one session current and every other session for this institution not-current. Two sequential updates - Supabase JS has no client-side multi-statement transaction, and this is a low-frequency admin action. */
export async function setCurrentAcademicSession(institutionId: string, sessionId: string): Promise<void> {
  const { error: clearError } = await supabase
    .from('academic_sessions')
    .update({ is_current: false })
    .eq('institution_id', institutionId);
  if (clearError) throw new Error(clearError.message);

  const { error: setError } = await supabase
    .from('academic_sessions')
    .update({ is_current: true })
    .eq('id', sessionId);
  if (setError) throw new Error(setError.message);
}

// ---- Join codes ----

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 - avoids ambiguous characters
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function listJoinCodes(institutionId: string): Promise<JoinCode[]> {
  const { data, error } = await supabase
    .from('institution_join_codes')
    .select('id, code, created_by, expires_at, is_active, created_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((j) => ({
    id: j.id, code: j.code, createdBy: j.created_by ?? undefined,
    expiresAt: j.expires_at ?? undefined, isActive: j.is_active, createdAt: j.created_at,
  }));
}

/** Creates a new active join code. Does NOT deactivate existing codes - regenerating is additive by default, since instantly invalidating an in-flight registration is unsafe (see Milestone 1 plan). Deactivate old ones explicitly via deactivateJoinCode if desired. */
export async function createJoinCode(institutionId: string, createdBy: string, expiresAt?: string): Promise<string> {
  const code = generateJoinCode();
  const { error } = await supabase.from('institution_join_codes').insert({
    institution_id: institutionId, code, created_by: createdBy, expires_at: expiresAt ?? null,
  });
  if (error) throw new Error(error.message);
  return code;
}

export async function deactivateJoinCode(joinCodeId: string): Promise<void> {
  const { error } = await supabase.from('institution_join_codes').update({ is_active: false }).eq('id', joinCodeId);
  if (error) throw new Error(error.message);
}

// ---- Institution members (Users tab) ----

export async function listInstitutionMembers(institutionId: string, baseRole?: 'student' | 'lecturer'): Promise<InstitutionMember[]> {
  let query = supabase
    .from('profiles')
    .select('id, name, base_role, title, created_at')
    .eq('institution_id', institutionId)
    .order('name');
  if (baseRole) query = query.eq('base_role', baseRole);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id, name: m.name, baseRole: m.base_role, title: m.title ?? undefined, createdAt: m.created_at,
  }));
}

// ---- Institution admin delegation ----

export async function listInstitutionAdmins(institutionId: string): Promise<InstitutionAdmin[]> {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('id, user_id, granted_by, created_at, profiles!admin_roles_user_id_fkey ( name )')
    .eq('institution_id', institutionId)
    .eq('role', 'institution_admin');
  if (error) throw new Error(error.message);
  return (data ?? []).map((a: any) => ({
    id: a.id, userId: a.user_id, name: a.profiles?.name ?? '(unknown)',
    grantedBy: a.granted_by ?? undefined, createdAt: a.created_at,
  }));
}

/** Appoints another member of the SAME institution as institution_admin. RLS (can_grant_admin_role) independently enforces that the caller may only do this within their own institution - this check here is a UX nicety, not the real security boundary. */
export async function appointInstitutionAdmin(institutionId: string, targetUserId: string, grantedBy: string): Promise<void> {
  const { error } = await supabase.from('admin_roles').insert({
    user_id: targetUserId, role: 'institution_admin', institution_id: institutionId, granted_by: grantedBy,
  });
  if (error) throw new Error(error.message);
}

export async function revokeInstitutionAdmin(adminRoleId: string): Promise<void> {
  const { error } = await supabase.from('admin_roles').delete().eq('id', adminRoleId);
  if (error) throw new Error(error.message);
}
