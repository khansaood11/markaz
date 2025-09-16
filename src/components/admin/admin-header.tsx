
'use client';
import { Logo } from "@/components/logo";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />
      <div className="flex-1">
        <Logo />
      </div>
    </header>
  )
}
