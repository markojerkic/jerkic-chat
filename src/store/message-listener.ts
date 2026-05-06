import ReconnectingWebSocket from "reconnecting-websocket";
import type { ClientWsMessage, WsMessage } from "./ws-message";

type MessageListenerCallback = (message: WsMessage) => void;

export interface MessageListener {
  close(): void;
  onMessage(listener: MessageListenerCallback): void;
  sendMessage(message: ClientWsMessage): void;
}

export type MessageListenerFactory = (threadId: string) => MessageListener;

export class ReconnectingWebSocketListener implements MessageListener {
  private socket: ReconnectingWebSocket;
  private socketState: "idle" | "connecting" | "open" | "closed" | "error" =
    "idle";
  private listener: MessageListenerCallback | null = null;

  constructor(threadId: string) {
    this.socket = new ReconnectingWebSocket(createThreadSocketUrl(threadId));
    this.socketState = "connecting";

    this.socket.onopen = () => {
      this.socketState = "open";
    };

    this.socket.onclose = () => {
      this.socketState = "closed";
    };

    this.socket.onerror = () => {
      this.socketState = "error";
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as WsMessage;
      this.listener?.(message);
    };
  }

  public close(): void {
    this.socket.close();
    this.socketState = "closed";
  }
  public onMessage(listener: MessageListenerCallback): void {
    this.listener = listener;
  }
  public sendMessage(message: ClientWsMessage): void {
    if (!this.socket || this.socketState !== "open") {
      throw Error("Socket not open");
    }
    this.socket.send(message);
  }
}

export class MockWebSocketListener implements MessageListener {
  private listener: MessageListenerCallback | null = null;

  constructor() {}

  public mockServerMessage(message: WsMessage) {
    this.listener?.(message);
  }

  public close(): void {}
  public onMessage(listener: MessageListenerCallback): void {
    this.listener = listener;
  }
  public sendMessage(_message: ClientWsMessage): void {}
}
export const mockWebSocketListenerFactory: (
  cb?: (listener: MockWebSocketListener) => void,
) => MessageListenerFactory = (cb) => (_threadId: string) => {
  const listener = new MockWebSocketListener();
  cb?.(listener);
  return listener;
};

function createThreadSocketUrl(threadId: string): string {
  const origin = globalThis.location?.origin ?? "http://localhost";
  const url = new URL(`/thread/${threadId}/ws`, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return url.toString();
}
