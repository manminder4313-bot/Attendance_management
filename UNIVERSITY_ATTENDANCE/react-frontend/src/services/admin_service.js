import { fetchApi } from './base_api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const adminService = {
  getAll: () => fetchApi('/admins'),
  create: (data) => fetchApi('/admins', { method: 'POST', body: JSON.stringify(data) }),
  login: (id, password) => fetchApi('/login', { 
    method: 'POST', 
    body: JSON.stringify({ id, password }) 
  }),
  update: (id, data) => fetchApi(`/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // PDF Generation for Lists
  generateListPDF: async (activeTab, data, withCreds) => {
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
        ctx.fillText(`${activeTab.toUpperCase()} REPORT`, 360, 310);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);

    let headers = [];
    let tableBody = [];

    if (activeTab === 'teachers') {
      headers = [['Name', 'Email', 'Subject', 'Experience', 'Department']];
      if (withCreds) headers[0].push('Username', 'Password');
      tableBody = data.map(t => {
        const row = [t.fullName || t.name, t.email, t.primarySubject || t.subject, t.experience, t.department];
        if (withCreds) row.push(t.username, t.password);
        return row;
      });
    } else if (activeTab === 'students') {
      headers = [['Name', 'Roll No', 'Email', 'Course', 'Semester']];
      if (withCreds) headers[0].push('Username', 'Password');
      tableBody = data.map(s => {
        const row = [s.fullName || s.name, s.enrollmentNumber || s.rollNo, s.email, s.course, s.semester];
        if (withCreds) row.push(s.username, s.password);
        return row;
      });
    } else if (activeTab === 'departments') {
      headers = [['Department', 'Head Name', 'Email', 'Phone']];
      if (withCreds) headers[0].push('Username', 'Password');
      tableBody = data.map(d => {
        const row = [d.department, d.headName, d.email, d.phone];
        if (withCreds) row.push(d.username, d.password);
        return row;
      });
    } else if (activeTab === 'admins') {
      headers = [['Name', 'Email', 'Phone', 'Role']];
      if (withCreds) headers[0].push('Username', 'Password');
      tableBody = data.map(a => {
        const row = [a.fullName || 'Admin', a.email, a.contact, a.id === 'admin' ? 'Master Admin' : 'Admin'];
        if (withCreds) row.push(a.id, a.password);
        return row;
      });
    }

    autoTable(doc, {
      head: headers,
      body: tableBody,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [138, 44, 32], textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`${activeTab}_list_${Date.now()}.pdf`);
  }
};

export default adminService;
