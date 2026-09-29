import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "amber" | "emerald" | "sky" | "rose";
};

const ACCENTS: Record<NonNullable<DashboardCardProps["accent"]>, string> = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  rose: "bg-rose-100 text-rose-700",
};

export function DashboardCard({ label, value, icon: Icon, accent = "amber" }: DashboardCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", ACCENTS[accent])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
          <p className="text-sm text-stone-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
