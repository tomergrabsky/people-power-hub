import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-background h-screen">
          <header className="flex md:hidden h-14 shrink-0 items-center justify-between border-b px-4 bg-background z-10 sticky top-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-semibold text-sm">ניהול עובדים</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
