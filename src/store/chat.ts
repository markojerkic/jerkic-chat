import { action, makeAutoObservable, reaction, runInAction } from "mobx";
import { createContext } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import type { SavedMessageWithParts } from "~/db/session/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { ChatMessage } from "./message";

export class ChatStore {
  private socket: ReconnectingWebSocket | null = null;
  private socketState: "idle" | "connecting" | "open" | "closed" | "error" =
    "idle";
  public threadId: string | null = null;
  public messageIds: Array<string> = [];
  public messages = new Map<string, ChatMessage>();
  public state: "streaming" | "done" | "error" = "done";

  constructor() {
    makeAutoObservable(this, {
      // @ts-expect-error ts stuff
      socket: false,
      socketState: false,
    });
    this.createSocketConnection();
  }

  public setThreadId(threadId: string) {
    this.threadId = threadId;
  }

  public markAsDone() {
    this.state = "done";
    this.lastMessage?.setStatus("done");
  }

  public getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }

  public addMessageWithResponse(
    message: SavedMessageWithParts,
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
      parts: [],
    });
  }

  public addMessage(message: SavedMessageWithParts): void {
    this.messageIds.push(message.id);
    this.messages.set(message.id, new ChatMessage(this, message));
  }

  public addMessages(
    threadId: string,
    messages: SavedMessageWithParts[],
  ): void {
    if (threadId !== this.threadId) {
      this.clear();
    }

    this.threadId = threadId;
    if (messages.length === 0) {
      return;
    }

    for (const message of messages) {
      this.addMessage(message);
    }

    this.state = messages[messages.length - 1].status;
  }

  private clear() {
    console.log("STORE== clear");
    this.messageIds = [];
    this.messages.clear();
  }

  get length() {
    return this.messageIds.length;
  }

  get model() {
    return this.lastMessage?.model;
  }

  get hasLiveMessages(): boolean {
    return this.messageIds.length > 0;
  }

  get lastMessage(): ChatMessage | undefined {
    if (this.length === 0) {
      return undefined;
    }

    return this.getMessage(this.messageIds[this.length - 1]);
  }

  private createSocketConnection() {
    reaction(
      () => this.socketState,
      (state) => console.log("WS== socket state", state),
    );
    reaction(
      () => this.threadId,
      (threadId) => {
        if (this.socket != null) {
          this.socket.close();
          this.socket = null;
        }
        this.socketState = "connecting";
        this.socket = new ReconnectingWebSocket(`/thread/${threadId}/ws`);

        this.socket.onopen = () => {
          runInAction(() => {
            this.socketState = "open";
          });
        };

        this.socket.onclose = () => {
          runInAction(() => {
            this.socketState = "closed";
          });
        };

        this.socket.onerror = () => {
          runInAction(() => {
            this.socketState = "error";
          });
        };

        this.socket.onmessage = (message) => {
          this.handleWsMessage(message as unknown as WsMessage);
        };
      },
    );
  }

  @action
  private handleWsMessage(message: WsMessage) {
    console.log("WS== message", message, typeof message);
    switch (message.type) {
      case "text":
        this.lastMessage?.appendTextOfMessage(message.content);
        // appendTextOfMessage({
        //   messageId: lastJsonMessage.id,
        //   chunk: lastJsonMessage.delta,
        //   model: lastJsonMessage.model,
        //   state: "streaming",
        // });
        break;
      case "message-finished":
        this.lastMessage?.setValue(message);
        break;
      case "streaming-done":
        this.markAsDone();
    }
  }
}

export const ChatContext = createContext<ChatStore>(new ChatStore());
