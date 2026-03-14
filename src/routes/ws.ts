import { redirect } from "react-router";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/ws";

export async function loader({ context, request }: Route.LoaderArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }
  console.log("want to connect to ws");
  const wsServer = context.cloudflare.env.WEBSOCKET_SERVER;
  const id = wsServer.idFromName(session.user.id);
  const stub = wsServer.get(id);

  return await stub.fetch(request);
}
