import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import { downloadStudentPdf } from "./lib/reportPdf";

type Role = "Administrador" | "Docente" | "Psicólogo/Orientador";
type View = "dashboard" | "students" | "reports" | "team";
type TeamMember = {
  id: string;
  full_name: string;
  role: Role;
  email?: string;
  created_at: string;
};
type Student = {
  id: string;
  name: string;
  document: string;
  birthDate: string;
  age: number;
  course: string;
  address: string;
  guardian: string;
  phone: string;
  disability: string;
  diagnosis: string;
  observations: string;
  status: "Activo" | "En seguimiento" | "Retirado";
  registeredAt: string;
  followUps: FollowUp[];
  adjustments: Adjustment;
};
type FollowUp = {
  id: string;
  date: string;
  progress: string;
  difficulties: string;
  recommendations: string;
};
type Adjustment = {
  adaptations: string;
  strategies: string;
  supports: string;
  appliedFollowUp: string;
};

const blankStudent = (): Omit<
  Student,
  "id" | "registeredAt" | "followUps" | "adjustments"
> => ({
  name: "",
  document: "",
  birthDate: "",
  age: 0,
  course: "",
  address: "",
  guardian: "",
  phone: "",
  disability: "",
  diagnosis: "",
  observations: "",
  status: "Activo",
});
const seedStudents: Student[] = [
  {
    ...blankStudent(),
    id: "ana",
    registeredAt: "2026-02-12",
    name: "Ana Morales",
    document: "TI 1029384",
    birthDate: "2017-04-14",
    age: 8,
    course: "3A",
    address: "Cra. 12 # 45-20",
    guardian: "Carlos Morales",
    phone: "310 555 0182",
    disability: "TEA",
    diagnosis: "Trastorno del espectro autista",
    observations: "Requiere rutinas predecibles.",
    status: "En seguimiento",
    followUps: [
      {
        id: "f1",
        date: "2026-08-18",
        progress: "Participa con mayor autonomía.",
        difficulties: "Transiciones entre actividades.",
        recommendations: "Usar agenda visual y anticipación.",
      },
    ],
    adjustments: {
      adaptations: "Tiempo adicional y apoyo visual.",
      strategies: "Instrucciones segmentadas.",
      supports: "Docente de apoyo.",
      appliedFollowUp: "Revisión semanal.",
    },
  },
  {
    ...blankStudent(),
    id: "luis",
    registeredAt: "2026-03-08",
    name: "Luis Paredes",
    document: "TI 1029385",
    birthDate: "2015-09-20",
    age: 10,
    course: "5B",
    address: "Calle 8 # 20-11",
    guardian: "Laura Paredes",
    phone: "315 555 0110",
    disability: "Auditiva",
    diagnosis: "Discapacidad auditiva",
    observations: "Buen desempeño con material visual.",
    status: "Activo",
    followUps: [
      {
        id: "f2",
        date: "2026-08-10",
        progress: "Avanza en lectura comprensiva.",
        difficulties: "Acceso a instrucciones orales.",
        recommendations: "Confirmar instrucciones por escrito.",
      },
    ],
    adjustments: {
      adaptations: "Materiales impresos.",
      strategies: "Apoyos visuales.",
      supports: "Intérprete de lengua de señas.",
      appliedFollowUp: "Revisión mensual.",
    },
  },
];

const toStudent = (
  row: Record<string, unknown>,
  followUps: FollowUp[],
  adjustments?: Adjustment,
): Student => ({
  ...blankStudent(),
  id: String(row.id),
  name: String(row.name || ""),
  document: String(row.document || ""),
  birthDate: String(row.birth_date || ""),
  age: row.birth_date
    ? Math.max(
        0,
        new Date().getFullYear() -
          new Date(String(row.birth_date)).getFullYear(),
      )
    : 0,
  course: String(row.course || ""),
  address: String(row.address || ""),
  guardian: String(row.guardian || ""),
  phone: String(row.phone || ""),
  disability: String(row.disability || ""),
  diagnosis: String(row.diagnosis || ""),
  observations: String(row.observations || ""),
  status: (row.status as Student["status"]) || "Activo",
  registeredAt: String(row.registered_at || "").slice(0, 10),
  followUps,
  adjustments: adjustments || {
    adaptations: "",
    strategies: "",
    supports: "",
    appliedFollowUp: "",
  },
});

const studentPayload = (
  student: Omit<Student, "id" | "registeredAt" | "followUps" | "adjustments">,
) => ({
  name: student.name,
  document: student.document,
  birth_date: student.birthDate,
  course: student.course,
  address: student.address,
  guardian: student.guardian,
  phone: student.phone,
  disability: student.disability,
  diagnosis: student.diagnosis,
  observations: student.observations,
  status: student.status,
});

function App() {
  const [students, setStudents] = useState<Student[]>(
    () =>
      JSON.parse(localStorage.getItem("iti-students") || "null") ||
      seedStudents,
  );
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState("ana");
  const [role, setRole] = useState<Role>("Psicólogo/Orientador");
  const [loggedIn, setLoggedIn] = useState(!supabase);
  const [recovery, setRecovery] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [course, setCourse] = useState("Todos");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blankStudent());
  const [followUpForm, setFollowUpForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    progress: "",
    difficulties: "",
    recommendations: "",
  });
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamForm, setTeamForm] = useState({
    full_name: "",
    email: "",
    role: "Docente" as Role,
  });

  useEffect(() => {
    localStorage.setItem("iti-students", JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const loadSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!active) return;
      setLoggedIn(Boolean(session));
      if (!session) return;
      const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role) setRole(profile.role as Role);
      const { data: members } = await client
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: true });
      if (members) setTeam(members as TeamMember[]);
      const { data: rows, error } = await client
        .from("students")
        .select("*")
        .order("registered_at", { ascending: false });
      if (error || !rows) return;
      const loaded = await Promise.all(
        (rows as Record<string, unknown>[]).map(async (row) => {
          const { data: followUps } = await client
            .from("follow_ups")
            .select("*")
            .eq("student_id", row.id)
            .order("observed_at", { ascending: false });
          const { data: adjustment } = await client
            .from("reasonable_adjustments")
            .select("*")
            .eq("student_id", row.id)
            .maybeSingle();
          return toStudent(
            row,
            ((followUps || []) as Record<string, unknown>[]).map((item) => ({
              id: String(item.id),
              date: String(item.observed_at),
              progress: String(item.academic_progress || ""),
              difficulties: String(item.difficulties || ""),
              recommendations: String(item.recommendations || ""),
            })),
            adjustment
              ? {
                  adaptations: String(adjustment.adaptations || ""),
                  strategies: String(adjustment.strategies || ""),
                  supports: String(adjustment.supports || ""),
                  appliedFollowUp: String(adjustment.applied_follow_up || ""),
                }
              : undefined,
          );
        }),
      );
      if (active) setStudents(loaded);
    };
    void loadSession();
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => setLoggedIn(Boolean(session)),
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  const selected =
    students.find((student) => student.id === selectedId) || students[0];
  const filtered = useMemo(
    () =>
      students.filter(
        (student) =>
          `${student.name} ${student.document} ${student.course} ${student.disability}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (status === "Todos" || student.status === status) &&
          (course === "Todos" || student.course === course),
      ),
    [students, search, status, course],
  );
  const distribution = students.reduce<Record<string, number>>(
    (result, student) => {
      result[student.disability] = (result[student.disability] || 0) + 1;
      return result;
    },
    {},
  );
  const courses = [...new Set(students.map((student) => student.course))];
  const canEdit = role === "Administrador" || role === "Psicólogo/Orientador";
  const canDelete = role === "Administrador";
  const canCreateStudents = role !== "Docente";
  const canViewReports =
    role === "Administrador" || role === "Psicólogo/Orientador";

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setLoggedIn(false);
  };
  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    if (supabase && !recovery) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        window.alert(error.message);
        return;
      }
    }
    if (supabase && recovery) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        window.alert(error.message);
        return;
      }
      window.alert("Revisa tu correo institucional.");
      return;
    }
    setLoggedIn(true);
  };
  const submitStudent = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreateStudents) return;
    const payload = studentPayload(form);
    if (supabase) {
      const result = editing
        ? await supabase
            .from("students")
            .update(payload)
            .eq("id", editing)
            .select()
            .single()
        : await supabase
            .from("students")
            .insert({
              ...payload,
              created_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .select()
            .single();
      if (result.error || !result.data) {
        window.alert(
          result.error?.message || "No se pudo guardar el estudiante.",
        );
        return;
      }
      const student = toStudent(
        result.data as Record<string, unknown>,
        editing
          ? students.find((item) => item.id === editing)?.followUps || []
          : [],
      );
      setStudents((current) =>
        editing
          ? current.map((item) => (item.id === editing ? student : item))
          : [student, ...current],
      );
      setSelectedId(student.id);
    } else {
      const student: Student = {
        ...form,
        id: editing || crypto.randomUUID(),
        registeredAt: editing
          ? students.find((item) => item.id === editing)?.registeredAt ||
            new Date().toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        followUps: editing
          ? students.find((item) => item.id === editing)?.followUps || []
          : [],
        adjustments: editing
          ? students.find((item) => item.id === editing)?.adjustments || {
              adaptations: "",
              strategies: "",
              supports: "",
              appliedFollowUp: "",
            }
          : {
              adaptations: "",
              strategies: "",
              supports: "",
              appliedFollowUp: "",
            },
      };
      setStudents((current) =>
        editing
          ? current.map((item) => (item.id === editing ? student : item))
          : [student, ...current],
      );
      setSelectedId(student.id);
    }
    setEditing(null);
    setForm(blankStudent());
  };
  const editStudent = (student: Student) => {
    setEditing(student.id);
    setForm({
      name: student.name,
      document: student.document,
      birthDate: student.birthDate,
      age: student.age,
      course: student.course,
      address: student.address,
      guardian: student.guardian,
      phone: student.phone,
      disability: student.disability,
      diagnosis: student.diagnosis,
      observations: student.observations,
      status: student.status,
    });
  };
  const deleteStudent = async (id: string) => {
    if (
      !canDelete ||
      !window.confirm(
        "¿Eliminar este registro? Esta acción no se puede deshacer.",
      )
    )
      return;
    if (supabase) {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) {
        window.alert(error.message);
        return;
      }
    }
    setStudents((current) => current.filter((student) => student.id !== id));
    setSelectedId(students.find((student) => student.id !== id)?.id || "");
  };
  const addFollowUp = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (supabase) {
      const { data, error } = await supabase
        .from("follow_ups")
        .insert({
          student_id: selected.id,
          observed_at: followUpForm.date,
          academic_progress: followUpForm.progress,
          difficulties: followUpForm.difficulties,
          recommendations: followUpForm.recommendations,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error || !data) {
        window.alert(error?.message || "No se pudo guardar el seguimiento.");
        return;
      }
      setStudents((current) =>
        current.map((student) =>
          student.id === selected.id
            ? {
                ...student,
                followUps: [
                  {
                    id: String(data.id),
                    date: followUpForm.date,
                    progress: followUpForm.progress,
                    difficulties: followUpForm.difficulties,
                    recommendations: followUpForm.recommendations,
                  },
                  ...student.followUps,
                ],
              }
            : student,
        ),
      );
    } else
      setStudents((current) =>
        current.map((student) =>
          student.id === selected.id
            ? {
                ...student,
                followUps: [
                  { ...followUpForm, id: crypto.randomUUID() },
                  ...student.followUps,
                ],
              }
            : student,
        ),
      );
    setFollowUpForm({
      date: new Date().toISOString().slice(0, 10),
      progress: "",
      difficulties: "",
      recommendations: "",
    });
  };
  const exportCsv = () => {
    if (!canViewReports) return;
    const headers = [
      "Nombre",
      "Documento",
      "Nacimiento",
      "Edad",
      "Curso",
      "Dirección",
      "Acudiente",
      "Teléfono",
      "Discapacidad",
      "Diagnóstico",
      "Estado",
      "Fecha registro",
    ];
    const rows = students.map((s) => [
      s.name,
      s.document,
      s.birthDate,
      s.age,
      s.course,
      s.address,
      s.guardian,
      s.phone,
      s.disability,
      s.diagnosis,
      s.status,
      s.registeredAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "reporte-institucional.csv";
    link.click();
  };
  const exportPdf = (student?: Student) => { if (!canViewReports) return; downloadStudentPdf(students, student) };
  const inviteMember = async (event: FormEvent) => {
    event.preventDefault();
    if (role !== "Administrador" || !supabase) return;
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: teamForm,
    });
    if (error || !data?.profile) {
      window.alert(
        error?.message || "Configura la Edge Function invite-user en Supabase.",
      );
      return;
    }
    setTeam((current) => [...current, data.profile as TeamMember]);
    setTeamForm({ full_name: "", email: "", role: "Docente" });
  };
  const updateMemberRole = async (member: TeamMember, nextRole: Role) => {
    if (role !== "Administrador" || !supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", member.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    setTeam((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, role: nextRole } : item,
      ),
    );
  };

  if (!loggedIn)
    return (
      <main className="auth-screen">
        <form className="auth-panel" onSubmit={submitAuth}>
          <span className="brand-mark">ITI</span>
          <p className="eyebrow dark-eyebrow">Portal institucional seguro</p>
          <h1>{recovery ? "Recuperar contraseña" : "Iniciar sesión"}</h1>
          <p className="muted">
            Acceso protegido para equipos de inclusión educativa.
          </p>
          {!recovery && (
            <>
              <label className="field-label">
                Rol
                <select
                  className="field-input"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  <option>Administrador</option>
                  <option>Docente</option>
                  <option>Psicólogo/Orientador</option>
                </select>
              </label>
              <label className="field-label">
                Contraseña
                <input
                  className="field-input"
                  name="password"
                  type="password"
                  required
                />
              </label>
            </>
          )}
          <label className="field-label">
            Correo institucional
            <input
              className="field-input"
              name="email"
              type="email"
              placeholder="nombre@institucion.edu.co"
              required
            />
          </label>
          <button className="button-primary">
            {recovery ? "Enviar enlace" : "Entrar al portal"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setRecovery(!recovery)}
          >
            {recovery
              ? "Volver al inicio de sesión"
              : "¿Olvidaste tu contraseña?"}
          </button>
        </form>
      </main>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ITI</span>
          <div>
            <strong>Inclusión</strong>
            <small>Gestión escolar</small>
          </div>
        </div>
        <p className="nav-label">Espacio institucional</p>
        <nav>
          {[
            ["dashboard", "Resumen"],
            ["students", "Estudiantes"],
            ["reports", "Reportes"],
            ...(role === "Administrador" ? [["team", "Equipo"]] : []),
          ].map(([key, label]) => (
            <button
              className={`nav-button ${view === key ? "active" : ""}`}
              onClick={() => setView(key as View)}
              key={key}
            >
              <span className="nav-icon">
                {key === "dashboard" ? "◈" : key === "students" ? "◎" : "▤"}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="connection-dot" />
          {supabase ? "Supabase configurado" : "Modo local de prueba"}
          <button className="logout-button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow dark-eyebrow">Instituto Técnico Industrial</p>
            <h1>
              {view === "dashboard"
                ? "Resumen institucional"
                : view === "students"
                  ? "Gestión de estudiantes"
                  : view === "team"
                    ? "Equipo institucional"
                  : "Reportes y exportaciones"}
            </h1>
          </div>
          <div className="profile">
            <span className="avatar">{role.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{role}</strong>
              <small>Sesión activa</small>
            </span>
            <button
              className="icon-button"
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              ↗
            </button>
          </div>
        </header>
        {view === "dashboard" && (
          <>
            <section className="welcome-strip">
              <div>
                <span className="strip-kicker">Panel de inclusión</span>
                <h2>Acompañamiento que se puede medir.</h2>
                <p>
                  Una vista institucional de estudiantes, seguimientos y apoyos.
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => setView("students")}
              >
                Abrir directorio →
              </button>
            </section>
            <section className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Estudiantes registrados</span>
                <strong>{students.length}</strong>
                <small>Base institucional</small>
              </div>
              <div className="stat-card accent">
                <span className="stat-label">En seguimiento</span>
                <strong>
                  {students.filter((s) => s.status === "En seguimiento").length}
                </strong>
                <small>Atención prioritaria</small>
              </div>
              <div className="stat-card">
                <span className="stat-label">Seguimientos del periodo</span>
                <strong>
                  {students.reduce((sum, s) => sum + s.followUps.length, 0)}
                </strong>
                <small>Observaciones registradas</small>
              </div>
              <div className="stat-card">
                <span className="stat-label">Actualización</span>
                <strong>94%</strong>
                <small>Información al día</small>
              </div>
            </section>
            <div className="dashboard-grid">
              <section className="panel chart-panel">
                <div className="section-header">
                  <div>
                    <p className="panel-kicker">Distribución</p>
                    <h2>Tipo de discapacidad</h2>
                  </div>
                  <span className="period-label">Total {students.length}</span>
                </div>
                <div className="bar-chart">
                  {Object.entries(distribution).map(([label, count], index) => (
                    <div className="bar-item" key={label}>
                      <span>{label}</span>
                      <div className="bar-track">
                        <i
                          className={
                            ["", "blue-bar", "orange-bar", "red-bar"][index % 4]
                          }
                          style={{
                            width: `${Math.max(16, (count / students.length) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel activity-panel">
                <div className="section-header">
                  <div>
                    <p className="panel-kicker">Actividad reciente</p>
                    <h2>Últimos seguimientos</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setView("students")}
                  >
                    Ver historial
                  </button>
                </div>
                <div className="activity-list">
                  {students
                    .flatMap((student) =>
                      student.followUps.slice(0, 1).map((item) => (
                        <div key={item.id}>
                          <span className="activity-dot green" />
                          <p>
                            <strong>{student.name}</strong>
                            <small>
                              {item.date} · {item.progress}
                            </small>
                          </p>
                        </div>
                      )),
                    )
                    .slice(0, 4)}
                </div>
              </section>
            </div>
          </>
        )}
        {view === "students" && (
          <>
            <section className="panel card-panel student-list-panel">
              <div className="section-header">
                <div>
                  <p className="panel-kicker">Base institucional</p>
                  <h2>Directorio de estudiantes</h2>
                </div>
                <span className="stat-pill">{filtered.length} resultados</span>
              </div>
              <div className="filters">
                <label className="search-box">
                  ⌕
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre, documento, curso o discapacidad"
                  />
                </label>
                <select
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                >
                  <option>Todos</option>
                  {courses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option>Todos</option>
                  <option>Activo</option>
                  <option>En seguimiento</option>
                  <option>Retirado</option>
                </select>
              </div>
              <div className="table-wrapper">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Curso</th>
                      <th>Discapacidad</th>
                      <th>Estado</th>
                      <th>Registro</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((student) => (
                      <tr
                        key={student.id}
                        className={
                          student.id === selectedId ? "selected-row" : ""
                        }
                        onClick={() => setSelectedId(student.id)}
                      >
                        <td>
                          <strong>{student.name}</strong>
                          <small>{student.document}</small>
                        </td>
                        <td>{student.course}</td>
                        <td>{student.disability}</td>
                        <td>
                          <span
                            className={`status status-${student.status.replaceAll(" ", "-").toLowerCase()}`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td>{student.registeredAt}</td>
                        <td>
                          <button
                            className="table-action"
                            disabled={!canEdit}
                            onClick={(event) => {
                              event.stopPropagation();
                              editStudent(student);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="table-action danger"
                            disabled={!canEdit}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteStudent(student.id);
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="students-layout">
              <section className="panel profile-panel">
                <div className="student-profile-head">
                  <span className="large-avatar">
                    {selected?.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <p className="panel-kicker">Perfil completo</p>
                    <h2>{selected?.name}</h2>
                    <span>
                      {selected?.course} · {selected?.age} años ·{" "}
                      {selected?.status}
                    </span>
                  </div>
                </div>
                {selected && (
                  <>
                    <div className="profile-section">
                      <h3>Datos personales</h3>
                      <p>
                        Nacimiento: {selected.birthDate || "Sin registrar"} ·
                        Documento: {selected.document}
                      </p>
                      <p>Dirección: {selected.address || "Sin registrar"}</p>
                      <p>
                        Acudiente: {selected.guardian || "Sin registrar"} ·{" "}
                        {selected.phone || "Sin teléfono"}
                      </p>
                    </div>
                    <div className="profile-section">
                      <h3>Información clínica y escolar</h3>
                      <p>
                        {selected.disability} · {selected.diagnosis}
                      </p>
                      <p>
                        {selected.observations ||
                          "Sin observaciones generales."}
                      </p>
                    </div>
                    <div className="profile-section">
                      <h3>Ajustes razonables</h3>
                      <p>
                        <b>Adaptaciones:</b>{" "}
                        {selected.adjustments.adaptations || "Pendiente"}
                      </p>
                      <p>
                        <b>Estrategias:</b>{" "}
                        {selected.adjustments.strategies || "Pendiente"}
                      </p>
                      <p>
                        <b>Apoyos:</b>{" "}
                        {selected.adjustments.supports || "Pendiente"}
                      </p>
                      <p>
                        <b>Aplicación:</b>{" "}
                        {selected.adjustments.appliedFollowUp || "Pendiente"}
                      </p>
                    </div>
                    <div className="profile-section">
                      <h3>Historial de seguimiento</h3>
                      {selected.followUps.map((item) => (
                        <article className="follow-up" key={item.id}>
                          <strong>{item.date}</strong>
                          <p>Avances: {item.progress}</p>
                          <p>Dificultades: {item.difficulties}</p>
                          <p>Recomendaciones: {item.recommendations}</p>
                        </article>
                      ))}
                      <form className="follow-form" onSubmit={addFollowUp}>
                        <input
                          className="field-input"
                          type="date"
                          value={followUpForm.date}
                          onChange={(event) =>
                            setFollowUpForm({
                              ...followUpForm,
                              date: event.target.value,
                            })
                          }
                          required
                        />
                        <input
                          className="field-input"
                          placeholder="Avances académicos"
                          value={followUpForm.progress}
                          onChange={(event) =>
                            setFollowUpForm({
                              ...followUpForm,
                              progress: event.target.value,
                            })
                          }
                          required
                        />
                        <textarea
                          className="field-textarea"
                          placeholder="Dificultades y recomendaciones"
                          value={`${followUpForm.difficulties}${followUpForm.recommendations ? ` | ${followUpForm.recommendations}` : ""}`}
                          onChange={(event) =>
                            setFollowUpForm({
                              ...followUpForm,
                              difficulties: event.target.value,
                            })
                          }
                          required
                        />
                        <button className="button-secondary">
                          Agregar seguimiento
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </section>
            </div>
            <section className="panel card-panel form-panel">
              <div className="section-header">
                <div>
                  <p className="panel-kicker">
                    {editing ? "Edición" : "Nuevo registro"}
                  </p>
                  <h2>
                    {editing ? "Editar estudiante" : "Registrar estudiante"}
                  </h2>
                </div>
                {editing && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(null);
                      setForm(blankStudent());
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <form className="student-form" onSubmit={submitStudent}>
                <div className="form-grid">
                  {[
                    ["name", "Nombre completo", "text"],
                    ["document", "Documento", "text"],
                    ["birthDate", "Fecha de nacimiento", "date"],
                    ["age", "Edad", "number"],
                    ["course", "Curso", "text"],
                    ["address", "Dirección", "text"],
                    ["guardian", "Acudiente", "text"],
                    ["phone", "Teléfono de contacto", "tel"],
                    ["disability", "Tipo de discapacidad", "text"],
                    ["diagnosis", "Diagnóstico clínico", "text"],
                  ].map(([key, label, type]) => (
                    <label className="field-row field-label" key={key}>
                      {label}
                      <input
                        className="field-input"
                        type={type}
                        value={String(form[key as keyof typeof form])}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            [key]:
                              type === "number"
                                ? Number(event.target.value)
                                : event.target.value,
                          })
                        }
                        required={[
                          "name",
                          "document",
                          "birthDate",
                          "course",
                          "guardian",
                          "disability",
                        ].includes(key)}
                      />
                    </label>
                  ))}
                </div>
                <label className="field-row field-label">
                  Observaciones
                  <textarea
                    className="field-textarea"
                    value={form.observations}
                    onChange={(event) =>
                      setForm({ ...form, observations: event.target.value })
                    }
                  />
                </label>
                <label className="field-row field-label">
                  Estado
                  <select
                    className="field-input"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as Student["status"],
                      })
                    }
                  >
                    <option>Activo</option>
                    <option>En seguimiento</option>
                    <option>Retirado</option>
                  </select>
                </label>
                <button className="button-primary">
                  {editing ? "Guardar cambios" : "Registrar estudiante"} →
                </button>
              </form>
            </section>
          </>
        )}
        {view === "team" && role === "Administrador" && (
          <div className="team-layout">
            <section className="panel card-panel">
              <p className="panel-kicker">Administración de acceso</p>
              <h2>Invitar miembro del equipo</h2>
              <p className="section-text">La persona recibirá un correo para crear su contraseña.</p>
              <form className="student-form" onSubmit={inviteMember}>
                <label className="field-row field-label">Nombre completo<input className="field-input" value={teamForm.full_name} onChange={(event) => setTeamForm({ ...teamForm, full_name: event.target.value })} required /></label>
                <label className="field-row field-label">Correo institucional<input className="field-input" type="email" value={teamForm.email} onChange={(event) => setTeamForm({ ...teamForm, email: event.target.value })} required /></label>
                <label className="field-row field-label">Rol<select className="field-input" value={teamForm.role} onChange={(event) => setTeamForm({ ...teamForm, role: event.target.value as Role })}><option>Docente</option><option>Psicólogo/Orientador</option><option>Administrador</option></select></label>
                <button className="button-primary" type="submit">Enviar invitación →</button>
              </form>
            </section>
            <section className="panel card-panel">
              <div className="section-header"><div><p className="panel-kicker">Accesos activos</p><h2>Equipo institucional</h2></div><span className="stat-pill">{team.length} usuarios</span></div>
              <div className="team-list">{team.map((member) => <div className="team-member" key={member.id}><span className="avatar">{member.full_name.slice(0, 2).toUpperCase()}</span><div><strong>{member.full_name}</strong><small>{member.email || "Usuario Auth"}</small></div><select className="role-select" value={member.role} onChange={(event) => updateMemberRole(member, event.target.value as Role)}><option>Administrador</option><option>Docente</option><option>Psicólogo/Orientador</option></select></div>)}</div>
            </section>
          </div>
        )}
        {view === "reports" && (
          <div className="reports-layout">
            <section className="panel card-panel report-hero">
              <p className="panel-kicker">Centro de reportes</p>
              <h2>Reportes listos para comité.</h2>
              <p className="section-text">
                Exporta el directorio general o imprime la ficha del estudiante
                seleccionado.
              </p>
              <div className="report-actions">
                <button className="button-primary" onClick={exportCsv}>
                  ↓ Exportar CSV
                </button>
                <button
                  className="button-secondary"
                  onClick={() => exportPdf()}
                >
                  ▤ Exportar PDF
                </button>
              </div>
            </section>
            <section className="panel card-panel report-list">
              <h2>Reportes disponibles</h2>
              <div className="report-item">
                <span className="report-icon green">▥</span>
                <div>
                  <strong>Reporte general</strong>
                  <small>Todos los estudiantes y estados</small>
                </div>
                <button
                  className="icon-button"
                  onClick={exportCsv}
                  aria-label="Descargar reporte general"
                >
                  ↓
                </button>
              </div>
              <div className="report-item">
                <span className="report-icon orange">◷</span>
                <div>
                  <strong>Reporte por estudiante</strong>
                  <small>Selecciona un perfil desde el directorio</small>
                </div>
                <button
                  className="icon-button"
                  onClick={() => exportPdf(selected)}
                  aria-label="Imprimir perfil"
                >
                  ↓
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
