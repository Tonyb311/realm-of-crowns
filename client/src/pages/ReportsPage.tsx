import { Newspaper } from 'lucide-react';
import ReportHistoryPanel from '../components/daily-report/ReportHistoryPanel';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Newspaper className="w-5 h-5 text-realm-gold-400" />
        <h1 className="font-display text-xl text-realm-gold-400">Daily Reports</h1>
      </div>
      <ReportHistoryPanel />
    </div>
  );
}
