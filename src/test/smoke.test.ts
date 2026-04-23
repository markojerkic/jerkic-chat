import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Session Durable Object", () => {
  // Each test gets isolated storage automatically
  it("should not have any messages", async () => {
    const id = env.SESSION_DO.idFromName("test-counter");
    const stub = env.SESSION_DO.get(id);

    // Call RPC methods directly on the stub
    const messages = await stub.getMessages();
    expect(messages).toHaveLength(0);
    expect(messages).toHaveLength(1);
  });
});
