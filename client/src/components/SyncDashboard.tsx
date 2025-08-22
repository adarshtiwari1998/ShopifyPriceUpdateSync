import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Square, Fan, Play, Box, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { GoogleSheet } from '@shared/schema';

interface SyncDashboardProps {
  selectedStoreId: string;
  syncStatus?: any;
}

export default function SyncDashboard({ selectedStoreId, syncStatus }: SyncDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: ['/api/sheets', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const { data: currentStatus } = useQuery({
    queryKey: ['/api/sync/status', selectedStoreId],
    queryFn: async () => {
      const response = await fetch(`/api/sync/status/${selectedStoreId}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    enabled: !!selectedStoreId,
    refetchInterval: 2000, // Always refetch to keep status updated
  });

  const primarySheet = sheets.find(sheet => sheet.storeId === selectedStoreId);

  // Get SKU count from Google Sheet
  const { data: sheetSkuCount } = useQuery({
    queryKey: ['/api/sheets', primarySheet?.id, 'count'],
    enabled: !!primarySheet?.id,
    refetchInterval: false,
  });

  const status = syncStatus || currentStatus;
  // Use sheet SKU count if no sync is running, otherwise use sync status
  const totalSkus = status?.totalSkus || sheetSkuCount?.totalSkus || 0;

  const startSyncMutation = useMutation({
    mutationFn: async () => {
      if (!primarySheet) throw new Error('No sheet configured');
      return apiRequest('POST', '/api/sync/start', {
        storeId: selectedStoreId,
        sheetId: primarySheet.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status', selectedStoreId] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/sessions', { storeId: selectedStoreId }] });
      toast({
        title: 'Success',
        description: 'Sync started successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start sync',
        variant: 'destructive',
      });
    },
  });

  const stopSyncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/sync/stop', { storeId: selectedStoreId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status', selectedStoreId] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/sessions', { storeId: selectedStoreId }] });
      toast({
        title: 'Success',
        description: 'Sync stopped successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to stop sync',
        variant: 'destructive',
      });
    },
  });

  const handleStartSync = () => {
    startSyncMutation.mutate();
  };

  const handleStopSync = () => {
    stopSyncMutation.mutate();
  };

  const clearSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/sync/clear', { storeId: selectedStoreId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status', selectedStoreId] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/sessions', { storeId: selectedStoreId }] });
      toast({
        title: 'Success',
        description: 'Session cleared successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to clear session',
        variant: 'destructive',
      });
    },
  });

  const handleClearSession = () => {
    clearSessionMutation.mutate();
  };

  const progressPercentage = status && status.totalSkus > 0 
    ? Math.round((status.processedSkus / status.totalSkus) * 100)
    : 0;

  const isRunning = (status?.status === 'running' || status?.type === 'sync_progress') || startSyncMutation.isPending;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="text-purple-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Price Sync Dashboard</h3>
              <p className="text-sm text-gray-500">Monitor sync progress and manage operations</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {isRunning ? (
              <Button
                variant="destructive"
                onClick={handleStopSync}
                disabled={stopSyncMutation.isPending}
                data-testid="button-stop-sync"
              >
                <Square className="mr-2" size={16} />
                {stopSyncMutation.isPending ? 'Stopping...' : 'Stop Sync'}
              </Button>
            ) : (
              <Button
                className="bg-foxx-blue hover:bg-blue-700"
                onClick={handleStartSync}
                disabled={startSyncMutation.isPending || !primarySheet}
                data-testid="button-start-sync"
              >
                <Play className="mr-2" size={16} />
                {startSyncMutation.isPending ? 'Starting...' : 'Start Sync'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleClearSession}
              disabled={clearSessionMutation.isPending}
              data-testid="button-clear-logs"
            >
              <Fan className="mr-2" size={16} />
              {clearSessionMutation.isPending ? 'Clearing...' : 'Clear'}
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total SKUs</p>
                <p className="text-2xl font-bold text-blue-900" data-testid="metric-total-skus">
                  {totalSkus.toLocaleString()}
                </p>
              </div>
              <Box className="text-blue-600" size={24} />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Updated</p>
                <p className="text-2xl font-bold text-green-900" data-testid="metric-updated">
                  {status?.updatedSkus?.toLocaleString() || '0'}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Not Found</p>
                <p className="text-2xl font-bold text-red-900" data-testid="metric-not-found">
                  {status?.notFoundSkus?.toLocaleString() || '0'}
                </p>
              </div>
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">Pending</p>
                <p className="text-2xl font-bold text-amber-900" data-testid="metric-pending">
                  {status ? (status.totalSkus - status.processedSkus).toLocaleString() : '0'}
                </p>
              </div>
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Sync Progress</span>
            <span className="text-sm text-gray-500" data-testid="text-progress-percentage">
              {progressPercentage}% Complete
            </span>
          </div>
          
          <Progress value={progressPercentage} className="h-2" data-testid="progress-sync" />
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span data-testid="text-sync-status">
              {isRunning ? 'Syncing...' : status ? 'Completed' : 'Ready to sync'}
            </span>
            <span data-testid="text-sync-detail">
              {status ? `${status.processedSkus} of ${status.totalSkus} processed` : 'Waiting to start'}
            </span>
          </div>
        </div>

        {/* Currently Processing */}
        {isRunning && status?.currentSku && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-foxx-blue rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Currently Processing</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded" data-testid="text-current-sku">
                SKU: {status.currentSku}
              </span>
              <span className="text-xs text-foxx-blue bg-blue-100 px-2 py-1 rounded" data-testid="text-processing-status">
                In Progress
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
