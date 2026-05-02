import { makeAutoObservable } from "mobx";
import type { SavedMessage } from "~/db/session/schema";
import type { ChatStore } from "./chat";

export class ChatMessage {
  public id: string;
  public sender: "llm" | "user";
  public status: "done" | "error" | "streaming";
  public textContent: string | null;

  constructor(
    private chatStore: ChatStore,
    private message: SavedMessage,
  ) {
    this.id = message.id;
    this.sender = message.sender;
    this.status = message.status;
    this.textContent = message.textContent;
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
}
