import { makeAutoObservable, reaction } from "mobx";
import { createContext } from "react";
import type { SavedMessageWithParts } from "~/db/session/schema";
import { ChatMessage } from "./message";
import {
  mockWebSocketListenerFactory,
  type MessageListener,
  type MessageListenerFactory,
} from "./message-listener";
import type { WsMessage } from "./ws-message";

export type ChatStoreSnapshot = {
  threadId: string | null;
  messages: SavedMessageWithParts[];
  state: ChatStore["state"];
};

export class ChatStore {
  private socket: MessageListener | null = null;
  public threadId: string | null = null;
  public messageIds: Array<string> = [];
  public messages = new Map<string, ChatMessage>();
  public state: "streaming" | "done" | "error" = "done";

  constructor(private messageListenerFactory: MessageListenerFactory) {
    makeAutoObservable(this, {
      // @ts-expect-error ts stuff
      socket: false,
      messageListenerFactory: false,
    });
    this.createSocketConnection();
  }

  public retryMessage(messageId: string) {
    const messageIndex = this.messageIds.findLastIndex(
      (val) => val === messageId,
    );
    const message = this.messages.get(messageId);

    if (messageIndex === -1 || message?.sender !== "llm") {
      return;
    }

    this.state = "streaming";
    for (let i = messageIndex + 1; i < this.messageIds.length; i++) {
      this.messages.delete(this.messageIds[i]);
    }
    this.messageIds.splice(messageIndex + 1);
    if (this.lastMessage) {
      this.lastMessage.setStatus("streaming");
      this.lastMessage.clearParts();
      this.lastMessage.textContent = null;
    }
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
    if (threadId === this.threadId && messages.length === 0) {
      return;
    }

    this.clear();

    this.threadId = threadId;
    if (messages.length === 0) {
      this.state = "done";
      return;
    }

    for (const message of messages) {
      this.addMessage(message);
    }

    this.state = messages[messages.length - 1].status;
  }

  public getSnapshot(): ChatStoreSnapshot {
    return {
      threadId: this.threadId,
      messages: this.messageIds.flatMap((messageId) => {
        const message = this.messages.get(messageId);
        return message ? [message.getSnapshot()] : [];
      }),
      state: this.state,
    };
  }

  public hydrate(snapshot: ChatStoreSnapshot | undefined) {
    if (!snapshot || snapshot.threadId === null) {
      return;
    }

    this.addMessages(snapshot.threadId, snapshot.messages);
    this.state = snapshot.state;
  }

  public stopMessageStream() {
    if (!this.socket) {
      throw Error("Socket not opened");
    }
    this.socket.sendMessage("stop");
    this.state = "done";
    this.lastMessage?.setStatus("done");
  }

  public clear() {
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
      () => this.threadId,
      (threadId) => {
        if (this.socket != null) {
          this.socket.close();
          this.socket = null;
        }
        if (threadId == null) return;

        this.socket = this.messageListenerFactory(threadId);

        this.socket.onMessage((message) => {
          this.handleWsMessage(message);
        });
      },
    );
  }

  private handleWsMessage(message: WsMessage) {
    switch (message.type) {
      case "reasoning":
      case "text":
      case "error":
      case "web-search":
      case "web-fetch":
        this.lastMessage!.appendTextOfMessage(message);
        break;
      case "message-finished":
        this.lastMessage!.setValue(message);
        this.state = "done";
        break;
      case "streaming-done":
        this.markAsDone();
    }
  }
}

export const ChatContext = createContext<ChatStore>(
  new ChatStore(mockWebSocketListenerFactory()),
);
