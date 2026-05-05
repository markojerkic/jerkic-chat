import { makeAutoObservable } from "mobx";
import type {
  MessagePartContent,
  MessagePartContentWithId,
  SavedMessageWithParts,
} from "~/db/session/schema";
import type { ChatStore } from "./chat";

export class ChatMessage {
  public id!: string;
  public sender!: "llm" | "user";
  public status!: "done" | "error" | "streaming";
  public textContent!: string | null;
  public messageParts = new Map<string, MessagePartContent>();
  public messagePartIds: string[] = [];

  constructor(
    private chatStore: ChatStore,
    private message: SavedMessageWithParts,
  ) {
    this.setValue(message);
    makeAutoObservable(
      this,
      {
        id: false,
      },
      {
        autoBind: true,
      },
    );
  }

  public setValue(message: SavedMessageWithParts) {
    this.id = message.id;
    this.sender = message.sender;
    this.status = message.status;
    this.textContent = message.textContent;
    this.message = message;
    for (const part of message.parts) {
      if (!part.textContent) {
        continue;
      }

      this.messagePartIds.push(part.id);
      this.createMessagePart({ ...part.textContent, id: part.id });
    }
  }

  public setStatus(status: typeof this.status) {
    this.status = status;
  }

  public appendTextOfMessage(messagePart: MessagePartContentWithId) {
    let hasLastPart = this.messageParts.has(messagePart.id);
    if (!hasLastPart) {
      this.createMessagePart(messagePart);
      this.messagePartIds.push(messagePart.id);
      return;
    }
    const lastPart = this.messageParts.get(messagePart.id);
    if (!lastPart) {
      console.warn("ChatMessage store== not handled part", messagePart);
      return;
    }

    switch (lastPart?.type) {
      case "text":
      case "reasoning":
        lastPart.content +=
          "content" in messagePart ? messagePart.content : undefined;
        break;
      case "web-search":
      case "web-fetch":
        this.addWebToolCall(messagePart);
    }
  }

  public get parts() {
    return this.message.parts;
  }

  public get model(): string {
    return this.message.model;
  }

  public get isLastMessage(): boolean {
    return (
      this.chatStore.messageIds[this.chatStore.messageIds.length - 1] ===
      this.id
    );
  }

  public get messageAttachemts():
    | {
        fileName: string;
        id: string;
      }[]
    | null {
    return this.message.messageAttachemts;
  }

  private createMessagePart(messagePart: MessagePartContentWithId) {
    switch (messagePart.type) {
      case "reasoning":
      case "text":
        this.messageParts.set(messagePart.id, {
          type: messagePart.type,
          content: messagePart.content,
        });
        break;
      case "web-fetch":
      case "web-search":
        this.addWebToolCall(messagePart);
    }
  }
  private addWebToolCall(inputMessagePart: MessagePartContentWithId) {
    if (!this.messageParts.has(inputMessagePart.id)) {
      this.messagePartIds.push(inputMessagePart.id);
    }
    this.messageParts.set(inputMessagePart.id, inputMessagePart);
    console.log("USING== added web tool call", inputMessagePart);
  }
}
