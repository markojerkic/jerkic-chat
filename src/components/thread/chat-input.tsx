import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { FormProvider, useForm, type SubmitHandler } from "react-hook-form";
import { uuidv7 } from "uuidv7";
import * as v from "valibot";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import { SuggestedMessageEvent } from "~/lib/events";
import { chatMessageSchema } from "~/server/llm.functions";
import { sendMessage } from "~/server/llm.server";
import { AttachedFilesList } from "./attached-files-list";
import { FileUploadButton } from "./file-upload-button";
import { ModelSelector } from "./model-selector";
import { SubmitMessageButton } from "./submit-message-button";

type ChatInputProps = {
  threadId: string;
  defaultModel: string;
};
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
export type ChatMessage = v.InferOutput<typeof chatFormSchema>;

export function ChatInput({ threadId, defaultModel }: ChatInputProps) {
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);

  const sendMessageFn = useServerFn(sendMessage);
  const sendMessageMutation = useMutation({
    mutationKey: ["message", threadId],
    mutationFn: sendMessageFn,
  });

  const form = useForm({
    resolver: valibotResolver(chatFormSchema),
    defaultValues: {
      q: "",
      model: defaultModel,
      files: [],
    },
  });

  useEffect(() => {
    form.setValue("model", defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    const suggestedMessageEvent: EventListener = (event) => {
      if (!(event instanceof SuggestedMessageEvent)) {
        console.error("Unexpected event type:", event);
        return;
      }
      form.setValue("q", event.message);
      form.handleSubmit(handleSubmit)();
    };

    document.addEventListener("suggested-message", suggestedMessageEvent);

    return () => {
      document.removeEventListener("suggested-message", suggestedMessageEvent);
    };
  }, []);

  const handleSubmit: SubmitHandler<ChatMessage> = (data) => {
    onSubmit(data);
    form.setValue("q", "");
    form.setValue("files", []);
  };

  const handleFilesSelected = (newFiles: File[]) => {
    const currentFiles = form.getValues("files") ?? [];
    form.setValue("files", [
      ...currentFiles,
      ...newFiles.map((file) => ({ id: uuidv7(), file })),
    ]);
  };

  useEffect(() => {
    if (questionEl.current) {
      questionEl.current.focus();
    }
  }, [threadId]);

  return (
    <FormProvider {...form}>
      <div className="bg-chat-background sticky bottom-0 flex-shrink-0 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl">
          <Form {...form}>
            <form
              ref={formEl}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="bg-chat-overaly border-chat-border/60 rounded-t-[20px] border-8 p-1"
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
                        className="text-foreground placeholder:text-secondary-foreground/70 max-h-[50vh] w-full resize-none border-none px-4 py-3 shadow-none focus:outline-none focus-visible:ring-0"
                        rows={3}
                        placeholder="Type your message..."
                        autoComplete="off"
                        required
                        onKeyDown={(e) => {
                          if (!(e.key === "Enter" && !e.shiftKey)) return;
                          e.preventDefault();
                          formEl.current?.requestSubmit();
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <AttachedFilesList />

              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex flex-col gap-2 pr-2 sm:flex-row sm:items-center">
                  <div className="ml-[-7px] flex items-center gap-1">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <ModelSelector
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FileUploadButton onFilesSelected={handleFilesSelected} />
                  </div>
                </div>
                <SubmitMessageButton threadId={threadId} />
              </div>
            </form>
          </Form>
        </div>
      </div>
    </FormProvider>
  );
}
