import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Brand";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About UniConnect" },
      { name: "description", content: "UniConnect connects students, faculty and local vendors in one campus marketplace." },
      { property: "og:title", content: "About UniConnect" },
      { property: "og:description", content: "UniConnect connects students, faculty and local vendors in one campus marketplace." },
    ],
  }),
  component: () => (
    <AppShell header="tabs">
      <div className="p-6">
        <Logo className="h-16 w-16" />
        <h1 className="mt-4 text-2xl font-extrabold">About UniConnect</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          UniConnect is a campus marketplace where students, faculty and local vendors buy, sell and connect. From textbooks
          and calculators to lab gear and hoodies, everything is listed by people on your campus — priced in Rand, picked up
          between lectures or delivered to your res.
        </p>
        <div className="mt-6 rounded-2xl bg-navy p-5 text-navy-foreground">
          <p className="text-lg font-bold">Buy. Sell. Connect. Together.</p>
        </div>
      </div>
    </AppShell>
  ),
});
