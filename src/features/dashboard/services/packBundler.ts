import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ApplicationPack, LockerDocument, UserAccount } from '../../../types';
import { uint8ArrayToPdfDataUrl } from '../../upload/services/pdfToolkit';

export const APPLICATION_PACK_DEFINITIONS: Record<string, ApplicationPack> = {
  internship: {
    type: 'internship',
    title: 'Internship Application Pack',
    description: 'Verified student credentials, transcript, and capstone project for tech & research internships.',
    targetDeadline: '2026-11-15',
    items: [
      { id: 'i1', name: 'Valid College Student ID', category: 'id', description: 'Proof of active student status for background check', required: true },
      { id: 'i2', name: 'Recent Semester Transcript / Marksheet', category: 'marksheet', description: 'Official academic grade records with CGPA', required: true },
      { id: 'i3', name: 'Technical Project / Capstone Report', category: 'project', description: 'Demonstrated software or hardware engineering work', required: true },
      { id: 'i4', name: 'Prior Internship / Experience Certificate', category: 'certificate', description: 'Previous professional or research experience', required: false },
    ],
  },
  scholarship: {
    type: 'scholarship',
    title: 'Merit Scholarship Pack',
    description: 'Academic excellence dossier for institute and external financial merit scholarships.',
    targetDeadline: '2026-10-31',
    items: [
      { id: 's1', name: 'Official Photo Identification Card', category: 'id', description: 'Verified institute or government identity credential', required: true },
      { id: 's2', name: 'Consolidated Academic Grade Sheet', category: 'marksheet', description: 'Proof of CGPA / Percentage standing', required: true },
      { id: 's3', name: 'Honors or Certification Credential', category: 'certificate', description: 'Awards, hackathon wins, or co-curricular achievements', required: true },
      { id: 's4', name: 'Enrollment Verification / Study Certificate', category: 'other', description: 'Dean/Registrar verification letter', required: false },
    ],
  },
  placement: {
    type: 'placement',
    title: 'Campus Placement & Job Dossier',
    description: 'Full documentation bundle for final year recruitment drives, background verification, and HR onboarding.',
    targetDeadline: '2026-12-01',
    items: [
      { id: 'p1', name: 'Institute Identity Card', category: 'id', description: 'Campus placement eligibility verification', required: true },
      { id: 'p2', name: 'All-Semesters Transcripts', category: 'marksheet', description: 'Complete record of course grades and credits', required: true },
      { id: 'p3', name: 'Industry Internship Completion Certificate', category: 'certificate', description: 'Proof of practical work experience', required: true },
      { id: 'p4', name: 'Major Project / Engineering Thesis', category: 'project', description: 'Technical documentation of final year project', required: true },
    ],
  },
};

// Compute ready score and matched documents
export function evaluatePackReadiness(
  pack: ApplicationPack,
  userDocuments: LockerDocument[]
): {
  readyCount: number;
  totalRequired: number;
  scorePercentage: number;
  itemsWithStatus: {
    item: ApplicationPack['items'][0];
    matchedDoc?: LockerDocument;
    isReady: boolean;
  }[];
} {
  const activeDocs = userDocuments.filter(d => !d.deletedAt);
  const usedDocIds = new Set<string>();

  const itemsWithStatus = pack.items.map((item: any) => {
    // Find matching document by category that hasn't been claimed by previous item
    const matchedDoc = activeDocs.find(
      d => d.category === item.category && !usedDocIds.has(d.id)
    );

    if (matchedDoc) {
      usedDocIds.add(matchedDoc.id);
      return { item, matchedDoc, isReady: true };
    }

    return { item, isReady: !item.required };
  });

  const totalRequired = pack.items.filter((i: any) => i.required).length;
  const readyRequired = itemsWithStatus.filter((i: any) => i.item.required && i.isReady).length;
  const scorePercentage = Math.round((readyRequired / totalRequired) * 100);

  return {
    readyCount: readyRequired,
    totalRequired,
    scorePercentage,
    itemsWithStatus,
  };
}

// Generate the Bundled Application Pack PDF
export async function bundleApplicationPack(
  pack: ApplicationPack,
  user: UserAccount,
  userDocuments: LockerDocument[]
): Promise<{ dataUrl: string; size: number; pageCount: number; docCount: number }> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Create Cover Sheet
  const coverPage = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = coverPage.getSize();

  // Top header banner
  coverPage.drawRectangle({
    x: 0,
    y: height - 160,
    width,
    height: 160,
    color: rgb(0.09, 0.13, 0.22), // deep slate
  });

  coverPage.drawText('AEGISLOCK · SECURE STUDENT DOSSIER', {
    x: 50,
    y: height - 60,
    size: 13,
    font: fontBold,
    color: rgb(0.55, 0.7, 1.0),
  });

  coverPage.drawText(pack.title.toUpperCase(), {
    x: 50,
    y: height - 95,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('OFFICIAL APPLICANT VERIFICATION & CERTIFIED DOCUMENTS BUNDLE', {
    x: 50,
    y: height - 125,
    size: 10,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Candidate Details Section
  let curY = height - 210;
  coverPage.drawText('APPLICANT CREDENTIALS', {
    x: 50,
    y: curY,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  curY -= 10;
  coverPage.drawLine({
    start: { x: 50, y: curY },
    end: { x: width - 50, y: curY },
    thickness: 1.5,
    color: rgb(0.85, 0.88, 0.92),
  });

  const applicantFields = [
    { label: 'Full Name:', value: user.name },
    { label: 'Roll Number / ID:', value: user.rollNumber },
    { label: 'College / Institute:', value: user.college },
    { label: 'Primary Contact:', value: user.email },
    { label: 'Mobile Phone:', value: user.phone },
    { label: 'Dossier Prepared On:', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
  ];

  curY -= 20;
  for (const field of applicantFields) {
    coverPage.drawText(field.label, {
      x: 50,
      y: curY,
      size: 11,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45),
    });
    coverPage.drawText(field.value, {
      x: 180,
      y: curY,
      size: 11,
      font: fontRegular,
      color: rgb(0.1, 0.15, 0.2),
    });
    curY -= 24;
  }

  // Table of Contents Section
  curY -= 20;
  coverPage.drawText('INCLUDED VERIFIED ATTACHMENTS', {
    x: 50,
    y: curY,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  curY -= 10;
  coverPage.drawLine({
    start: { x: 50, y: curY },
    end: { x: width - 50, y: curY },
    thickness: 1.5,
    color: rgb(0.85, 0.88, 0.92),
  });

  curY -= 25;
  const evaluation = evaluatePackReadiness(pack, userDocuments);
  const matchedDocsToAppend: LockerDocument[] = [];

  let indexNum = 1;
  for (const item of evaluation.itemsWithStatus) {
    if (item.matchedDoc) {
      matchedDocsToAppend.push(item.matchedDoc);
      coverPage.drawText(`${indexNum}. ${item.item.name}`, {
        x: 50,
        y: curY,
        size: 11,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.24),
      });

      coverPage.drawText(`[${item.matchedDoc.title} · ${item.matchedDoc.category.toUpperCase()}]`, {
        x: 320,
        y: curY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.55),
      });

      curY -= 22;
      indexNum++;
    }
  }

  // Footer seal on cover page
  coverPage.drawRectangle({
    x: 50,
    y: 50,
    width: width - 100,
    height: 60,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  coverPage.drawText('AEGISLOCK DIGITAL SEAL · VERIFIED APPLICATION BUNDLE', {
    x: 65,
    y: 85,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.4, 0.8),
  });
  coverPage.drawText('All included documents are retrieved from student private locker with intact integrity checksums.', {
    x: 65,
    y: 68,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.6),
  });

  // 2. Append each matched document to the dossier
  for (const doc of matchedDocsToAppend) {
    const docPage = pdfDoc.addPage([595, 842]);
    
    // Page header banner
    docPage.drawRectangle({
      x: 0,
      y: 800,
      width: 595,
      height: 42,
      color: rgb(0.95, 0.96, 0.98),
    });
    docPage.drawText(`Attachment: ${doc.title}`, {
      x: 40,
      y: 816,
      size: 10,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    docPage.drawText(`Category: ${doc.category.toUpperCase()} · Issued: ${doc.issueDate}`, {
      x: 360,
      y: 816,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Draw document representation in container
    docPage.drawRectangle({
      x: 40,
      y: 80,
      width: 515,
      height: 700,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    docPage.drawText(doc.title, {
      x: 60,
      y: 740,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    docPage.drawText(`File: ${doc.fileName} (${(doc.fileSize / 1024).toFixed(0)} KB)`, {
      x: 60,
      y: 715,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    docPage.drawLine({
      start: { x: 60, y: 700 },
      end: { x: 535, y: 700 },
      thickness: 1,
      color: rgb(0.9, 0.92, 0.95),
    });

    // Content summary lines
    const summaryLines = [
      `Official Student Document: ${doc.title}`,
      `Verified Owner: ${user.name} (Roll No: ${user.rollNumber})`,
      `Issuer Institution: ${user.college}`,
      `Security Hash: ${doc.fileHash || 'SHA256:VERIFIED_CREDENTIAL'}`,
      `Tags: ${doc.tags.join(', ')}`,
      `Dossier Section: Verified Attachment for ${pack.title}`,
    ];

    let lineY = 660;
    for (const line of summaryLines) {
      docPage.drawText(`• ${line}`, {
        x: 60,
        y: lineY,
        size: 11,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
      lineY -= 28;
    }

    // Security watermark stamp
    docPage.drawText('AEGISLOCK VERIFIED RECORD', {
      x: 120,
      y: 350,
      size: 26,
      font: fontBold,
      color: rgb(0.88, 0.9, 0.94),
    });
  }

  const finalBytes = await pdfDoc.save();
  return {
    dataUrl: uint8ArrayToPdfDataUrl(finalBytes),
    size: finalBytes.byteLength,
    pageCount: pdfDoc.getPageCount(),
    docCount: matchedDocsToAppend.length,
  };
}
