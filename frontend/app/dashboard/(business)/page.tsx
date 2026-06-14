import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { loadDashboardOverview } from "@/lib/dashboard/server-dashboard";

export default async function DashboardPage() {
  const data = await loadDashboardOverview();
  return <DashboardOverview data={data} />;
}
