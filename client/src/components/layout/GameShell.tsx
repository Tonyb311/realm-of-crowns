import { useState, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { HudBar } from './HudBar';
import { HeroBanner } from './HeroBanner';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import DailyReportView from '../daily-report/DailyReportView';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

interface GameShellProps {
  children: ReactNode;
}

export function GameShell({ children }: GameShellProps) {
  const queryClient = useQueryClient();
  const [showReport, setShowReport] = useState(false);

  // Check for undismissed report on mount
  const { data: reportCheck } = useQuery<{ report: { id: string; dismissed: boolean } | null }>({
    queryKey: ['reports', 'latest'],
    queryFn: async () => {
      const res = await api.get('/reports/latest');
      return res.data;
    },
  });

  // Auto-popup if undismissed report exists
  useEffect(() => {
    if (reportCheck?.report && !reportCheck.report.dismissed) {
      setShowReport(true);
    }
  }, [reportCheck]);

  // Socket listener for new reports
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onReportReady = () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowReport(true);
    };

    socket.on('daily-report:ready', onReportReady);
    return () => { socket.off('daily-report:ready', onReportReady); };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-realm-bg-900">
      <HeroBanner />
      <HudBar />
      <div className="flex">
        <Sidebar className="hidden lg:flex" />
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] pb-16 lg:pb-0 lg:ml-16">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav className="lg:hidden" />

      {/* Daily Report Modal — auto-pops on any page when undismissed */}
      <AnimatePresence>
        {showReport && (
          <DailyReportView
            asModal
            onDismiss={async () => {
              if (reportCheck?.report) {
                try {
                  await api.post(`/reports/${reportCheck.report.id}/dismiss`);
                } catch {
                  // Non-critical
                }
              }
              setShowReport(false);
              queryClient.invalidateQueries({ queryKey: ['reports'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
