import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";
import type { SchedulerEvent, SchedulerResource } from "../types/scheduler";

export async function exportToPDF(
  element: HTMLElement,
  filename: string = "scheduler.pdf"
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("landscape", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgScaledWidth = imgWidth * ratio;
  const imgScaledHeight = imgHeight * ratio;
  const xOffset = (pdfWidth - imgScaledWidth) / 2;
  const yOffset = (pdfHeight - imgScaledHeight) / 2;

  pdf.addImage(imgData, "PNG", xOffset, yOffset, imgScaledWidth, imgScaledHeight);
  pdf.save(filename);
}

export async function exportToPNG(
  element: HTMLElement,
  filename: string = "scheduler.png"
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportToExcel(
  events: SchedulerEvent[],
  resources: SchedulerResource[],
  filename: string = "scheduler.xlsx"
): Promise<void> {
  // Create resource map for lookup
  const resourceMap = new Map(resources.map((r) => [r.id, r]));

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Schedule");

  // Define columns
  worksheet.columns = [
    { header: "Task Name", key: "taskName", width: 30 },
    { header: "Resource", key: "resource", width: 25 },
    { header: "Team", key: "team", width: 20 },
    { header: "Start Date", key: "startDate", width: 20 },
    { header: "End Date", key: "endDate", width: 20 },
    { header: "Duration (hours)", key: "duration", width: 15 },
  ];

  // Add data rows
  events.forEach((event) => {
    const resource = resourceMap.get(event.resourceId);
    worksheet.addRow({
      taskName: event.name,
      resource: resource?.name || `User ${event.resourceId}`,
      team: resource?.teamName || "",
      startDate: event.startDate.toLocaleString(),
      endDate: event.endDate.toLocaleString(),
      duration: (
        (event.endDate.getTime() - event.startDate.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2),
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
