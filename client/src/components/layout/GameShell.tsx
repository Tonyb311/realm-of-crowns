import type { ReactNode } from 'react';
import { HudBar } from './HudBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface GameShellProps {
  children: ReactNode;
}

export function GameShell({ children }: GameShellProps) {
  return (
    <div className="min-h-screen bg-realm-bg-900">
      <HudBar />
      <div className="flex pt-14 lg:pt-16">
        <Sidebar className="hidden lg:flex" />
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] pb-16 lg:pb-0 lg:ml-16">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav className="lg:hidden" />
    </div>
  );
}
