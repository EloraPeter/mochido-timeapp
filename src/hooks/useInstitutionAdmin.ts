'use client';

import { useState, useEffect, useCallback } from 'react';
import * as institutionService from '@/lib/services/institution.service';
import type {
  Faculty, Department, Programme, AcademicSession, JoinCode,
  InstitutionMember, InstitutionAdmin, InstitutionOverview,
} from '@/lib/services/institution.service';

/**
 * Thin React wrapper over institution.service.ts - no Supabase calls
 * happen here directly, everything funnels through the service layer.
 */
export function useInstitutionAdmin(institutionId: string | null, currentUserId: string | null) {
  const [overview, setOverview] = useState<InstitutionOverview | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([]);
  const [joinCodes, setJoinCodes] = useState<JoinCode[]>([]);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [admins, setAdmins] = useState<InstitutionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [ov, fac, sessions, codes, mem, adm] = await Promise.all([
        institutionService.getMyInstitutionOverview(institutionId),
        institutionService.listFaculties(institutionId),
        institutionService.listAcademicSessions(institutionId),
        institutionService.listJoinCodes(institutionId),
        institutionService.listInstitutionMembers(institutionId),
        institutionService.listInstitutionAdmins(institutionId),
      ]);
      setOverview(ov);
      setFaculties(fac);
      setAcademicSessions(sessions);
      setJoinCodes(codes);
      setMembers(mem);
      setAdmins(adm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load institution data');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addFaculty = useCallback(async (name: string, code: string) => {
    if (!institutionId) return;
    await institutionService.createFaculty(institutionId, name, code);
    setFaculties(await institutionService.listFaculties(institutionId));
  }, [institutionId]);

  const removeFaculty = useCallback(async (facultyId: string) => {
    if (!institutionId) return;
    await institutionService.deleteFaculty(facultyId);
    setFaculties(await institutionService.listFaculties(institutionId));
  }, [institutionId]);

  const listDepartmentsFor = useCallback((facultyId: string) => institutionService.listDepartments(facultyId), []);
  const addDepartment = useCallback((facultyId: string, name: string, code: string) =>
    institutionService.createDepartment(facultyId, name, code), []);
  const removeDepartment = useCallback((departmentId: string) =>
    institutionService.deleteDepartment(departmentId), []);

  const listProgrammesFor = useCallback((departmentId: string) => institutionService.listProgrammes(departmentId), []);
  const addProgramme = useCallback((departmentId: string, name: string, code: string, degreeType?: string, durationYears?: number) =>
    institutionService.createProgramme(departmentId, name, code, degreeType, durationYears), []);
  const removeProgramme = useCallback((programmeId: string) =>
    institutionService.deleteProgramme(programmeId), []);

  const addAcademicSession = useCallback(async (label: string, startDate?: string, endDate?: string) => {
    if (!institutionId) return;
    await institutionService.createAcademicSession(institutionId, label, startDate, endDate);
    setAcademicSessions(await institutionService.listAcademicSessions(institutionId));
  }, [institutionId]);

  const setCurrentSession = useCallback(async (sessionId: string) => {
    if (!institutionId) return;
    await institutionService.setCurrentAcademicSession(institutionId, sessionId);
    setAcademicSessions(await institutionService.listAcademicSessions(institutionId));
  }, [institutionId]);

  const addJoinCode = useCallback(async (expiresAt?: string) => {
    if (!institutionId || !currentUserId) return;
    const code = await institutionService.createJoinCode(institutionId, currentUserId, expiresAt);
    setJoinCodes(await institutionService.listJoinCodes(institutionId));
    return code;
  }, [institutionId, currentUserId]);

  const deactivateJoinCode = useCallback(async (joinCodeId: string) => {
    if (!institutionId) return;
    await institutionService.deactivateJoinCode(joinCodeId);
    setJoinCodes(await institutionService.listJoinCodes(institutionId));
  }, [institutionId]);

  const appointAdmin = useCallback(async (targetUserId: string) => {
    if (!institutionId || !currentUserId) return;
    await institutionService.appointInstitutionAdmin(institutionId, targetUserId, currentUserId);
    setAdmins(await institutionService.listInstitutionAdmins(institutionId));
  }, [institutionId, currentUserId]);

  const revokeAdmin = useCallback(async (adminRoleId: string) => {
    if (!institutionId) return;
    await institutionService.revokeInstitutionAdmin(adminRoleId);
    setAdmins(await institutionService.listInstitutionAdmins(institutionId));
  }, [institutionId]);

  return {
    overview, faculties, academicSessions, joinCodes, members, admins, loading, error,
    refresh: loadAll,
    addFaculty, removeFaculty,
    listDepartmentsFor, addDepartment, removeDepartment,
    listProgrammesFor, addProgramme, removeProgramme,
    addAcademicSession, setCurrentSession,
    addJoinCode, deactivateJoinCode,
    appointAdmin, revokeAdmin,
  };
}
