import type { MatchResult, Profile, ProfileField } from './types';

const STOP_WORDS = new Set(['the', 'your', 'and', 'for', 'of', 'a', 'an', 'please', 'enter', 'field', 'yang', 'anda']);
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string) => normalize(value).split(' ').filter((token) => token && !STOP_WORDS.has(token));

const BILINGUAL_GROUPS = [
  ['full name', 'name', 'nama lengkap', 'nama'], ['first name', 'given name', 'nama depan'], ['last name', 'surname', 'family name', 'nama belakang', 'nama keluarga'],
  ['email', 'email address', 'alamat email', 'surel'], ['phone', 'phone number', 'mobile', 'telephone', 'nomor telepon', 'no hp', 'telepon', 'ponsel'],
  ['address', 'home address', 'alamat', 'alamat rumah'], ['city', 'town', 'kota'], ['state', 'province', 'region', 'provinsi', 'negara bagian'],
  ['postal code', 'zip code', 'postcode', 'kode pos'], ['country', 'negara'], ['linkedin', 'linkedin url', 'profil linkedin'], ['portfolio', 'website', 'personal website', 'situs web', 'portofolio'],
  ['resume', 'cv', 'curriculum vitae', 'daftar riwayat hidup'], ['cover letter', 'surat lamaran'], ['education', 'degree', 'school', 'university', 'pendidikan', 'gelar', 'sekolah', 'universitas'],
  ['field of study', 'major', 'study program', 'jurusan', 'program studi'], ['employer', 'company', 'perusahaan', 'nama perusahaan'], ['job title', 'position', 'role', 'jabatan', 'posisi'],
  ['work experience', 'employment history', 'pengalaman kerja', 'riwayat pekerjaan'], ['skills', 'technical skills', 'keahlian', 'keterampilan', 'keahlian teknis'],
  ['salary', 'salary expectation', 'expected salary', 'gaji', 'gaji yang diharapkan', 'ekspektasi gaji'], ['availability', 'start date', 'available from', 'ketersediaan', 'tanggal mulai'],
  ['work authorization', 'visa sponsorship', 'izin kerja', 'sponsor visa'], ['gender', 'jenis kelamin'], ['date of birth', 'birthday', 'tanggal lahir'], ['nationality', 'citizenship', 'kewarganegaraan']
];

function getText(element: Element): string {
  const input = element as HTMLInputElement;
  const chunks = [input.name, input.id, input.placeholder, input.autocomplete, input.getAttribute('aria-label') ?? ''];
  if (input.id) { const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent; if (label) chunks.push(label); }
  const parentLabel = input.closest('label')?.textContent;
  if (parentLabel) chunks.push(parentLabel);
  return chunks.filter(Boolean).join(' ');
}

function expandedNames(field: ProfileField): string[] {
  const names = [field.label, field.id, ...(field.aliases ?? [])];
  for (const group of BILINGUAL_GROUPS) if (names.some((name) => group.some((term) => normalize(name).includes(normalize(term))))) names.push(...group);
  return [...new Set(names)];
}

export function bestMatch(element: Element, profile: Profile): MatchResult | undefined {
  const source = normalize(getText(element));
  if (!source) return undefined;
  const sourceTokens = new Set(tokens(source));
  let best: MatchResult | undefined;
  for (const field of profile.fields.filter((item) => item.enabled !== false && item.value.trim())) {
    let score = 0; let reason = '';
    for (const name of expandedNames(field)) {
      const normalized = normalize(name);
      if (normalized && source.includes(normalized)) { score = Math.max(score, 100); reason = `matched: ${name}`; continue; }
      const overlap = tokens(name).filter((token) => sourceTokens.has(token)).length;
      const candidateScore = overlap ? Math.round((overlap / Math.max(tokens(name).length, 1)) * 72) : 0;
      if (candidateScore > score) { score = candidateScore; reason = 'matching field words'; }
    }
    if (score >= 48 && (!best || score > best.score)) best = { field, score, reason };
  }
  return best;
}
