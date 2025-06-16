import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { uuidv7 } from "uuidv7";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import type { AvailableModel } from "~/models/models";
import { AttachedFilesList } from "./attached-files-list";
import { FileUploadButton } from "./file-upload-button";
import { ModelSelector } from "./model-selector";
import { chatFormSchema, type ChatMessage } from "./thread";

type ChatInputProps = {
  threadId: string;
  onSubmit: (data: ChatMessage) => void;
  isStreaming: boolean;
  isSubmitting: boolean;
  defaultModel: AvailableModel;
};

export function ChatInput({
  threadId,
  onSubmit,
  isStreaming,
  defaultModel,
}: ChatInputProps) {
  const questionEl = useRef<HTMLTextAreaElement>(null);
  const formEl = useRef<HTMLFormElement>(null);
  const [newUserMessage] = useState(uuidv7());

  const form = useForm({
    resolver: valibotResolver(chatFormSchema),
    defaultValues: {
      q: "",
      model: defaultModel,
      files: [],
    },
  });

  const uploadedFiles = form.watch("files");
  const q = form.watch("q");

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

  const handleRemoveFile = (fileId: string) => {
    form.setValue(
      "files",
      form.getValues("files")?.filter((f) => f.id !== fileId),
    );
  };

  useEffect(() => {
    if (questionEl.current) {
      questionEl.current.focus();
    }
  }, [threadId]);

  return (
    <div className="sticky bottom-0 flex-shrink-0 bg-chat-background backdrop-blur-lg">
      <div className="mx-auto max-w-3xl">
        <Form {...form}>
          <form
            ref={formEl}
            onSubmit={form.handleSubmit(handleSubmit)}
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
                        if (!(e.key === "Enter" && !e.shiftKey)) return;
                        e.preventDefault();
                        formEl.current?.requestSubmit();
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <AttachedFilesList
              files={uploadedFiles}
              messageId={newUserMessage}
              onRemoveFile={handleRemoveFile}
            />

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
                  <FileUploadButton
                    onFilesSelected={handleFilesSelected}
                    disabled={uploadedFiles?.length >= 3}
                    maxFiles={3}
                    currentFileCount={uploadedFiles?.length || 0}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!form.formState.isValid || isStreaming}
                className="border-reflect relative inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg bg-[rgb(162,59,103)] p-2 text-sm font-semibold whitespace-nowrap text-pink-50 shadow transition-colors button-reflect hover:bg-[#d56698] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:bg-[rgb(162,59,103)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[rgb(162,59,103)] disabled:active:bg-[rgb(162,59,103)] dark:bg-primary/20 dark:hover:bg-pink-800/70 dark:active:bg-pink-800/40 disabled:dark:hover:bg-primary/20 disabled:dark:active:bg-primary/20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                aria-label={
                  !q?.trim() ? "Message requires text" : "Send message"
                }
              >
                <ArrowUp className="!size-5 stroke-pink-50" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
