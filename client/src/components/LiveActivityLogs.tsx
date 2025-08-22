import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SyncLog } from '@shared/schema';

interface LiveActivityLogsProps {
  logs: SyncLog[];
}

export default function LiveActivityLogs({ logs }: LiveActivityLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch recent logs on load
  const { data: recentLogs = [] } = useQuery<SyncLog[]>({
    queryKey: ['/api/sync/logs/recent'],
  });

  // Combine live logs with recent logs (live logs take priority)
  const allLogs = [...logs, ...recentLogs.filter(log => 
    !logs.some(liveLog => liveLog.id === log.id)
  )].slice(0, 50);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-foxx-green" size={16} />;
      case 'not_found':
        return <AlertTriangle className="text-amber-600" size={16} />;
      case 'error':
        return <XCircle className="text-red-600" size={16} />;
      default:
        return <Activity className="text-gray-400" size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded" data-testid={`status-${status}`}>
            <CheckCircle className="inline mr-1" size={12} /> Updated
          </span>
        );
      case 'not_found':
        return (
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded" data-testid={`status-${status}`}>
            not found
          </span>
        );
      case 'error':
        return (
          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded" data-testid={`status-${status}`}>
            error
          </span>
        );
      default:
        return (
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded" data-testid={`status-${status}`}>
            {status}
          </span>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getLogBackgroundColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'not_found':
        return 'bg-amber-50 border-amber-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="text-foxx-blue" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Activity Logs</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-foxx-green rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Live</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-500" data-testid="text-total-logs">
            {allLogs.length} total logs
          </span>
        </div>

        <ScrollArea className="h-96" ref={scrollRef} data-testid="scroll-activity-logs">
          <div className="space-y-2">
            {allLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No activity logs yet</p>
              </div>
            ) : (
              allLogs.map((log, index) => (
                <div
                  key={log.id || index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${getLogBackgroundColor(log.status)}`}
                  data-testid={`log-entry-${log.sku}`}
                >
                  {getStatusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900" data-testid="text-log-sku">
                        {log.sku}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    {log.status === 'success' && log.oldPrice && log.newPrice && (
                      <p className="text-xs text-gray-500 mt-1" data-testid="text-price-change">
                        ${parseFloat(log.oldPrice).toFixed(2)} → ${parseFloat(log.newPrice).toFixed(2)}
                      </p>
                    )}
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 mt-1" data-testid="text-error-message">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500" data-testid="text-log-timestamp">
                    {formatTime(log.timestamp || new Date().toISOString())}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
