import type { Route } from "./+types/ws";

export async function loader({ context, request }: Route.LoaderArgs) {
  console.log("want to connect to ws");
  const wsServer = context.cloudflare.env.WEBSOCKET_SERVER;
  const id = wsServer.idFromName("default");
  const stub = wsServer.get(id);

  return await stub.fetch(request);
}
