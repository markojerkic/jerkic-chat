import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowUp, Check, ChevronDown, Paperclip } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import { uuidv7 } from "uuidv7";
import * as v from "valibot";
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
import type { SavedMessage } from "~/database/schema";
import { useScrollToBottom } from "~/hooks/use-scroll-to-bottom";
import { cn } from "~/lib/utils";
import {
  DEFAULT_MODEL,
  MODEL_IDS,
  MODELS,
  type AvailableModel,
} from "~/models/models";
import {
  useLiveMessages,
  useLiveMessagesForThread,
  useThreadIsStreaming,
} from "~/store/messages-store";
import { EmptyChat } from "./empty-chat";
import { UploadedFile } from "./file";
import { Button } from "./ui/button";
const Message = lazy(() => import("~/components/message/message.client"));

export type ThreadParams = {
  threadId: string;
  model?: AvailableModel | undefined;
  defaultMessages?: SavedMessage[];
};

const chatMessageSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
  model: v.picklist(MODEL_IDS),
});

export const chatSchema = v.intersect([
  v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    userMessageId: v.pipe(v.string(), v.minLength(1)),
    newThread: v.pipe(
      v.optional(v.string(), "false"),
      v.transform((s) => s === "true"),
    ),
    files: v.array(v.pipe(v.string(), v.uuid())),
  }),
  chatMessageSchema,
]);

const chatFormSchema = v.intersect([
  v.object({
    files: v.pipe(
      v.array(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          file: v.file(),
        }),
      ),
      v.maxLength(3),
    ),
  }),
  chatMessageSchema,
]);
type ChatMessage = v.InferOutput<typeof chatFormSchema>;

export default function Thread({
  threadId,
  model,
  defaultMessages,
}: ThreadParams) {
  const fetcher = useFetcher();
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const addMessage = useLiveMessages((store) => store.addLiveMessage);
  const messageIds = useLiveMessagesForThread(threadId);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isThreadStreaming = useThreadIsStreaming(threadId);
  const {
    containerRef: messagesContainerRef,
    scrollToBottom,
    showScrollButton,
  } = useScrollToBottom({});

  const form = useForm({
    resolver: valibotResolver(chatFormSchema),
    defaultValues: {
      q: "",
      model: model ?? DEFAULT_MODEL,
    },
  });

  useEffect(() => {
    if (model) {
      form.setValue("model", model ?? DEFAULT_MODEL);
    }
  }, [model]);

  const onSubmit: SubmitHandler<ChatMessage> = (data) => {
    if (isThreadStreaming || fetcher.state !== "idle") {
      return;
    }

    const isNewThread = !window.location.pathname.includes("/thread/");
    const userMessageId = uuidv7();
    const newId = uuidv7();
    addMessage({
      id: userMessageId,
      sender: "user",
      textContent: data.q,
      thread: threadId,
      model: data.model,
      status: "done",
    });
    addMessage({
      id: newId,
      sender: "llm",
      textContent: null,
      thread: threadId,
      model: data.model,
      status: "streaming",
    });
    form.setValue("q", "");
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
          console.log("new thread, navigate");
          navigate({
            pathname: `/thread/${threadId}`,
          });
        }
      });
    history.pushState(null, "", `/thread/${threadId}`);
  };

  useEffect(() => {
    if (questionEl.current) {
      questionEl.current.focus();
    }
  }, [threadId, questionEl.current]);

  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-chat-background"
      ref={messagesContainerRef}
    >
      <div className="mx-auto flex h-full flex-col px-4 pt-4">
        {/* Messages area */}
        <div className="mx-auto flex w-3xl grow flex-col space-y-3">
          {!messageIds.length && !defaultMessages?.length ? (
            <EmptyChat />
          ) : (
            <Suspense>
              {(messageIds.length !== 0
                ? messageIds
                : defaultMessages?.map((m) => m.id)
              )?.map((messageId, i) => (
                <Message
                  key={messageId}
                  messageId={messageId}
                  threadId={threadId}
                  isLast={i === messageIds.length - 1}
                  defaultMessage={
                    defaultMessages ? defaultMessages[i] : undefined
                  }
                />
              ))}
            </Suspense>
          )}
        </div>

        {/* Scroll to bottom button - positioned absolutely */}

        {/* Input area - sticky at bottom */}
        <div className="sticky bottom-0 flex-shrink-0 bg-chat-background backdrop-blur-lg">
          {showScrollButton && (
            <div className="pointer-events-none fixed top-[-40px] right-0 left-0 z-10 flex justify-center">
              <Button
                onClick={() => scrollToBottom()}
                variant="secondary"
                size="sm"
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-secondary/40 bg-pink-100/85 text-secondary-foreground/70 backdrop-blur-lg hover:bg-secondary"
              >
                <span className="pb-0.5 text-xs font-light">
                  Scroll to bottom
                </span>
                <ChevronDown className="h-4 w-4 stroke-1 font-light" />
              </Button>
            </div>
          )}
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
                          className="max-h-[50vh] w-full resize-none border-none px-4 py-3 text-foreground shadow-none placeholder:text-secondary-foreground/70 focus:outline-none focus-visible:ring-0"
                          rows={3}
                          placeholder="Type your message..."
                          autoComplete="off"
                          required
                          onKeyDown={(e) => {
                            if (!(e.key === "Enter" && !e.shiftKey)) {
                              return;
                            }
                            e.preventDefault();
                            formEl.current?.requestSubmit();
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-start gap-2 overflow-x-auto px-4 py-1">
                  {form.watch("files")?.map((fileId) => (
                    <UploadedFile
                      file={fileId.file}
                      id={fileId.id}
                      onRemove={() => {
                        form.setValue(
                          "files",
                          form
                            .getValues("files")
                            ?.filter((f) => f.id !== fileId.id),
                        );
                      }}
                    />
                  ))}
                </div>

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
                                            value={modelId}
                                            key={modelId}
                                            onSelect={() => {
                                              form.setValue("model", modelId);
                                              setIsPopoverOpen(false);
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
                      <input
                        className="hidden"
                        type="file"
                        name="files"
                        multiple
                        id="files"
                        onChange={(e) => {
                          console.log("files", e.target.files);
                          if (e.target.files) {
                            const currentFiles = form.getValues("files") ?? [];
                            if (
                              currentFiles.length + e.target.files.length >
                              3
                            ) {
                              toast.error(
                                "You can only upload 3 files per message",
                              );
                              return;
                            }

                            form.setValue("files", [
                              ...currentFiles,
                              ...Array.from(e.target.files).map((file) => ({
                                id: uuidv7(),
                                file,
                              })),
                            ]);
                          }
                        }}
                      />
                      <Button
                        className="-mb-1.5 inline-flex h-auto items-center justify-center gap-2 rounded-full border border-solid border-secondary-foreground/10 bg-transparent px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        aria-label="Attach files"
                        type="button"
                        disabled={form.watch("files")?.length >= 3}
                        onClick={() => {
                          document.getElementById("files")?.click();
                        }}
                      >
                        <Paperclip className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!form.watch("q")?.trim() || isThreadStreaming}
                    className="border-reflect relative inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg bg-[rgb(162,59,103)] p-2 text-sm font-semibold whitespace-nowrap text-pink-50 shadow transition-colors button-reflect hover:bg-[#d56698] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] dark:bg-primary/20 dark:hover:bg-pink-800/70 dark:active:bg-pink-800/40 disabled:dark:hover:bg-primary/20 disabled:dark:active:bg-primary/20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                    aria-label={
                      !form.watch("q")?.trim()
                        ? "Message requires text"
                        : "Send message"
                    }
                  >
                    <ArrowUp className="!size-5 stroke-pink-50" />
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
