'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * ส่งออกองค์ประกอบ HTML เป็น PDF โดยจัดการฟอนต์ภาษาไทยและจัดระยะหน้ากระดาษ A4
 */
export async function exportElementToPdf(element: HTMLElement, filename: string) {
  // บันทึก style เดิม
  const originalDisplay = element.style.display;
  const originalPosition = element.style.position;
  const originalVisibility = element.style.visibility;

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // ความละเอียดสูงคมชัด 2x
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // กำหนดระยะขอบ (Margin) 10mm ซ้ายขวา
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // หน้าแรก
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - margin * 2);

    // หน้าถัดไปกรณีเนื้อหายาวเกิน 1 หน้า
    while (heightLeft > 0) {
      position = position - (pdfHeight - margin * 2);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - margin * 2);
    }

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } finally {
    element.style.display = originalDisplay;
    element.style.position = originalPosition;
    element.style.visibility = originalVisibility;
  }
}
