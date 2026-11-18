import { extensionBrowser } from './browser';
import type { Profile, ProfileField, ProfileSection } from './types';

const STORAGE_KEY = 'jobfill.profile';
const SECTION_LABELS: Record<ProfileSection, string> = { personal: 'Personal', contact: 'Contact', address: 'Address', education: 'Education', employment: 'Employment', experience: 'Past work experience', skills: 'Skills', links: 'Links', preferences: 'Preferences', custom: 'Custom Q&A' };
export const sectionLabel = (section: ProfileSection) => SECTION_LABELS[section];

const DEFAULT_FIELDS: Array<Pick<ProfileField, 'id' | 'label' | 'section' | 'type' | 'options' | 'aliases' | 'base'>> = [
  { id: 'full-name', label: 'Full name', section: 'personal', type: 'text', aliases: ['name', 'nama lengkap', 'nama'] },
  { id: 'first-name', label: 'First name', section: 'personal', type: 'text', aliases: ['given name', 'nama depan'] },
  { id: 'last-name', label: 'Last name', section: 'personal', type: 'text', aliases: ['surname', 'family name', 'nama belakang'] },
  { id: 'preferred-name', label: 'Preferred name', section: 'personal', type: 'text', aliases: ['nickname', 'nama panggilan'] },
  { id: 'date-of-birth', label: 'Date of birth', section: 'personal', type: 'date', aliases: ['birthday', 'tanggal lahir'] },
  { id: 'nationality', label: 'Nationality', section: 'personal', type: 'text', aliases: ['citizenship', 'kewarganegaraan'] },
  { id: 'email', label: 'Email', section: 'contact', type: 'email', aliases: ['email address', 'alamat email', 'surel'] },
  { id: 'phone-country-code', label: 'Phone country code', section: 'contact', type: 'tel', aliases: ['country calling code', 'kode negara telepon'] },
  { id: 'phone', label: 'Phone number', section: 'contact', type: 'tel', aliases: ['mobile', 'telephone', 'nomor telepon', 'no hp', 'include country code'] },
  { id: 'address', label: 'Address', section: 'address', type: 'textarea', aliases: ['home address', 'alamat', 'alamat rumah'] },
  { id: 'city', label: 'City', section: 'address', type: 'text', aliases: ['town', 'kota'] },
  { id: 'state', label: 'State / Province', section: 'address', type: 'text', aliases: ['region', 'province', 'provinsi'] },
  { id: 'postal-code', label: 'Postal code', section: 'address', type: 'text', aliases: ['zip code', 'postcode', 'kode pos'] },
  { id: 'country', label: 'Country', section: 'address', type: 'text', aliases: ['negara'] },
  { id: 'university', label: 'University / School', section: 'education', type: 'text', aliases: ['education', 'school', 'universitas', 'sekolah'] },
  { id: 'degree', label: 'Degree', section: 'education', type: 'text', aliases: ['qualification', 'gelar'] },
  { id: 'field-of-study', label: 'Field of study', section: 'education', type: 'text', aliases: ['major', 'jurusan', 'program studi'] },
  { id: 'employer', label: 'Company / Employer', section: 'employment', type: 'text', aliases: ['company', 'perusahaan'] },
  { id: 'job-title', label: 'Job title', section: 'employment', type: 'text', aliases: ['position', 'role', 'jabatan', 'posisi'] },
  { id: 'experience-1-job-title', label: 'Experience 1 - Job title', section: 'experience', type: 'text', aliases: ['position', 'role', 'jabatan', 'posisi'] },
  { id: 'experience-1-start', label: 'Experience 1 - Start month', section: 'experience', type: 'month', aliases: ['start date', 'mulai bekerja', 'tanggal mulai'] },
  { id: 'experience-1-end', label: 'Experience 1 - End month', section: 'experience', type: 'month', aliases: ['end date', 'tanggal selesai'] },
  { id: 'experience-1-description', label: 'Experience 1 - Description', section: 'experience', type: 'textarea', aliases: ['responsibilities', 'deskripsi pekerjaan', 'tanggung jawab'] },
  { id: 'experience-1-type', label: 'Experience 1 - Work type', section: 'experience', type: 'select', options: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract', 'Volunteer'], aliases: ['employment type', 'job type', 'jenis pekerjaan', 'tipe pekerjaan'] },
  { id: 'linkedin', label: 'LinkedIn URL', section: 'links', type: 'url', aliases: ['linkedin profile', 'profil linkedin'] },
  { id: 'portfolio', label: 'Portfolio / Website', section: 'links', type: 'url', aliases: ['personal website', 'situs web', 'portofolio'] },
  { id: 'resume', label: 'Resume / CV link', section: 'links', type: 'url', aliases: ['curriculum vitae', 'daftar riwayat hidup'] },
  { id: 'skills', label: 'Technical skills', section: 'skills', type: 'textarea', aliases: ['skills', 'keahlian', 'keterampilan'] },
  { id: 'salary-expectation', label: 'Salary expectation', section: 'preferences', type: 'text', aliases: ['expected salary', 'gaji', 'ekspektasi gaji'] },
  { id: 'availability', label: 'Availability / Start date', section: 'preferences', type: 'text', aliases: ['available from', 'ketersediaan', 'tanggal mulai'] },
  { id: 'work-authorization', label: 'Work authorization', section: 'preferences', type: 'text', aliases: ['visa sponsorship', 'izin kerja', 'sponsor visa'] }
];

export const emptyProfile = (): Profile => ({ version: 1, fields: DEFAULT_FIELDS.map((field) => makeField({ ...field, base: field.base ?? (field.section !== 'experience' && field.section !== 'custom'), showInPopup: true })), mappings: {}, updatedAt: new Date().toISOString() });

function removeUntouchedLegacyPlaceholders(fields: ProfileField[]): ProfileField[] {
  const experienceTwo = fields.filter((field) => field.id.startsWith('experience-2-'));
  const hasExperienceTwoData = experienceTwo.some((field) => field.value.trim() || field.aliases?.some((alias) => !['position', 'role', 'jabatan', 'posisi', 'start date', 'mulai bekerja', 'tanggal mulai', 'end date', 'sampai', 'tanggal selesai', 'responsibilities', 'deskripsi pekerjaan', 'tanggung jawab', 'employment type', 'job type', 'jenis pekerjaan', 'tipe pekerjaan'].includes(alias)));
  return fields.filter((field) => !(field.id.startsWith('custom-question-') && !field.value.trim()) && !(field.id.startsWith('experience-2-') && !hasExperienceTwoData));
}

export async function loadProfile(): Promise<Profile> {
  const result = await extensionBrowser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Profile | undefined;
  if (stored?.version === 1 && Array.isArray(stored.fields)) {
    const defaults = emptyProfile().fields;
    const normalized = removeUntouchedLegacyPlaceholders(stored.fields.map((field) => ({ ...field, base: field.base ?? defaults.find((item) => item.id === field.id)?.base ?? false, showInPopup: field.showInPopup !== false })));
    const missing = defaults.filter((field) => !normalized.some((saved) => saved.id === field.id));
    const migrated = { ...stored, fields: [...normalized, ...missing] };
    if (JSON.stringify(migrated.fields) !== JSON.stringify(stored.fields)) await saveProfile(migrated);
    return migrated;
  }
  const profile = emptyProfile();
  await saveProfile(profile);
  return profile;
}

export async function saveProfile(profile: Profile): Promise<void> { await extensionBrowser.storage.local.set({ [STORAGE_KEY]: { ...profile, updatedAt: new Date().toISOString() } }); }
export function makeField(partial: Partial<ProfileField> = {}): ProfileField { return { id: crypto.randomUUID(), label: 'New field', value: '', section: 'custom', aliases: [], type: 'text', enabled: true, base: false, showInPopup: true, ...partial }; }
export async function exportProfile(): Promise<string> { return JSON.stringify(await loadProfile(), null, 2); }
export async function importProfile(json: string): Promise<Profile> { const parsed = JSON.parse(json) as Partial<Profile>; if (parsed.version !== 1 || !Array.isArray(parsed.fields)) throw new Error('This file is not a valid JobFill backup.'); const profile: Profile = { version: 1, fields: parsed.fields.map((field) => makeField(field)), mappings: parsed.mappings ?? {}, updatedAt: new Date().toISOString() }; await saveProfile(profile); return profile; }
