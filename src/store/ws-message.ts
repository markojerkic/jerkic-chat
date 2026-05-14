import type { JSONValue } from "ai";
import type { SavedMessageWithParts } from "~/db/session/schema";

export type ClientWsMessage = "stop";

export type WsMessage =
  | {
      type: "text" | "reasoning" | "error";
      id: string;
      content: string;
    }
  | {
      type: "image-generation";
      id: string;
      fileKey: string;
    }
  | {
      type: "web-search" | "web-fetch";
      id: string;
      search: string[];
      results: JSONValue;
    }
  | ({
      type: "message-finished";
    } & SavedMessageWithParts)
  | {
      type: "streaming-done";
    };
