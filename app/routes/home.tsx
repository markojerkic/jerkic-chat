import * as schema from "~/database/schema";
import * as v from "valibot";

import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { generateText } from "ai";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProviderOptions,
} from "@ai-sdk/google";
import { Form, useFetcher } from "react-router";
import { getGeminiRespose } from "~/server/google";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const text = await getGeminiRespose(formData);
  return text;
}

export async function loader({ context }: Route.LoaderArgs) {
  const guestBook = await context.db.query.guestBook.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return {
    guestBook,
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
  };
}

export default function Home({ actionData, loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<Route.ActionArgs>();

  return (
    <fetcher.Form>
      <div className="flex flex-col gap-2">
        {actionData && <span>actionData</span>}

        <input name="q" placeholder="Q" />
      </div>
    </fetcher.Form>
  );
}
