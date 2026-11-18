export type ResumeValues = Partial<Record<string, string>>;
export interface StoredResume { name: string; type: string; size: number; dataUrl: string; updatedAt: string; }
export const RESUME_STORAGE_KEY = 'jobfill.resume';

export async function fileToDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }

function clean(value: string): string { return value.replace(/\s+/g, ' ').trim(); }

function pdfText(bytes: ArrayBuffer): string {
  const source = new TextDecoder('latin1').decode(bytes);
  const chunks: string[] = [];
  for (const match of source.matchAll(/\(([^()]*)\)\s*Tj/g)) chunks.push(match[1].replace(/\\([\\()])/g, '$1'));
  for (const match of source.matchAll(/\[([^\]]+)\]\s*TJ/g)) chunks.push(...[...match[1].matchAll(/\(([^()]*)\)/g)].map((item) => item[1]));
  return chunks.join('\n');
}

export async function readResumeText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return pdfText(await file.arrayBuffer());
  return file.text();
}

export function extractResumeValues(text: string): ResumeValues {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const values: ResumeValues = {};
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const phone = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-])\d{3,4}[\s.-]\d{3,4}/)?.[0];
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
  if (email) values.email = email;
  if (phone && phone.replace(/\D/g, '').length >= 8) values.phone = clean(phone);
  if (linkedin) values.linkedin = linkedin.replace(/[.,;]+$/, '');
  const portfolio = urls.find((url) => !/linkedin\.com/i.test(url));
  if (portfolio) values.portfolio = portfolio.replace(/[.,;]+$/, '');
  const contactIndex = lines.findIndex((line) => /@/.test(line));
  const candidateName = lines.slice(0, Math.min(Math.max(contactIndex, 1), 8)).filter((line) => /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5 && !/resume|curriculum vitae|profile|contact|objective|summary|experience|education|skills/i.test(line)).sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)[0];
  if (candidateName) {
    values['full-name'] = candidateName;
    const nameParts = candidateName.split(/\s+/);
    if (nameParts.length > 1) { values['first-name'] = nameParts[0]; values['last-name'] = nameParts.slice(1).join(' '); }
  }
  const start = lines.findIndex((line) => /^(technical )?skills?$/i.test(line));
  if (start >= 0) { const skills = lines.slice(start + 1).filter((line) => !/^(experience|employment|education|projects|certifications|contact|work history)\b/i.test(line)).slice(0, 8).join(', '); if (skills) values.skills = skills; }
  return values;
}
