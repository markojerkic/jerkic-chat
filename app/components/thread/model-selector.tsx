import { Check, ChevronDown } from "lucide-react";
import React, { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useModel, useModels } from "~/hooks/use-models";
import { cn } from "~/lib/utils";
import type { Model } from "~/server/llm/models";

type ModelSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const models = useModels();
  const selectedModel = useModel(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative -mb-2 inline-flex h-8 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          type="button"
          role="combobox"
          aria-expanded={isOpen}
        >
          <ModelIcon model={selectedModel?.slug} />
          <div className="text-left text-sm font-medium">
            {value ? selectedModel?.short_name : "Select Model"}
          </div>
          <ChevronDown
            className={cn(
              "right-0 size-4 transition-transform duration-200 ease-in-out",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {models.map((model: Model) => (
                <CommandItem
                  value={model.slug}
                  key={model.slug}
                  title={model.name}
                  onSelect={() => {
                    onChange(model.slug);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ModelIcon model={model.slug} />
                    <span>{model.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto",
                      model.slug === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ModelIcon({
  model,
  ...prop
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  model: string | undefined;
}) {
  if (!model) {
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  }

  let modelProvider = model.split("/")[0];
  if (modelProvider === "x-ai") {
    modelProvider = "xai";
  }

  return (
    <img
      {...prop}
      src={`https://models.dev/logos/${modelProvider}.svg`}
      alt={model}
      className="h-4 w-4 rounded-full"
    />
  );
}
