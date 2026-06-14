import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/api/auth/logout" method="post">
      <Button
        aria-label={compact ? "Keluar dari dashboard" : undefined}
        className={compact ? undefined : "w-full"}
        size={compact ? "icon" : "default"}
        type="submit"
        variant="outline"
      >
        <LogOut aria-hidden="true" />
        {compact ? null : "Keluar"}
      </Button>
    </form>
  );
}
