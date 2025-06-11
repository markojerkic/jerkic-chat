const Gemini = () => (
  <svg
    className="text-color-heading size-4"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <title>Gemini</title>
    <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"></path>
  </svg>
);

export const MODELS = {
  "gemini-1.5-flash": { name: "Gemini 1.5 flash", icon: Gemini },
  "gemini-1.5-pro": { name: "Gemini 1.5 pro", icon: Gemini },
  "gemini-2.0-flash": { name: "Gemini 2.0 flash", icon: Gemini },
  "gemini-2.5-flash-preview-05-20": {
    name: "Gemini 2.5 pro",
    icon: Gemini,
  },
} as const;
export type MODELS = typeof MODELS;

export const MODEL_IDS = Object.keys(MODELS) as unknown as (keyof MODELS)[];
