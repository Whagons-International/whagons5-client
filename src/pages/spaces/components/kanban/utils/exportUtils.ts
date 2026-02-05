import type { Task, Status } from '@/store/types';
import ExcelJS from 'exceljs';

export async function exportToExcel(
  tasks: Task[],
  statuses: Status[],
  filename: string
) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tasks');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Due Date', key: 'dueDate', width: 15 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Updated At', key: 'updatedAt', width: 20 },
  ];

  // Add data rows
  tasks.forEach((task) => {
    const status = statuses.find((s) => s.id === task.status_id);
    worksheet.addRow({
      id: task.id,
      name: task.name,
      description: task.description || '',
      status: status?.name || '',
      dueDate: task.due_date || '',
      startDate: task.start_date || '',
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToPNG(element: HTMLElement, filename: string) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Failed to export to PNG:', error);
    throw error;
  }
}

export async function exportToPDF(element: HTMLElement, filename: string) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to export to PDF:', error);
    throw error;
  }
}
