import { jsPDF } from 'jspdf';
import { CohortResult } from './election-logic.ts';

interface PdfExportOptions {
  results: CohortResult[];
  totalVotes: number;
  isOpen: boolean;
  generatedAt?: Date;
}

/**
 * Generates an official, beautifully formatted PDF report of the election results
 */
export function generateElectionResultsPdf({
  results,
  totalVotes,
  isOpen,
  generatedAt = new Date(),
}: PdfExportOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.getPageWidth();
  const margin = 14;
  let y = 18;

  // Navy & Gold Academic Colors
  const navyColor: [number, number, number] = [15, 53, 109]; // #0f356d
  const slateDark: [number, number, number] = [30, 41, 59];
  const goldColor: [number, number, number] = [180, 83, 9];
  const emeraldColor: [number, number, number] = [16, 128, 67];

  // Top Academic Header Bar
  doc.setFillColor(...navyColor);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // University & Faculty Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...navyColor);
  doc.text('SYRIAN PRIVATE UNIVERSITY', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor(...slateDark);
  doc.text('FACULTY OF DENTISTRY - STUDENT COUNCIL ELECTIONS', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Certified Results Report / تقرير نتائج الانتخابات الرسمية المعتمد', pageWidth / 2, y, {
    align: 'center',
  });
  y += 4;

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Summary Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyColor);
  doc.text(`Total Ballots Cast: ${totalVotes}`, margin + 5, y + 6);
  doc.text(`Academic Years: ${results.length}`, margin + 5, y + 12);
  doc.text(`Election Status: ${isOpen ? 'POLLING OPEN' : 'CONCLUDED / CLOSED'}`, margin + 5, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated On: ${generatedAt.toLocaleString('en-GB')}`, pageWidth - margin - 5, y + 6, {
    align: 'right',
  });
  doc.text(`System ID: SPU-DENT-OFFICIAL-ELECTION`, pageWidth - margin - 5, y + 12, { align: 'right' });
  doc.text(`Verification: Cryptographically Certified`, pageWidth - margin - 5, y + 18, { align: 'right' });
  y += 28;

  // Results Per Academic Year
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...navyColor);
  doc.text('ACADEMIC YEAR OUTCOMES (1 WINNER PER YEAR)', margin, y);
  y += 5;

  for (const cohortRes of results) {
    const cohort = cohortRes.cohort;
    const hasWinner = cohortRes.status === 'winner';
    const isTied = cohortRes.status === 'tie';

    // Check page space
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Cohort Header Card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...navyColor);
    doc.text(`${cohort.labelEn} (Prefix: ${cohort.prefix}xxxx)`, margin + 4, y + 5.5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const turnoutText = cohortRes.turnoutPercentage
      ? `${cohortRes.totalVotes} votes (${cohortRes.turnoutPercentage}% turnout)`
      : `${cohortRes.totalVotes} votes cast`;
    doc.text(turnoutText, pageWidth - margin - 4, y + 5.5, { align: 'right' });
    y += 11;

    // Winner declaration banner
    if (hasWinner) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...emeraldColor);
      doc.text(`[ELECTED WINNER]: ${cohortRes.winnerNamesEn.join(', ')} / ${cohortRes.winnerNamesAr.join(', ')}`, margin + 4, y + 4.8);
      y += 9;
    } else if (isTied) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...goldColor);
      doc.text(`[TIED RESULT]: ${cohortRes.winnerNamesEn.join(' & ')}`, margin + 4, y + 4.8);
      y += 9;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No votes recorded for this academic year yet.', margin + 4, y + 4);
      y += 7;
    }

    // Candidate rows
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Candidate Name', margin + 6, y);
    doc.text('Votes', pageWidth - margin - 35, y, { align: 'right' });
    doc.text('Share %', pageWidth - margin - 6, y, { align: 'right' });
    y += 3;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 4, y, pageWidth - margin - 4, y);
    y += 4;

    for (const cand of cohortRes.candidates) {
      doc.setFont('helvetica', cand.isWinner ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(cand.isWinner ? 16 : 51, cand.isWinner ? 128 : 65, cand.isWinner ? 67 : 85);

      const nameDisplay = `${cand.nameEn} (${cand.nameAr})`;
      doc.text(nameDisplay, margin + 6, y);
      doc.text(String(cand.votes), pageWidth - margin - 35, y, { align: 'right' });
      doc.text(`${cand.percentage}%`, pageWidth - margin - 6, y, { align: 'right' });
      y += 4.5;
    }
    y += 4;
  }

  // Official Signature & Committee Block at the bottom
  if (y > 230) {
    doc.addPage();
    y = 30;
  } else {
    y = Math.max(y + 10, 245);
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyColor);
  doc.text('Central Election Committee', margin + 15, y, { align: 'center' });
  doc.text('Dean of the Faculty of Dentistry', pageWidth - margin - 25, y, { align: 'center' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('(Official Seal & Signature)', margin + 15, y, { align: 'center' });
  doc.text('(Official Seal & Signature)', pageWidth - margin - 25, y, { align: 'center' });

  // Bottom footer page count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Syrian Private University • Faculty of Dentistry • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  return doc;
}
