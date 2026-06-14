import {
  CircleHelp,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Settings,
  Users,
} from "lucide-react";

export const publicNavigation = [
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/#fitur", label: "Fitur" },
  { href: "/demo-chat", label: "Demo chatbot" },
] as const;

export const dashboardNavigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Ringkasan" },
  { href: "/dashboard/products", icon: Package, label: "Produk" },
  { href: "/dashboard/faqs", icon: CircleHelp, label: "FAQ" },
  { href: "/dashboard/leads", icon: Users, label: "Lead" },
  {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Pengaturan",
  },
  { href: "/demo-chat", icon: MessageSquareText, label: "Preview chatbot" },
] as const;
