import { DurableObject } from "cloudflare:workers";
import type { AppLoadContext } from "react-router";

export class MessagesDurableObject extends DurableObject {
  private connections: Set<WebSocket>;

  constructor(ctx: DurableObjectState, env: AppLoadContext["cloudflare"]) {
    super(ctx, env);

    const websockets = this.ctx.getWebSockets();
    this.connections = new Set<WebSocket>();

    for (const ws of websockets) {
      this.connections.add(ws);
    }
  }

  async fetch(req: Request) {
    const websocketPair = new WebSocketPair();
    const [client, server] = Object.values(websocketPair);

    this.ctx.acceptWebSocket(server);
    this.connections.add(client);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketError(ws: WebSocket, error: unknown) {
    console.error("webSocketError", error);
    this.connections.delete(ws);
  }

  webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ) {
    console.log("webSocketClose, connections", this.connections);
    this.connections.delete(ws);
  }

  async broadcast(message: string) {
    for (const connection of this.connections) {
      connection.send(message);
    }
  }
}
