import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowUp, Check, ChevronDown, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
  FormMessage,
} from "~/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { MODEL_IDS, MODELS, type AvailableModel } from "~/models/models";
import {
  useLiveMessages,
  useLiveMessagesForThread,
} from "~/store/messages-store";
import { Button } from "./ui/button";

export type ThreadParams = {
  threadId: string;
  model: AvailableModel | undefined;
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

export default function Thread({ threadId, model }: ThreadParams) {
  const fetcher = useFetcher();
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const addMessage = useLiveMessages((store) => store.addLiveMessage);
  const messageIds = useLiveMessagesForThread(threadId);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const form = useForm<ChatMessage>({
    resolver: valibotResolver(chatMessageSchema),
    defaultValues: {
      q: "",
      model: model ?? "gemini-2.0-flash",
    },
  });

  useEffect(() => {
    if (model) {
      form.setValue("model", model ?? "gemini-2.0-flash");
    }
  }, [model]);

  const onSubmit: SubmitHandler<ChatMessage> = (data) => {
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
          model: data.model,
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
    <div className="flex h-full w-full flex-col overflow-y-auto bg-chat-background">
      <div className="mx-auto flex h-full flex-col px-4 pt-4">
        {/* Messages area - scrollable */}
        <div className="mx-auto flex w-3xl grow flex-col space-y-3">
          {messageIds.length === 0 ? (
            // Empty state - centers content when no messages
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Start a conversation</p>
              </div>
            </div>
          ) : (
            messageIds.map((messageId, i) => (
              <Message
                key={messageId}
                messageId={messageId}
                isSecondToLast={i === messageIds.length - 1}
              />
            ))
          )}
        </div>

        {/* Input area - sticky at bottom */}
        <div className="sticky bottom-0 flex-shrink-0 bg-chat-background backdrop-blur-lg">
          <div className="mx-auto max-w-3xl">
            <Form {...form}>
              <form
                ref={formEl}
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
                            // Use the form ref instead of trying to find parent
                            formEl.current?.requestSubmit();
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Bottom row with model selector and submit button */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex flex-col gap-2 pr-2 sm:flex-row sm:items-center">
                    <div className="ml-[-7px] flex items-center gap-1">
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <Popover
                              open={isPopoverOpen}
                              onOpenChange={setIsPopoverOpen}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <button
                                    className="relative -mb-2 inline-flex h-8 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                                    type="button"
                                    role="combobox"
                                    aria-expanded={false}
                                  >
                                    {field.value && MODELS[field.value]?.icon()}
                                    <div className="text-left text-sm font-medium">
                                      {field.value
                                        ? MODELS[field.value]?.name ||
                                          field.value
                                        : "Select Model"}
                                    </div>
                                    <ChevronDown
                                      className={cn(
                                        "right-0 size-4 transition-transform duration-200 ease-in-out",
                                        isPopoverOpen && "rotate-180",
                                      )}
                                    />
                                  </button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Search model..."
                                    className="h-9"
                                  />
                                  <CommandList>
                                    <CommandEmpty>No model found.</CommandEmpty>
                                    <CommandGroup>
                                      {MODEL_IDS.map((modelId) => {
                                        return (
                                          <CommandItem
                                            value={
                                              MODELS[modelId]?.name || modelId
                                            }
                                            key={modelId}
                                            onSelect={() => {
                                              form.setValue("model", modelId);
                                            }}
                                          >
                                            <div className="flex items-center gap-2">
                                              {MODELS[modelId]?.icon()}
                                              <span>
                                                {MODELS[modelId]?.name}
                                              </span>
                                            </div>
                                            <Check
                                              className={cn(
                                                "ml-auto",
                                                modelId === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0",
                                              )}
                                            />
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <button
                        className="-mb-1.5 inline-flex h-auto items-center justify-center gap-2 rounded-full border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        aria-label="Attach files"
                        type="button"
                      >
                        <Paperclip className="size-4" />
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!form.watch("q")?.trim()}
                    className="border-reflect relative inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg bg-[rgb(162,59,103)] p-2 text-sm font-semibold whitespace-nowrap text-pink-50 shadow transition-colors button-reflect hover:bg-[#d56698] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] dark:bg-primary/20 dark:hover:bg-pink-800/70 dark:active:bg-pink-800/40 disabled:dark:hover:bg-primary/20 disabled:dark:active:bg-primary/20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                    aria-label={
                      !form.watch("q")?.trim()
                        ? "Message requires text"
                        : "Send message"
                    }
                  >
                    <ArrowUp className="!size-5" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
