export type ProfileSection = 'personal' | 'contact' | 'address' | 'education' | 'employment' | 'experience' | 'skills' | 'links' | 'preferences' | 'custom';
export interface ProfileField { id: string; label: string; value: string; section: ProfileSection; type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'month' | 'select' | 'textarea'; options?: string[]; aliases?: string[]; enabled?: boolean; base?: boolean; showInPopup?: boolean; }
export interface Profile { version: 1; fields: ProfileField[]; mappings: Record<string, string>; updatedAt: string; }
export interface MatchResult { field: ProfileField; score: number; reason: string; }
export interface FillCandidate { element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; label: string; }
