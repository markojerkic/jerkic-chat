import { makeAutoObservable } from "mobx";
import { createContext } from "react";
import type { SavedMessage } from "~/db/session/schema";
import { ChatMessage } from "./message";

export class ChatStore {
  public messageIds: Array<string> = [];
  public messages = new Map<string, ChatMessage>();
  public state: "streaming" | "done" | "error" = "done";

  constructor(messages: SavedMessage[]) {
    this.addMessages(messages);
    makeAutoObservable(this);
  }

  public markAsDone() {}

  public getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }

  public addMessageWithResponse(
    message: SavedMessage,
    llmResponseId: string,
  ): void {
    this.state = "streaming";
    this.addMessage(message);
    this.addMessage({
      id: llmResponseId,
      createdAt: new Date(),
      status: "streaming",
      textContent: null,
      model: message.model,
      sender: "llm",
      order: 1,
      messageAttachemts: [],
    });
  }

  public addMessage(message: SavedMessage): void {
    this.messageIds.push(message.id);
    this.messages.set(message.id, new ChatMessage(this, message));
  }

  public addMessages(messages: SavedMessage[]): void {
    if (messages.length === 0) {
      return;
    }

    for (const message of messages) {
      this.addMessage(message);
    }

    this.state = messages[messages.length - 1].status;
  }

  public clear() {
    this.messageIds = [];
    this.messages.clear();
  }

  get length() {
    return this.messageIds.length;
  }

  get hasLiveMessages(): boolean {
    return this.messageIds.length > 0;
  }
}

export const ChatContext = createContext<ChatStore>(new ChatStore([]));
