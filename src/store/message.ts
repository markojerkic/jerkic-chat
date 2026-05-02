import { makeAutoObservable } from "mobx";
import type { SavedMessage } from "~/db/session/schema";

export class ChatMessage {
  public id: string;
  public sender: "llm" | "user";
  public status: "done" | "error" | "streaming";
  public textContent: string | null;

  constructor(public message: SavedMessage) {
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
}
