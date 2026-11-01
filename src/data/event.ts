import type { EventInfo } from "@/types";

// Fictional event used for the demo. The AI assistant also reads this
// so it can answer attendee questions accurately.
export const eventInfo: EventInfo = {
  name: "LaunchPad Summit 2026",
  tagline: "Where early-stage ideas meet the people who build them.",
  date: "Saturday, 14 November 2026",
  venue: "Riverside Innovation Hall",
  address: "12 Harbour Road, Riverside District",
  checkinOpens: "8:00 AM",
  wifi: { network: "LaunchPad-Guest", password: "liftoff2026" },
  agenda: [
    { time: "8:00 AM", title: "Registration & check-in", location: "Main Lobby" },
    { time: "9:00 AM", title: "Opening keynote: Building for the next billion users", speaker: "Dr. Amara Osei", location: "Main Hall" },
    { time: "10:00 AM", title: "Panel: Funding your first product", speaker: "Grace Wanjiru, Tomás Herrera, Priya Nair", location: "Main Hall" },
    { time: "11:00 AM", title: "Coffee break & networking", location: "Atrium" },
    { time: "11:30 AM", title: "Workshop: Designing products people love", speaker: "Lena Fischer", location: "Studio B" },
    { time: "12:30 PM", title: "Lunch", location: "Atrium" },
    { time: "1:30 PM", title: "Startup pitch showcase", location: "Main Hall" },
    { time: "3:00 PM", title: "Fireside chat: Lessons from scaling a team", speaker: "Daniel Mwangi", location: "Main Hall" },
    { time: "4:00 PM", title: "Awards & closing remarks", location: "Main Hall" },
    { time: "4:30 PM", title: "Networking reception", location: "Rooftop Terrace" },
  ],
  faqs: [
    { question: "How do I check in?", answer: "Show your check-in code (sent by email, format LP-XXXX) to an usher at the Main Lobby desk." },
    { question: "How do I vote in a live poll?", answer: "Open the Attendee page, enter your check-in code, pick an answer and tap Submit. You must be checked in first, and you can vote once per poll." },
    { question: "Can I change my vote?", answer: "No. Each attendee gets one vote per poll, and votes are final once submitted." },
    { question: "Is food provided?", answer: "Yes. Coffee and snacks are available all day, and lunch is served in the Atrium at 12:30 PM. Vegetarian and vegan options are available." },
    { question: "Where is parking?", answer: "Free parking is available in the Harbour Road car park next to the venue." },
    { question: "Is the venue accessible?", answer: "Yes. All rooms are step-free and there are accessible restrooms on every floor." },
    { question: "I lost my check-in code. What should I do?", answer: "Visit the check-in desk. An usher can find you by name or organization." },
  ],
};
