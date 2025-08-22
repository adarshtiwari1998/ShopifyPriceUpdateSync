import { useQuery } from '@tanstack/react-query';
import { History, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SyncSession } from '@shared/schema';

interface SyncHistoryProps {
  selectedStoreId: string;
}

export default function SyncHistory({ selectedStoreId }: SyncHistoryProps) {
  const { data: sessions = [] } = useQuery<SyncSession[]>({
    queryKey: ['/api/sync/sessions', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'stopped':
        return 'text-amber-600 bg-amber-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <History className="text-gray-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sync History & Reports</h3>
            <p className="text-sm text-gray-500">Previous inventory sync sessions and detailed reports</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-400" size={32} />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Sync History</h4>
            <p className="text-sm text-gray-500 mb-4">Your sync history will appear here after completing sync sessions.</p>
          </div>
        ) : (
          /* History List */
          <div className="space-y-3" data-testid="sync-history-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                data-testid={`session-${session.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <span className="text-sm text-gray-600" data-testid="session-date">
                      {formatDate(session.startedAt || '')}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" data-testid={`button-view-session-${session.id}`}>
                    View Details
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total SKUs:</span>
                    <span className="ml-1 font-medium" data-testid="session-total-skus">
                      {session.totalSkus?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <span className="ml-1 font-medium text-green-600" data-testid="session-updated-skus">
                      {session.updatedSkus?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Not Found:</span>
                    <span className="ml-1 font-medium text-amber-600" data-testid="session-not-found-skus">
                      {session.notFoundSkus?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Errors:</span>
                    <span className="ml-1 font-medium text-red-600" data-testid="session-error-count">
                      {session.errorCount?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
                
                {session.completedAt && (
                  <div className="mt-2 text-xs text-gray-500">
                    Duration: {Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt || '').getTime()) / 1000 / 60)} minutes
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
