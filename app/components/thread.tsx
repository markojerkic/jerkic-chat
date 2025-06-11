import { valibotResolver } from "@hookform/resolvers/valibot";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm, useFormState, type SubmitHandler } from "react-hook-form";
import { useFetcher, useNavigate } from "react-router";
import { uuidv7 } from "uuidv7";
import * as v from "valibot";
import { Message } from "~/components/message";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { MODEL_IDS, MODELS } from "~/models/models";
import {
  useLiveMessages,
  useLiveMessagesForThread,
} from "~/store/messages-store";
import { Button } from "./ui/button";

export type ThreadParams = {
  threadId: string;
};

const chatMessageSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  model: v.picklist(MODEL_IDS),
});
type ChatMessage = v.InferOutput<typeof chatMessageSchema>;

export const chatSchema = v.intersect([
  v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    userMessageId: v.pipe(v.string(), v.minLength(1)),
    newThread: v.pipe(
      v.optional(v.string(), "false"),
      v.transform((s) => s === "true"),
    ),
  }),
  chatMessageSchema,
]);

export default function Thread({ threadId }: ThreadParams) {
  const fetcher = useFetcher();
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const addMessage = useLiveMessages((store) => store.addLiveMessage);
  const messageIds = useLiveMessagesForThread(threadId);

  const form = useForm({
    resolver: valibotResolver(chatMessageSchema),
  });
  const { errors } = useFormState(form);

  const onSubmit: SubmitHandler<ChatMessage> = (data) => {
    console.log("submit", data);
    const isNewThread = !window.location.pathname.includes("/thread/");
    const userMessageId = uuidv7();
    const newId = uuidv7();
    addMessage({
      id: userMessageId,
      sender: "user",
      textContent: data.q,
      thread: threadId,
    });
    addMessage({
      id: newId,
      sender: "llm",
      textContent: null,
      thread: threadId,
    });
    form.setValue("q", "");
    if (isNewThread) {
      history.pushState(null, "", `/thread/${threadId}`);
    }
    fetcher
      .submit(
        {
          q: data.q,
          id: newId,
          userMessageId,
          newThread: isNewThread,
        },
        {
          method: "post",
          action: `/thread/${threadId}`,
        },
      )
      .then(() => {
        if (isNewThread) {
          navigate({
            pathname: `/thread/${threadId}`,
          });
        }
      });
  };

  useEffect(() => {
    if (questionEl.current) {
      questionEl.current.focus();
    }
  }, [threadId, questionEl.current]);

  return (
    <div className="flex h-full w-full flex-col bg-chat-background">
      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-4">
          {messageIds.length === 0 ? (
            // Empty state - centers content when no messages
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Start a conversation</p>
              </div>
            </div>
          ) : (
            // Messages list
            <div className="space-y-3">
              {messageIds.map((messageId, i) => (
                <Message
                  key={messageId}
                  messageId={messageId}
                  isSecondToLast={i === messageIds.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input area - sticky at bottom */}
      <div className="flex-shrink-0 bg-chat-background backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4">
          <pre>{JSON.stringify(form.getValues(), null, 2)}</pre>
          <hr />
          <pre>{JSON.stringify(errors, null, 2)}</pre>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="bg-chat-overaly rounded-t-[20px] border-8 border-chat-border/60 p-1"
              style={{
                outline: `8px solid oklch(var(--chat-input-gradient) / 0.5)`,
                boxShadow: `rgba(0, 0, 0, 0.1) 0px 80px 50px 0px,
                         rgba(0, 0, 0, 0.07) 0px 50px 30px 0px,
                         rgba(0, 0, 0, 0.06) 0px 30px 15px 0px,
                         rgba(0, 0, 0, 0.04) 0px 15px 8px,
                         rgba(0, 0, 0, 0.04) 0px 6px 4px,
                         rgba(0, 0, 0, 0.02) 0px 2px 2px`,
              }}
              method="POST"
            >
              <FormField
                control={form.control}
                name="q"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        ref={questionEl}
                        className="w-full resize-none border-none px-4 py-3 text-foreground shadow-none placeholder:text-secondary-foreground/70 focus:outline-none focus-visible:ring-0"
                        rows={3}
                        placeholder="Type your message..."
                        autoComplete="off"
                        required
                        onKeyDown={(e) => {
                          if (!(e.key === "Enter" && !e.shiftKey)) {
                            return;
                          }
                          e.preventDefault();
                          (
                            e.currentTarget.parentElement as HTMLFormElement
                          ).requestSubmit();
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Language</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-[200px] justify-between",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value
                              ? MODEL_IDS.find((model) => model === field.value)
                              : "Select language"}
                            <ChevronsUpDown className="opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search framework..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No framework found.</CommandEmpty>
                            <CommandGroup>
                              {MODEL_IDS.map((modelId) => (
                                <CommandItem
                                  value={MODELS[modelId].name}
                                  key={modelId}
                                  onSelect={() => {
                                    form.setValue("model", modelId);
                                  }}
                                >
                                  {MODELS[modelId].name}
                                  <Check
                                    className={cn(
                                      "ml-auto",
                                      modelId === field.value
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="h-10 w-full" />
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
