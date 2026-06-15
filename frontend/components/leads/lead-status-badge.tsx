import { Badge } from "@/components/ui/badge";
import { leadStatusLabel } from "@/lib/leads/display";
import type { LeadStatus } from "@/types/lead";

const variants: Record<
  LeadStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  contacted: "outline",
  qualified: "default",
  closed: "secondary",
  lost: "destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={variants[status]}>{leadStatusLabel(status)}</Badge>;
}
