
'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Calendar, Camera, BookOpen, Users, CalendarDays, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import DbStatusIndicator from '@/components/admin/db-status-indicator';
import CloudinaryStatusIndicator from '@/components/admin/cloudinary-status-indicator';
import AdminHeader from '@/components/admin/admin-header';

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
        if (cookieValue) {
            setIsSidebarOpen(cookieValue.split('=')[1] === 'true');
        }
    }
  }, []);

  const handleSetSidebarOpen = (open: boolean) => {
    setIsSidebarOpen(open);
    if (typeof window !== 'undefined') {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${60 * 60 * 24 * 7}`;
    }
  }

  const navItems = [
    { href: '/admin/timings', label: 'Prayer Timings', icon: Calendar },
    { href: '/admin/hadith', label: 'Daily Hadith', icon: BookOpen },
    { href: '/admin/events', label: 'Events', icon: CalendarDays },
    { href: '/admin/sermons', label: 'Sermons', icon: Clapperboard },
    { href: '/admin/media', label: 'Media Manager', icon: Camera },
    { href: '/admin/community', label: 'Community', icon: Users },
  ];

  return (
    <SidebarProvider 
        open={isSidebarOpen} 
        setOpen={handleSetSidebarOpen}
        openMobile={isSheetOpen} 
        setOpenMobile={setSheetOpen}
    >
      <div className="flex min-h-screen w-full">
         <Sidebar>
            <SidebarHeader>
                {/* The logo is now in the AdminHeader component */}
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} onClick={() => setSheetOpen(false)}>
                            <Link href={item.href}>
                                <item.icon />
                                <span className="data-[state=collapsed]:hidden">{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <DbStatusIndicator />
                <CloudinaryStatusIndicator />
            </SidebarFooter>
         </Sidebar>
        <div className="flex flex-col flex-1 w-full">
            <AdminHeader />
            <SidebarInset>{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
