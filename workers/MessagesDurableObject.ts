import { DurableObject } from "cloudflare:workers";
import type { AppLoadContext } from "react-router";

export class MessagesDurableObject extends DurableObject<
  AppLoadContext["cloudflare"]
> {
  constructor(ctx: DurableObjectState, env: AppLoadContext["cloudflare"]) {
    super(ctx, env);
  }

  public async fetch() {
    const websocketPair = new WebSocketPair();
    const [client, server] = Object.values(websocketPair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  public webSocketError(_ws: WebSocket, error: unknown) {
    console.error("webSocketError", error);
  }

  public webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ) {
    console.log("webSocketClose, connections", this.ctx.getWebSockets().length);
  }

  public async broadcast(message: string) {
    for (const connection of this.ctx.getWebSockets()) {
      connection.send(message);
    }
  }
}
