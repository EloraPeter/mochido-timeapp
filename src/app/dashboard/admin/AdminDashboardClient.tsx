'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionAdmin } from '@/hooks/useInstitutionAdmin';
import { logout } from '@/lib/auth/pinAuth';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'faculties' | 'sessions' | 'joinCodes' | 'admins' | 'users';

export default function AdminDashboardClient() {
  const { user } = useAuth();
  const router = useRouter();
  const institutionId = user?.institutionId ?? null;
  const admin = useInstitutionAdmin(institutionId, user?.id ?? null);
  const [tab, setTab] = useState<Tab>('overview');

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (admin.loading) {
    return <div className="p-6 text-gray-500">Loading institution data...</div>;
  }

  if (admin.error) {
    return <div className="p-6 text-red-500">Error: {admin.error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {admin.overview?.name ?? 'Institution Admin'}
          </h1>
          <p className="text-xs text-gray-500">{admin.overview?.shortCode}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:underline">Log out</button>
      </header>

      <nav className="flex gap-1 p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {(['overview', 'faculties', 'sessions', 'joinCodes', 'admins', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === t ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t === 'joinCodes' ? 'Join Codes' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {tab === 'overview' && admin.overview && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Faculties" value={admin.overview.facultyCount} />
            <StatCard label="Departments" value={admin.overview.departmentCount} />
            <StatCard label="Programmes" value={admin.overview.programmeCount} />
          </div>
        )}

        {tab === 'faculties' && <FacultiesTab admin={admin} />}
        {tab === 'sessions' && <SessionsTab admin={admin} />}
        {tab === 'joinCodes' && <JoinCodesTab admin={admin} />}
        {tab === 'admins' && <AdminsTab admin={admin} currentUserId={user?.id ?? ''} />}
        {tab === 'users' && <UsersTab admin={admin} />}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FacultiesTab({ admin }: { admin: ReturnType<typeof useInstitutionAdmin> }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    await admin.addFaculty(name.trim(), code.trim().toUpperCase());
    setName(''); setCode('');
  };

  return (
    <Section title="Faculties">
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Faculty name" className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-24 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm" />
        <button type="submit" className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Add</button>
      </form>

      <div className="space-y-2">
        {admin.faculties.map((f) => (
          <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-center p-3">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{f.name}</span>{' '}
                <span className="text-xs text-gray-500 font-mono">{f.code}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setExpanded(expanded === f.id ? null : f.id)} className="text-xs text-blue-500">
                  {expanded === f.id ? 'Hide' : 'Departments'}
                </button>
                <button onClick={() => admin.removeFaculty(f.id)} className="text-xs text-red-500">Delete</button>
              </div>
            </div>
            {expanded === f.id && <DepartmentsPanel admin={admin} facultyId={f.id} />}
          </div>
        ))}
        {admin.faculties.length === 0 && <p className="text-sm text-gray-400">No faculties yet.</p>}
      </div>
    </Section>
  );
}

function DepartmentsPanel({ admin, facultyId }: { admin: ReturnType<typeof useInstitutionAdmin>; facultyId: string }) {
  const [departments, setDepartments] = useState<Awaited<ReturnType<typeof admin.listDepartmentsFor>>>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => setDepartments(await admin.listDepartmentsFor(facultyId));
  if (!loaded) { setLoaded(true); load(); }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    await admin.addDepartment(facultyId, name.trim(), code.trim().toUpperCase());
    setName(''); setCode(''); await load();
  };

  return (
    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
      <form onSubmit={submit} className="flex gap-2 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-20 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm" />
        <button type="submit" className="px-3 py-2 bg-blue-400 text-white rounded-lg text-xs">Add</button>
      </form>
      <div className="space-y-2">
        {departments.map((d) => (
          <div key={d.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex justify-between items-center p-2">
              <span className="text-sm text-gray-800 dark:text-gray-200">{d.name} <span className="text-xs text-gray-500 font-mono">{d.code}</span></span>
              <div className="flex gap-2">
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="text-xs text-blue-500">
                  {expanded === d.id ? 'Hide' : 'Programmes'}
                </button>
                <button onClick={async () => { await admin.removeDepartment(d.id); await load(); }} className="text-xs text-red-500">Delete</button>
              </div>
            </div>
            {expanded === d.id && <ProgrammesPanel admin={admin} departmentId={d.id} />}
          </div>
        ))}
        {departments.length === 0 && <p className="text-xs text-gray-400">No departments yet.</p>}
      </div>
    </div>
  );
}

function ProgrammesPanel({ admin, departmentId }: { admin: ReturnType<typeof useInstitutionAdmin>; departmentId: string }) {
  const [programmes, setProgrammes] = useState<Awaited<ReturnType<typeof admin.listProgrammesFor>>>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => setProgrammes(await admin.listProgrammesFor(departmentId));
  if (!loaded) { setLoaded(true); load(); }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    await admin.addProgramme(departmentId, name.trim(), code.trim().toUpperCase());
    setName(''); setCode(''); await load();
  };

  return (
    <div className="px-2 pb-2 border-t border-gray-200 dark:border-gray-700 pt-2 ml-2">
      <form onSubmit={submit} className="flex gap-2 mb-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Programme name" className="flex-1 p-1.5 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-16 p-1.5 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs" />
        <button type="submit" className="px-2 py-1 bg-blue-300 text-white rounded-lg text-xs">Add</button>
      </form>
      {programmes.map((p) => (
        <div key={p.id} className="flex justify-between items-center py-1 text-xs text-gray-700 dark:text-gray-300">
          <span>{p.name} <span className="text-gray-500 font-mono">{p.code}</span></span>
          <button onClick={async () => { await admin.removeProgramme(p.id); await load(); }} className="text-red-500">Delete</button>
        </div>
      ))}
      {programmes.length === 0 && <p className="text-xs text-gray-400">No programmes yet.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SessionsTab({ admin }: { admin: ReturnType<typeof useInstitutionAdmin> }) {
  const [label, setLabel] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    await admin.addAcademicSession(label.trim());
    setLabel('');
  };

  return (
    <Section title="Academic Sessions">
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "2025/2026"' className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm" />
        <button type="submit" className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Add</button>
      </form>
      <div className="space-y-2">
        {admin.academicSessions.map((s) => (
          <div key={s.id} className="flex justify-between items-center p-2 border border-gray-100 dark:border-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-white">
              {s.label} {s.isCurrent && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>}
            </span>
            {!s.isCurrent && (
              <button onClick={() => admin.setCurrentSession(s.id)} className="text-xs text-blue-500">Set as current</button>
            )}
          </div>
        ))}
        {admin.academicSessions.length === 0 && <p className="text-sm text-gray-400">No academic sessions yet.</p>}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function JoinCodesTab({ admin }: { admin: ReturnType<typeof useInstitutionAdmin> }) {
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generate = async () => {
    const code = await admin.addJoinCode();
    if (code) setLastGenerated(code);
  };

  return (
    <Section title="Join Codes">
      <p className="text-xs text-gray-500 mb-3">
        Generating a new code does not deactivate existing ones - deactivate old codes explicitly once you're sure nobody still needs them.
      </p>
      <button onClick={generate} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm mb-4">Generate new code</button>
      {lastGenerated && (
        <p className="text-sm mb-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 font-mono">
          New code: {lastGenerated}
        </p>
      )}
      <div className="space-y-2">
        {admin.joinCodes.map((j) => (
          <div key={j.id} className="flex justify-between items-center p-2 border border-gray-100 dark:border-gray-700 rounded-lg">
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {j.code} {!j.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
            </span>
            {j.isActive && (
              <button onClick={() => admin.deactivateJoinCode(j.id)} className="text-xs text-red-500">Deactivate</button>
            )}
          </div>
        ))}
        {admin.joinCodes.length === 0 && <p className="text-sm text-gray-400">No join codes yet.</p>}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function AdminsTab({ admin, currentUserId }: { admin: ReturnType<typeof useInstitutionAdmin>; currentUserId: string }) {
  const [search, setSearch] = useState('');
  const candidates = admin.members.filter(
    (m) => m.name.toLowerCase().includes(search.toLowerCase()) && !admin.admins.some((a) => a.userId === m.id)
  );

  return (
    <Section title="Institution Admins">
      <div className="space-y-2 mb-4">
        {admin.admins.map((a) => (
          <div key={a.id} className="flex justify-between items-center p-2 border border-gray-100 dark:border-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-white">{a.name}</span>
            {a.userId !== currentUserId && (
              <button onClick={() => admin.revokeAdmin(a.id)} className="text-xs text-red-500">Revoke</button>
            )}
          </div>
        ))}
        {admin.admins.length === 0 && <p className="text-sm text-gray-400">No institution admins appointed yet.</p>}
      </div>

      <p className="text-xs text-gray-500 mb-2">Appoint another admin (searches students &amp; lecturers at this institution):</p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm mb-2" />
      {search && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {candidates.map((m) => (
            <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-800 dark:text-gray-200">{m.name} <span className="text-xs text-gray-500">({m.baseRole})</span></span>
              <button onClick={() => admin.appointAdmin(m.id)} className="text-xs text-blue-500">Appoint</button>
            </div>
          ))}
          {candidates.length === 0 && <p className="text-xs text-gray-400">No matches.</p>}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function UsersTab({ admin }: { admin: ReturnType<typeof useInstitutionAdmin> }) {
  const [filter, setFilter] = useState<'all' | 'student' | 'lecturer'>('all');
  const filtered = filter === 'all' ? admin.members : admin.members.filter((m) => m.baseRole === filter);

  return (
    <Section title="Users">
      <div className="flex gap-2 mb-3">
        {(['all', 'student', 'lecturer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {filtered.map((m) => (
          <div key={m.id} className="flex justify-between items-center p-2 border border-gray-100 dark:border-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-white">{m.name}</span>
            <span className="text-xs text-gray-500">{m.baseRole}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400">No users found.</p>}
      </div>
    </Section>
  );
}
