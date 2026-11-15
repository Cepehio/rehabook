/** Lietuviškų raidžių PDF su įterptu šriftu ir teksto tęsiniu kituose puslapiuose. */
import { clinicNow } from '../../shared/booking.js';

let fontPromise;
async function loadFont() {
  if (!fontPromise) {
    fontPromise = fetch(new URL('../assets/fonts/DejaVuSans.ttf', import.meta.url))
      .then((response) => {
        if (!response.ok) throw new Error('Nepavyko įkelti PDF šrifto.');
        return response.arrayBuffer();
      })
      .then((buffer) => new Uint8Array(buffer))
      .catch((error) => {
        fontPromise = undefined;
        throw error;
      });
  }
  return fontPromise;
}
function base64(bytes) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}

/** Kuria dokumentą atskirai nuo atsisiuntimo, kad būtų galima patikrinti jo turinį. */
export async function buildVisitPdf(visit, specialistName, fontBytes) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ compress: true });
  doc.addFileToVFS('DejaVuSans.ttf', base64(fontBytes));
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.setFont('DejaVu', 'normal');
  let y = 22;
  const page = () => {
    doc.addPage();
    y = 22;
  };
  const text = (value, size = 11, color = [44, 44, 44]) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(String(value ?? '—'), 170)) {
      if (y > 272) page();
      doc.text(line, 20, y);
      y += size * 0.48;
    }
  };
  text('RehaBook', 24, [122, 139, 111]);
  y += 3;
  text('Vizito santrauka', 14);
  text('Sugeneruota: ' + clinicNow().date, 9);
  y += 10;
  const row = (label, value) => {
    if (y > 255) page();
    text(label, 10, [93, 103, 84]);
    y += 1;
    text(value || '—');
    y += 6;
  };
  row('Vizito numeris', visit.id);
  row('Data ir laikas', visit.date + ' ' + visit.time + ' (Lietuvos laiku)');
  row('Specialistas', specialistName);
  row('Paslauga', visit.service);
  row('Trukmė', (visit.duration || 60) + ' min.');
  row('Būsena', visit.status);
  row('Diagnozė', visit.diagnosis);
  row('Procedūros', visit.procedures);
  row('Rekomendacijos', visit.recommendations);
  if (visit.nextVisit) row('Kito vizito rekomendacija', visit.nextVisit);
  row('Kaina', Number(visit.price || 0).toFixed(2) + ' EUR');
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(i + ' / ' + total, 190, 286, { align: 'right' });
  }
  return doc;
}

export async function generateVisitPdf(visit, specialistName) {
  const doc = await buildVisitPdf(visit, specialistName, await loadFont());
  doc.save('rehabook-vizitas-' + visit.id + '.pdf');
}
