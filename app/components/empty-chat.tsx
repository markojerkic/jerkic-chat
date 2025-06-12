import { Code, GraduationCap, Newspaper, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { Route } from "../routes/+types/layout";

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
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/layout");
  const [selectedCategory, setSelectedCategory] =
    useState<keyof CategorySuggestions>("any");

  const currentSuggestions = suggestions[selectedCategory];

  return (
    <div className="w-full animate-in space-y-6 px-2 pt-[calc(max(15vh,2.5rem))] duration-300 fade-in-50 zoom-in-95 sm:px-8">
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
                  ? "bg-primary text-primary-foreground outline-1 outline-secondary/70 hover:bg-pink-600/90" // Styles for selected state
                  : "bg-secondary/30 text-secondary-foreground/90 outline hover:bg-secondary" // Styles for unselected state
              }`}
              onClick={() => setSelectedCategory(category.key)}
            >
              <IconComponent
                className={`lucide lucide-${category.key} max-sm:block`}
                size={16}
              />
              <div>{category.name}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col text-foreground">
        {currentSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none"
          >
            <button className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3">
              <span>{suggestion}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
