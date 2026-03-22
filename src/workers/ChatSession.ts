import { DurableObject } from "cloudflare:workers";

export class MessagesDurableObject extends DurableObject<Env> {}
