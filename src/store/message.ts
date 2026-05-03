import { makeAutoObservable } from "mobx";
import type { SavedMessageWithParts } from "~/db/session/schema";
import type { ChatStore } from "./chat";

export class ChatMessage {
  public id!: string;
  public sender!: "llm" | "user";
  public status!: "done" | "error" | "streaming";
  public textContent!: string | null;

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
  }

  public setStatus(status: typeof this.status) {
    this.status = status;
  }

  public appendTextOfMessage(chunk: string) {
    if (this.textContent === null) {
      this.textContent = chunk;
      console.log("MessageStore== new textContent", chunk);
      return;
    }
    this.textContent += chunk;
    console.log("MessageStore== append textContent", this.textContent);
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
}
