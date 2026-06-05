import { AppLayout } from "@/components/AppLayout";
import { Send, Users, FileText, Mailbox, Activity } from "lucide-react";
import Link from "next/link";
import { fetchDashboardStats } from "@/app/actions/admin-actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Stats = { campaigns: number; leads: number; templates: number; senders: number; events: number };

const cards = [
  { key: "campaigns" as const, label: "Campaigns", icon: Send, path: "/campaigns" },
  { key: "leads" as const, label: "Leads", icon: Users, path: "/leads" },
  { key: "templates" as const, label: "Templates", icon: FileText, path: "/templates" },
  { key: "senders" as const, label: "Senders", icon: Mailbox, path: "/senders" },
  { key: "events" as const, label: "Events", icon: Activity, path: "/events" },
];

export default async function Dashboard() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("postfork_user_id")?.value;
  if (!userId) {
    redirect("/");
  }

  const stats = await fetchDashboardStats(userId);

  return (
    <AppLayout>
      <div className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Overview of your outreach.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c) => (
            <Link
              key={c.key}
              href={c.path}
              className="border border-border rounded-md p-4 bg-card hover:border-primary/40 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold tracking-tight">{stats[c.key]}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{c.label}</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Empty workspace — start by adding a sender account, then create a template and a campaign.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
