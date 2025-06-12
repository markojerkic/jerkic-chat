import { Code, GraduationCap, Newspaper, Sparkles } from "lucide-react";

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

export function EmptyChat() {
  return (
    <div className="w-full animate-in space-y-6 px-2 pt-[calc(max(15vh,2.5rem))] duration-300 fade-in-50 zoom-in-95 sm:px-8">
      <h2 className="text-3xl font-semibold">How can I help you, Marko?</h2>
      <div className="flex flex-row flex-wrap gap-2.5 text-sm max-sm:justify-evenly">
        <button
          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-primary px-5 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow outline-1 outline-secondary/70 backdrop-blur-xl transition-colors hover:bg-pink-600/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary data-[selected=false]:bg-secondary/30 data-[selected=false]:text-secondary-foreground/90 data-[selected=false]:outline data-[selected=false]:hover:bg-secondary max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          data-selected="false"
        >
          <Sparkles className="lucide lucide-sparkles max-sm:block" size={16} />
          <div>Create</div>
        </button>
        <button
          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-primary px-5 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow outline-1 outline-secondary/70 backdrop-blur-xl transition-colors hover:bg-pink-600/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary data-[selected=false]:bg-secondary/30 data-[selected=false]:text-secondary-foreground/90 data-[selected=false]:outline data-[selected=false]:hover:bg-secondary max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          data-selected="false"
        >
          <Newspaper
            className="lucide lucide-newspaper max-sm:block"
            size={16}
          />
          <div>Explore</div>
        </button>
        <button
          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-primary px-5 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow outline-1 outline-secondary/70 backdrop-blur-xl transition-colors hover:bg-pink-600/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary data-[selected=false]:bg-secondary/30 data-[selected=false]:text-secondary-foreground/90 data-[selected=false]:outline data-[selected=false]:hover:bg-secondary max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          data-selected="false"
        >
          <Code className="lucide lucide-code max-sm:block" size={16} />
          <div>Code</div>
        </button>
        <button
          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-primary px-5 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow outline-1 outline-secondary/70 backdrop-blur-xl transition-colors hover:bg-pink-600/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary data-[selected=false]:bg-secondary/30 data-[selected=false]:text-secondary-foreground/90 data-[selected=false]:outline data-[selected=false]:hover:bg-secondary max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          data-selected="false"
        >
          <GraduationCap
            className="lucide lucide-graduation-cap max-sm:block"
            size={16}
          />
          <div>Learn</div>
        </button>
      </div>
      <div className="flex flex-col text-foreground">
        <div className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none">
          <button className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3">
            <span>How does AI work?</span>
          </button>
        </div>
        <div className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none">
          <button className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3">
            <span>Are black holes real?</span>
          </button>
        </div>
        <div className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none">
          <button className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3">
            <span>How many Rs are in the word "strawberry"?</span>
          </button>
        </div>
        <div className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none">
          <button className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3">
            <span>What is the meaning of life?</span>
          </button>
        </div>
      </div>
    </div>
  );
}
