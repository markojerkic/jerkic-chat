import type { JSONValue } from "ai";

export type SavedMessagePartContent =
  | {
      type: "error";
      content: string;
    }
  | {
      type: "text";
      content: string;
    }
  | {
      type: "reasoning";
      content: string;
      title?: string;
    }
  | {
      type: "web-search" | "web-fetch";
      search: string[];
      results: JSONValue;
    };
export type SavedMessagePartDto = {
  id: string;
  messageId: string;
  textContent: SavedMessagePartContent | null;
  type:
    | "error"
    | "reasoning"
    | "text"
    | "tool-call"
    | "web-fetch"
    | "web-search";
  createdAt: Date;
};
export type SavedMessageDto = {
  id: string;
  textContent: string | null;
  sender: "llm" | "user";
  model: string;
  createdAt: Date;
  status: "done" | "error" | "streaming";
  order: number | null;
  messageAttachemts: { fileName: string; id: string }[] | null;
  parts: SavedMessagePartDto[];
};
