import jsPDF from 'jspdf'

type ReportStudent = {
  name: string
  document: string
  birthDate: string
  age: number
  course: string
  address: string
  guardian: string
  phone: string
  disability: string
  diagnosis: string
  observations: string
  status: string
  registeredAt: string
  followUps: { date: string; progress: string; difficulties: string; recommendations: string }[]
  adjustments: { adaptations: string; strategies: string; supports: string; appliedFollowUp: string }
}

const cleanFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')

export function downloadStudentPdf(students: ReportStudent[], student?: ReportStudent) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 18
  let y = 20

  const footer = () => {
    pdf.setDrawColor(220, 230, 222)
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)
    pdf.setFontSize(8)
    pdf.setTextColor(120, 130, 123)
    pdf.text('ITI Inclusión | Documento institucional confidencial', margin, pageHeight - 8)
    pdf.text(`Página ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }
  const page = () => { if (y > pageHeight - 42) { footer(); pdf.addPage(); y = 20; header() } }
  const header = () => {
    pdf.setFillColor(23, 107, 76)
    pdf.rect(0, 0, pageWidth, 13, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(255, 255, 255)
    pdf.text('INSTITUTO TÉCNICO INDUSTRIAL  /  ÁREA DE INCLUSIÓN', margin, 8)
  }
  const section = (title: string) => { page(); pdf.setFillColor(231, 242, 233); pdf.roundedRect(margin, y - 5, pageWidth - margin * 2, 9, 2, 2, 'F'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(23, 107, 76); pdf.text(title, margin + 4, y + 1); y += 14 }
  const text = (value: string, size = 9, bold = false) => { page(); pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(35, 45, 39); const lines = pdf.splitTextToSize(value || 'No registrado', pageWidth - margin * 2); pdf.text(lines, margin, y); y += lines.length * 4.4 + 4 }
  const pair = (label: string, value: string) => { page(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(112, 125, 115); pdf.text(label.toUpperCase(), margin, y); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(35, 45, 39); pdf.text(value || 'No registrado', margin, y + 5); y += 14 }

  header()
  pdf.setTextColor(23, 107, 76)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text(student ? 'Reporte individual' : 'Reporte general', margin, y + 6)
  y += 16
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(112, 125, 115)
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, margin, y); y += 13

  if (!student) {
    section('RESUMEN INSTITUCIONAL')
    pair('Total de estudiantes', String(students.length));
    pair('En seguimiento', String(students.filter((item) => item.status === 'En seguimiento').length));
    section('DIRECTORIO')
    students.forEach((item, index) => { text(`${index + 1}. ${item.name}`, 10, true); text(`Documento: ${item.document}   |   Curso: ${item.course}   |   Discapacidad: ${item.disability}   |   Estado: ${item.status}`, 8); })
    footer(); pdf.save('reporte-general-estudiantes.pdf'); return
  }

  text(student.name, 15, true)
  text(`${student.status}  ·  Curso ${student.course}  ·  Registrado ${student.registeredAt}`, 9)
  section('DATOS DEL ESTUDIANTE')
  pair('Documento de identidad', student.document); pair('Fecha de nacimiento / edad', `${student.birthDate} / ${student.age} años`); pair('Dirección', student.address); pair('Acudiente / teléfono', `${student.guardian} / ${student.phone}`); pair('Discapacidad', student.disability); pair('Diagnóstico clínico', student.diagnosis); pair('Observaciones', student.observations)
  section('AJUSTES RAZONABLES')
  pair('Adaptaciones educativas', student.adjustments.adaptations); pair('Estrategias pedagógicas', student.adjustments.strategies); pair('Apoyos requeridos', student.adjustments.supports); pair('Seguimiento aplicado', student.adjustments.appliedFollowUp)
  section('HISTORIAL DE SEGUIMIENTO')
  student.followUps.forEach((item) => { text(item.date, 9, true); text(`Avances académicos: ${item.progress}`); text(`Dificultades: ${item.difficulties}`); text(`Recomendaciones: ${item.recommendations}`) })
  footer(); pdf.save(`reporte-${cleanFileName(student.name)}.pdf`)
}
