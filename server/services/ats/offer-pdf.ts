import PDFDocument from 'pdfkit';

export type OfferPDFInput = {
  candidateName: string;
  jobTitle: string;
  orgName: string;
  salary?: { amount: number; currency: string };
  startDate?: string;
  benefits?: string[];
  notes?: string;
};

export async function generateOfferLetterPDF(input: OfferPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).fillColor('#0061A8').text(`${input.orgName} – Offer Letter`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).fillColor('black');
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Dear ${input.candidateName},`);
    doc.moveDown();
    doc.text(`We are pleased to offer you the position of ${input.jobTitle} at ${input.orgName}.`);

    if (input.salary) {
      doc.moveDown();
      doc.text(`Compensation: ${input.salary.amount.toLocaleString(undefined, { style: 'currency', currency: input.salary.currency })}`);
    }

    if (input.startDate) {
      doc.moveDown();
      doc.text(`Proposed Start Date: ${input.startDate}`);
    }

    if (input.benefits?.length) {
      doc.moveDown().text('Benefits:', { underline: true });
      input.benefits.forEach((benefit) => doc.text(`• ${benefit}`));
    }

    if (input.notes) {
      doc.moveDown().text(input.notes);
    }

    doc.moveDown(2);
    doc.text('Sincerely,');
    doc.text(input.orgName);

    doc.end();
  });
}
