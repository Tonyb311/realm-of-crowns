import { Newspaper } from 'lucide-react';
import ReportHistoryPanel from '../components/daily-report/ReportHistoryPanel';
import { PageHeader } from '../components/ui/realm-index';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Reports"
        icon={<Newspaper className="w-5 h-5 text-realm-gold-400" />}
      />
      <ReportHistoryPanel />
    </div>
  );
}
