import { makeAutoObservable } from "mobx";
import { createContext } from "react";
import type { SavedMessage } from "~/db/session/schema";
import { ChatMessage } from "./message";

export class ChatStore {
  public messageIds: Array<string> = [];
  public messages = new Map<string, ChatMessage>();

  constructor() {
    makeAutoObservable(this);
  }

  public getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }

  public addMessage(message: SavedMessage): void {
    this.messageIds.push(message.id);
    this.messages.set(message.id, new ChatMessage(message));
  }
  public addMessages(messages: SavedMessage[]): void {
    for (const message of messages) {
      this.addMessage(message);
    }
  }

  public clear() {
    this.messageIds = [];
    this.messages.clear();
  }

  get hasLiveMessages(): boolean {
    return this.messageIds.length > 0;
  }
}

export const ChatContext = createContext<ChatStore>(new ChatStore());
