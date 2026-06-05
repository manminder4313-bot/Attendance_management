import { fetchApi } from './base_api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const attendanceService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/attendance${query ? `?${query}` : ''}`);
  },
  create: (data) => fetchApi('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/attendance/${id}`, { method: 'DELETE' }),
  
  getStats: (attendanceRecords, studentId) => {
    const studentRecords = attendanceRecords.filter(r => r.attendance?.[studentId]);
    const presentCount = studentRecords.filter(r => r.attendance?.[studentId] === 'Present').length;
    const absentCount = studentRecords.filter(r => r.attendance?.[studentId] === 'Absent').length;
    const totalCount = studentRecords.length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    return { presentCount, absentCount, totalCount, percentage, records: studentRecords };
  },

  generateClassPDF: async (students, records, course, semester) => {
    const doc = new jsPDF();
    
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
        ctx.fillText(`CLASS ATTENDANCE REPORT`, 360, 310);
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
    doc.text(`Course: ${course}`, 20, 70);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const displaySemester = semester === 'Odd Semester' ? 'Odd Semester (1, 3, 5, 7, 9)' : (semester === 'Even Semester' ? 'Even Semester (2, 4, 6, 8, 10)' : semester);
    doc.text(`Semester: ${displaySemester} | Subject: ${course.split(' - ')[1] || 'All Subjects'} | Total Sessions: ${records.length}`, 20, 78);
    
    const tableData = students.map(student => {
      const studentRecords = records.filter(r => r.attendance?.[student.id]);
      const presentCount = studentRecords.filter(r => r.attendance?.[student.id] === 'Present').length;
      const totalCount = studentRecords.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      return [
        student.fullName || student.name,
        student.enrollmentNumber || student.rollNo,
        `${presentCount} / ${totalCount}`,
        `${percentage}%`
      ];
    });

    tableData.sort((a, b) => (a[1] || '').localeCompare(b[1] || ''));

    autoTable(doc, {
      head: [['Student Name', 'Roll No', 'Present / Total', 'Attendance %']],
      body: tableData,
      startY: 95,
      theme: 'grid',
      headStyles: { fillColor: [138, 44, 32] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const percentage = parseInt(data.cell.raw);
          if (percentage >= 75) data.cell.styles.textColor = [39, 174, 96];
          else data.cell.styles.textColor = [231, 76, 60];
        }
      }
    });

    doc.save(`class_attendance_${course.replace(/\s+/g, '_')}_${semester.replace(/\s+/g, '_')}.pdf`);
  }
};

export default attendanceService;
