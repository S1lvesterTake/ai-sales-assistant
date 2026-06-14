"use client";

import { useState } from "react";

import Link from "next/link";

import { Menu } from "lucide-react";

import { publicNavigation } from "@/components/layout/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            aria-label="Buka navigasi"
            className="md:hidden"
            size="icon"
            variant="outline"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Navigasi</SheetTitle>
          <SheetDescription>
            Jelajahi produk atau buka pengalaman demo.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Navigasi seluler" className="flex flex-col gap-1 px-4">
          {publicNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 border-t p-4">
          <Link
            href="/demo-chat"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants(), "w-full")}
          >
            Coba demo
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full",
            )}
          >
            Masuk dashboard
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
