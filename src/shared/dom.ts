import type { FillCandidate } from './types';

const NON_TYPEABLE_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio', 'range', 'color']);

export function isTypeableElement(element: Element): element is FillCandidate['element'] {
  if (element instanceof HTMLSelectElement) return !element.disabled;
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  if (!(element instanceof HTMLInputElement)) return false;
  return !element.disabled && !element.readOnly && !NON_TYPEABLE_INPUT_TYPES.has(element.type.toLowerCase());
}

function normalizeOption(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function optionScore(option: HTMLOptionElement, savedValue: string): number {
  const wanted = normalizeOption(savedValue);
  const value = normalizeOption(option.value);
  const text = normalizeOption(option.textContent ?? '');
  if (!wanted || !value && !text) return 0;
  if (value === wanted || text === wanted) return 100;
  if (value.includes(wanted) || text.includes(wanted) || wanted.includes(value) || wanted.includes(text)) return 78;
  const wantedTokens = new Set(wanted.split(' ').filter(Boolean));
  const optionTokens = new Set(`${value} ${text}`.split(' ').filter(Boolean));
  const overlap = [...wantedTokens].filter((token) => optionTokens.has(token)).length;
  return overlap ? Math.round((overlap / wantedTokens.size) * 60) : 0;
}

export function formCandidates(root: ParentNode = document): FillCandidate[] {
  return Array.from(root.querySelectorAll('input, textarea, select'))
    .filter(isTypeableElement)
    .map((element) => {
      const input = element as HTMLInputElement;
      return {
        element,
        label: element.getAttribute('aria-label') || input.name || input.id || input.placeholder || input.autocomplete || ''
      };
    });
}

export function setElementValue(element: FillCandidate['element'], value: string): void { const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value'); if (element instanceof HTMLSelectElement) { const ranked = Array.from(element.options).map((option) => ({ option, score: optionScore(option, value) })).sort((a, b) => b.score - a.score); const best = ranked[0]; const second = ranked[1]; if (best && best.score >= 60 && (!second || best.score > second.score)) { descriptor?.set?.call(element, best.option.value); } } else { descriptor?.set?.call(element, value); } element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); element.dispatchEvent(new Event('blur', { bubbles: true })); }
export function fillCandidate(candidate: FillCandidate, value: string): void { setElementValue(candidate.element, value); }
