"use client";

import { useState } from "react";

import { Menu } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function DashboardMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            aria-label="Buka menu dashboard"
            className="lg:hidden"
            size="icon"
            variant="outline"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle className="sr-only">Menu dashboard</SheetTitle>
          <SheetDescription className="sr-only">
            Navigasi pengelolaan bisnis.
          </SheetDescription>
          <Brand />
        </SheetHeader>
        <div className="px-4">
          <DashboardNavigation onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
