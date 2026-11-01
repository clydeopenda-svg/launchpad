import type { PollStatus } from "@/types";

export interface SeedPoll {
  question: string;
  status: PollStatus;
  showResults: boolean;
  options: string[];
}

export const seedPolls: SeedPoll[] = [
  {
    question: "Which session are you most excited about today?",
    status: "open",
    showResults: true,
    options: ["Opening keynote", "Funding panel", "Design workshop", "Startup pitch showcase"],
  },
  {
    question: "What stage is your product or idea at?",
    status: "open",
    showResults: true,
    options: ["Just an idea", "Building a prototype", "Launched with first users", "Growing and scaling"],
  },
  {
    question: "Which startup pitch impressed you the most?",
    status: "open",
    showResults: false, // results hidden until the organizer announces winners
    options: ["Kijani Ventures", "Tandem Robotics", "Savanna Health", "Uplift Education"],
  },
  {
    question: "How did you hear about LaunchPad Summit?",
    status: "closed",
    showResults: true,
    options: ["Social media", "A friend or colleague", "Email newsletter", "My company"],
  },
];
