import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

type Student = {
  id: number
  name: string
  age: number
  diagnosis: string
  needs: string
  followUp: string
}

const initialStudents: Student[] = [
  {
    id: 1,
    name: 'Ana Morales',
    age: 8,
    diagnosis: 'Trastorno del espectro autista',
    needs: 'Tiempo adicional para tareas y apoyo visual',
    followUp: 'Seguimiento semanal con docente de apoyo',
  },
  {
    id: 2,
    name: 'Luis Paredes',
    age: 10,
    diagnosis: 'Discapacidad auditiva',
    needs: 'Interpretación de lengua de señas y materiales impresos',
    followUp: 'Revisión mensual de adaptación curricular',
  },
]

function App() {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [form, setForm] = useState({
    name: '',
    age: '',
    diagnosis: '',
    needs: '',
    followUp: '',
  })

  const connectionStatus = useMemo(() => {
    if (!supabase) {
      return 'Configura tus variables de Supabase para persistir datos'
    }

    return 'Conexión lista para Supabase'
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const newStudent: Student = {
      id: Date.now(),
      name: form.name,
      age: Number(form.age),
      diagnosis: form.diagnosis,
      needs: form.needs,
      followUp: form.followUp,
    }

    setStudents([newStudent, ...students])
    setForm({ name: '', age: '', diagnosis: '', needs: '', followUp: '' })
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Instituto Técnico Industrial</p>
          <h1>Gestión digital para estudiantes con discapacidad</h1>
          <p className="lead">
            Plataforma institucional para registrar, acompañar y dar seguimiento a los estudiantes que requieren ajustes educativos y apoyo especializado.
          </p>
        </div>
        <div className="hero-meta">
          <span className="institution-tag">ITI</span>
          <span className="status-pill">{connectionStatus}</span>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel card-panel">
          <div className="section-header">
            <div>
              <h2>Registrar estudiante</h2>
              <p className="section-text">Guarda la información educativa y las adaptaciones necesarias con rapidez.</p>
            </div>
            <span className="mini-badge">Nuevo registro</span>
          </div>

          <form onSubmit={handleSubmit} className="student-form">
            <div className="field-row">
              <label className="field-label" htmlFor="student-name">Nombre completo</label>
              <input
                id="student-name"
                className="field-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ej. María Gómez"
                required
              />
            </div>

            <div className="field-row small-row">
              <label className="field-label" htmlFor="student-age">Edad</label>
              <input
                id="student-age"
                type="number"
                className="field-input"
                value={form.age}
                onChange={(event) => setForm({ ...form, age: event.target.value })}
                placeholder="10"
                required
              />
            </div>

            <div className="field-row">
              <label className="field-label" htmlFor="student-diagnosis">Diagnóstico</label>
              <input
                id="student-diagnosis"
                className="field-input"
                value={form.diagnosis}
                onChange={(event) => setForm({ ...form, diagnosis: event.target.value })}
                placeholder="Discapacidad auditiva"
                required
              />
            </div>

            <div className="field-row">
              <label className="field-label" htmlFor="student-needs">Ajustes necesarios</label>
              <textarea
                id="student-needs"
                className="field-textarea"
                rows={3}
                value={form.needs}
                onChange={(event) => setForm({ ...form, needs: event.target.value })}
                placeholder="Tiempo adicional, materiales adaptados..."
                required
              />
            </div>

            <div className="field-row">
              <label className="field-label" htmlFor="student-followup">Seguimiento</label>
              <textarea
                id="student-followup"
                className="field-textarea"
                rows={2}
                value={form.followUp}
                onChange={(event) => setForm({ ...form, followUp: event.target.value })}
                placeholder="Revisión mensual, reuniones, etc."
                required
              />
            </div>

            <button className="button-primary" type="submit">Guardar estudiante</button>
          </form>
        </section>

        <section className="panel card-panel">
          <div className="section-header">
            <div>
              <h2>Estudiantes registrados</h2>
              <p className="section-text">Consulta los diagnósticos y los ajustes pedagógicos desde un solo lugar.</p>
            </div>
            <span className="stat-pill">{students.length} activos</span>
          </div>

          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Diagnóstico</th>
                  <th>Ajustes</th>
                  <th>Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.age}</td>
                    <td>{student.diagnosis}</td>
                    <td>{student.needs}</td>
                    <td>{student.followUp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
