import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ListChecks,
} from "@/components/ui/icons";

type Step = {
  title: string;
  items: string[];
  highlight?: string;
};

export type TutorialContent = {
  title: string;
  summary: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  outcomes: string[];
  steps: Step[];
  nextActions?: string[];
};

const difficultyBadge = {
  Beginner: "bg-success/10 text-success-foreground",
  Intermediate: "bg-warning/10 text-warning-foreground",
  Advanced: "bg-destructive/10 text-destructive-foreground",
} as const;

export function TutorialLayout({ content }: { content: TutorialContent }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <section className="bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-12">
        <div className="mx-auto max-w-5xl px-6 flex items-center gap-3 text-sm">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
          <span className="opacity-75">/</span>
          <span className="opacity-90">{content.category}</span>
        </div>
        <div className="mx-auto max-w-5xl px-6 pt-4 pb-2">
          <h1 className="text-3xl font-bold mb-3">{content.title}</h1>
          <p className="text-lg opacity-90 max-w-3xl">{content.summary}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
            <span className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full">
              <BookOpen className="w-4 h-4" />
              {content.category}
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full">
              <Clock className="w-4 h-4" />
              {content.duration}
            </span>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${difficultyBadge[content.difficulty]}`}
            >
              <ListChecks className="w-4 h-4" />
              {content.difficulty}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            What you will achieve
          </h2>
          <ul className="grid md:grid-cols-2 gap-3 text-muted-foreground">
            {content.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Steps</h2>
          <div className="space-y-4">
            {content.steps.map((step, index) => (
              <div
                key={step.title}
                className="bg-card border border-border rounded-2xl shadow-sm p-6"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    {step.highlight ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.highlight}
                      </p>
                    ) : null}
                  </div>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  {step.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {content.nextActions && content.nextActions.length ? (
          <section className="bg-primary text-primary-foreground rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Next actions</h2>
            <ul className="space-y-2 text-primary-foreground/90">
              {content.nextActions.map((action) => (
                <li key={action} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
