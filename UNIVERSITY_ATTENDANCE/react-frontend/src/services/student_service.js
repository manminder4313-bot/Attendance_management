import { fetchApi } from './base_api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import attendanceService from './attendance_service';

export const studentService = {
  getAll: () => fetchApi('/students'),
  create: (data) => fetchApi('/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  generateIndividualPDF: async (student, attendanceRecords) => {
    const doc = new jsPDF();
    const stats = attendanceService.getStats(attendanceRecords, student.id);
    
    const headerImg = await new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1600, 360);
      const logoImg = new Image();
      logoImg.src = '/IMAGES/logo.webp';
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 40, 40, 280, 280);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8a2c20';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText('ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ', 360, 100);
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Maharaja Ranjit Singh Punjab Technical University, BATHINDA', 360, 160);
        ctx.fillStyle = '#555';
        ctx.font = 'italic 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText('(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015', 360, 200);
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`DETAILED ATTENDANCE REPORT`, 360, 310);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 55);
    
    doc.setFillColor(248, 249, 250);
    doc.rect(15, 60, 180, 25, 'F');
    doc.setFontSize(12);
    doc.setFont("Helvetica", "bold");
    doc.text(student.fullName || student.name, 20, 70);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Roll No: ${student.enrollmentNumber || student.rollNo} | Course: ${student.course} | Sem: ${student.semester}`, 20, 78);
    
    doc.text(`Total Sessions: ${stats.totalCount}`, 20, 95);
    doc.setTextColor(39, 174, 96);
    doc.text(`Present: ${stats.presentCount}`, 70, 95);
    doc.setTextColor(231, 76, 60);
    doc.text(`Absent: ${stats.absentCount}`, 120, 95);
    doc.setTextColor(138, 44, 32);
    doc.text(`Overall Attendance: ${stats.percentage}%`, 160, 95);

    const historyData = stats.records.sort((a,b) => b.id - a.id).map(r => [
      r.dateDisplay,
      r.subject,
      r.teacherName,
      r.attendance[student.id],
      r.session || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Date', 'Subject', 'Teacher', 'Status', 'Session']],
      body: historyData,
      startY: 105,
      theme: 'striped',
      headStyles: { fillColor: [138, 44, 32] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [39, 174, 96];
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [231, 76, 60];
        }
      }
    });

    doc.save(`attendance_report_${(student.fullName || student.name).replace(/\s+/g, '_')}.pdf`);
  }
};

export default studentService;
