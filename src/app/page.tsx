import Link from "next/link";
import { Card } from "@/components/ui";
import { eventInfo } from "@/data/event";

const sections = [
  { href: "/usher", title: "Usher check-in", description: "Find guests by name, organization or code and check them in." },
  { href: "/attendee", title: "Live polls", description: "Enter your check-in code to vote and see results." },
  { href: "/organizer", title: "Organizer dashboard", description: "Live attendance and poll results." },
  { href: "/assistant", title: "AI assistant", description: "Ask questions about the event, agenda and polls." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-sm font-medium text-muted">{eventInfo.date} · {eventInfo.venue}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{eventInfo.name}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">{eventInfo.tagline}</p>
      </section>

      <section aria-label="Choose a section" className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Card className="h-full transition group-hover:border-primary">
              <h2 className="font-semibold">{section.title} →</h2>
              <p className="mt-1 text-sm text-muted">{section.description}</p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
