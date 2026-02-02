export type LanguageOption = {
  value: string;
  label: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0].value;







