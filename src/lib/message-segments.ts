import { createId } from "@paralleldrive/cuid2";
import type { SavedMessageRow, SavedMessageSegment } from "~/db/session/schema";

const specialBlockStartPattern = /^<div class="(ai-reasoning|tool-call)">(.*)$/;
const fencePattern = /^(`{3,}|~{3,})/;

type SegmentKind = SavedMessageSegment["type"];

type ParsedLegacySegment = {
  type: SegmentKind;
  content: string;
};

export function buildSegmentsForStoredMessage(
  message: Pick<SavedMessageRow, "id" | "sender" | "textContent">,
): SavedMessageSegment[] {
  const text = message.textContent ?? "";
  if (!text.trim()) {
    return [];
  }

  const segments =
    message.sender === "llm"
      ? parseLegacyAssistantSegments(text)
      : [{ type: "text", content: text } satisfies ParsedLegacySegment];

  return segments.map((segment, order) => ({
    id: createId(),
    messageId: message.id,
    type: segment.type,
    content: segment.content,
    order,
  }));
}

export function getCanonicalTextContent(
  segments: Pick<SavedMessageSegment, "type" | "content">[],
) {
  return segments
    .filter((segment) => segment.type === "text")
    .map((segment) => segment.content)
    .join("");
}

function parseLegacyAssistantSegments(text: string) {
  const lines = text.split(/\r?\n/);
  const segments: ParsedLegacySegment[] = [];
  let fence: string | null = null;
  let currentSpecialType: Exclude<SegmentKind, "text"> | null = null;
  let textBuffer: string[] = [];
  let specialBuffer: string[] = [];

  const pushText = () => {
    const content = textBuffer.join("\n");
    if (content.trim()) {
      segments.push({ type: "text", content });
    }
    textBuffer = [];
  };

  const pushSpecial = () => {
    if (currentSpecialType) {
      const content = specialBuffer.join("\n").trim();
      if (content) {
        segments.push({ type: currentSpecialType, content });
      }
    }

    currentSpecialType = null;
    specialBuffer = [];
  };

  for (const line of lines) {
    if (currentSpecialType) {
      if (!fence) {
        const closeIndex = line.indexOf("</div>");
        if (closeIndex >= 0) {
          const beforeClose = line.slice(0, closeIndex);
          if (beforeClose) {
            specialBuffer.push(beforeClose);
          }
          pushSpecial();

          const trailingContent = line.slice(closeIndex + "</div>".length);
          if (trailingContent) {
            textBuffer.push(trailingContent);
          }
          continue;
        }
      }

      specialBuffer.push(line);
      fence = updateFenceState(fence, line);
      continue;
    }

    if (!fence) {
      const match = line.trim().match(specialBlockStartPattern);
      if (match) {
        const type =
          match[1] === "ai-reasoning"
            ? "reasoning"
            : ("tool" satisfies Exclude<SegmentKind, "text">);
        const remainder = match[2] ?? "";
        const closeIndex = remainder.indexOf("</div>");

        pushText();

        if (closeIndex >= 0) {
          const content = remainder.slice(0, closeIndex).trim();
          if (content) {
            segments.push({ type, content });
          }

          const trailingContent = remainder.slice(closeIndex + "</div>".length);
          if (trailingContent) {
            textBuffer.push(trailingContent);
          }
          continue;
        }

        currentSpecialType = type;
        if (remainder) {
          specialBuffer.push(remainder);
        }
        continue;
      }
    }

    textBuffer.push(line);
    fence = updateFenceState(fence, line);
  }

  if (currentSpecialType) {
    pushSpecial();
  }

  pushText();

  return segments;
}

function updateFenceState(currentFence: string | null, line: string) {
  const trimmedLine = line.trim();
  const match = trimmedLine.match(fencePattern);
  if (!match) {
    return currentFence;
  }

  const nextFence = match[1];
  if (!currentFence) {
    return nextFence;
  }

  return trimmedLine.startsWith(currentFence) ? null : currentFence;
}
