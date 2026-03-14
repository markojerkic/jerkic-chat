import { getRouteApi } from "@tanstack/react-router";
import { Code, GraduationCap, Newspaper, Sparkles } from "lucide-react";
import { useState } from "react";
import { SuggestedMessageEvent } from "~/lib/events";
import { cn } from "~/lib/utils";

// Access loader data from the authenticated layout route
const authenticatedRoute = getRouteApi("/_authenticated");

type CategorySuggestions = Record<string, string[]>;

const suggestions: CategorySuggestions = {
  any: [
    "What's the weather like today?",
    "Tell me a fun fact.",
    "What's new in the world of AI?",
    "Can you recommend a good book?",
    "How do I make a perfect cup of coffee?",
  ],
  create: [
    "Help me brainstorm ideas for a new app.",
    "Write a short story about a talking cat.",
    "Generate a catchy slogan for a sustainable fashion brand.",
    "Give me prompts for a landscape painting.",
    "Compose a simple melody for a lullaby.",
  ],
  explore: [
    "What are the top 5 tourist attractions in Paris?",
    "Tell me about the deepest part of the ocean.",
    "What's the history of the internet?",
    "Describe the Amazon rainforest ecosystem.",
    "Where can I find information about ancient civilizations?",
  ],
  code: [
    "Explain the concept of recursion in Python.",
    "How do I set up a React project with TypeScript?",
    "Write a JavaScript function to reverse a string.",
    "What are the best practices for writing clean code?",
    "Debug this SQL query for me: SELECT * FROM users WHERE age > 30;",
  ],
  learn: [
    "Explain quantum physics in simple terms.",
    "What are the main theories of economics?",
    "How does photosynthesis work?",
    "Teach me about the Roman Empire.",
    "What is the difference between a planet and a star?",
  ],
};

const categories = [
  { name: "Create", icon: Sparkles, key: "create" },
  { name: "Explore", icon: Newspaper, key: "explore" },
  { name: "Code", icon: Code, key: "code" },
  { name: "Learn", icon: GraduationCap, key: "learn" },
];

// Base classes common to all category buttons
const baseButtonClasses =
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 flex h-9 items-center justify-center gap-1 rounded-xl px-5 py-2 text-sm font-semibold whitespace-nowrap shadow backdrop-blur-xl transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full";

export function EmptyChat() {
  const loaderData = authenticatedRoute.useLoaderData();
  const [selectedCategory, setSelectedCategory] =
    useState<keyof CategorySuggestions>("any");

  const currentSuggestions = suggestions[selectedCategory];

  return (
    <div className="animate-in fade-in-50 zoom-in-95 w-full space-y-6 px-2 pt-[calc(max(15vh,2.5rem))] duration-300 sm:px-8">
      <h2 className="text-3xl font-semibold">
        How can I help you, {loaderData?.user.username ?? "new user"}?
      </h2>
      <div className="flex flex-row flex-wrap gap-2.5 text-sm max-sm:justify-evenly">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key;
          const IconComponent = category.icon; // The Lucide icon component

          return (
            <button
              key={category.key}
              className={`${baseButtonClasses} ${
                isSelected
                  ? "bg-primary outline-secondary/70 *:text-pink-50! outline-1 hover:bg-pink-600/90" // Styles for selected state
                  : "bg-secondary/30 text-secondary-foreground/90 hover:bg-secondary outline" // Styles for unselected state
              }`}
              onClick={() => setSelectedCategory(category.key)}
            >
              <IconComponent
                className={cn(
                  `lucide lucide-${category.key} max-sm:block`,
                  isSelected && "stroke-pink-50",
                )}
                size={16}
              />
              <div>{category.name}</div>
            </button>
          );
        })}
      </div>
      <div className="text-foreground flex flex-col">
        {currentSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="border-secondary/40 flex items-start gap-2 border-t py-1 first:border-none"
          >
            <button
              className="text-secondary-foreground hover:bg-secondary/50 w-full rounded-md py-2 text-left sm:px-3"
              onClick={() => {
                document.dispatchEvent(new SuggestedMessageEvent(suggestion));
              }}
            >
              <span>{suggestion}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
