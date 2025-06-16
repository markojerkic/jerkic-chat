import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
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
import { cn } from "~/lib/utils";
import {
  MODEL_IDS,
  ModelIcon,
  MODELS,
  type AvailableModel,
} from "~/models/models";

type ModelSelectorProps = {
  value: AvailableModel;
  onChange: (value: string) => void;
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative -mb-2 inline-flex h-8 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          type="button"
          role="combobox"
          aria-expanded={isOpen}
        >
          <ModelIcon model={value} />
          <div className="text-left text-sm font-medium">
            {value ? MODELS[value]?.name || value : "Select Model"}
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
              {MODEL_IDS.map((modelId) => (
                <CommandItem
                  value={modelId}
                  key={modelId}
                  onSelect={() => {
                    onChange(modelId);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ModelIcon model={modelId} />
                    <span>{MODELS[modelId]?.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto",
                      modelId === value ? "opacity-100" : "opacity-0",
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
