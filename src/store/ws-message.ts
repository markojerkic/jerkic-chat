import type { SavedMessageWithParts } from "~/db/session/schema";

export type ClientWsMessage = "stop";

export type WsMessage =
  | {
      type: "text" | "reasoning";
      id: string;
      content: string;
    }
  | {
      type: "web-search" | "web-fetch";
      id: string;
      search: string[];
      results: unknown;
    }
  | ({
      type: "message-finished";
    } & SavedMessageWithParts)
  | {
      type: "streaming-done";
    };
