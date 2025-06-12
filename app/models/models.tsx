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

const Anthropic = () => (
  <svg
    className="text-color-heading size-4"
    viewBox="0 0 46 32"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <title>Anthropic</title>
    <path d="M32.73 0h-6.945L38.45 32h6.945L32.73 0ZM12.665 0 0 32h7.082l2.59-6.72h13.25l2.59 6.72h7.082L19.929 0h-7.264Zm-.702 19.337 4.334-11.246 4.334 11.246h-8.668Z"></path>
  </svg>
);

export const MODELS = {
  "gemini-1.5-flash": { name: "Gemini 1.5 flash", icon: Gemini },
  "gemini-1.5-pro": { name: "Gemini 1.5 pro", icon: Gemini },
  "gemini-2.0-flash": { name: "Gemini 2.0 flash", icon: Gemini },
  "gemini-2.5-flash-preview-05-20": {
    name: "Gemini 2.5 flash",
    icon: Gemini,
  },
  "claude-4-sonnet-20250514": { name: "Claude 4 sonnet", icon: Anthropic },
  "claude-3-7-sonnet-20250219": { name: "Claude 3.7 sonnet", icon: Anthropic },
  "claude-3-5-sonnet-latest": { name: "Claude 3.5 sonnet", icon: Anthropic },
  "claude-3-5-haiku-latest": { name: "Claude 3.5 haiku", icon: Anthropic },
} as const;
export type MODELS = typeof MODELS;
export type AvailableModel = keyof MODELS;

export const MODEL_IDS = Object.keys(MODELS) as unknown as (keyof MODELS)[];
