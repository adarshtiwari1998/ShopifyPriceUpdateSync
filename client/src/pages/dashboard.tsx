import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import StoreConfiguration from '@/components/StoreConfiguration';
import GoogleSheetsConfiguration from '@/components/GoogleSheetsConfiguration';
import SyncDashboard from '@/components/SyncDashboard';
import LiveActivityLogs from '@/components/LiveActivityLogs';
import SyncHistory from '@/components/SyncHistory';
import SheetPreview from '@/components/SheetPreview';
import { useWebSocket, type WebSocketMessage } from '@/hooks/useWebSocket';
import type { Store, SyncLog } from '@shared/schema';

export default function Dashboard() {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [liveLogs, setLiveLogs] = useState<SyncLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Fetch stores
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'sync_log':
        setLiveLogs(prev => [message.log, ...prev.slice(0, 49)]);
        break;
      case 'sync_progress':
        setSyncStatus(message);
        break;
      case 'sync_complete':
      case 'sync_error':
        setSyncStatus(null);
        break;
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  // Set default store if none selected
  if (!selectedStoreId && stores.length > 0) {
    setSelectedStoreId(stores[0].id);
  }

  const selectedStore = stores.find(store => store.id === selectedStoreId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        stores={stores}
        selectedStoreId={selectedStoreId}
        onStoreChange={setSelectedStoreId}
        selectedStore={selectedStore}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Price Update Variant SKU Automation</h1>
          <p className="text-gray-600 mt-1">Automate price updates between Google Sheets and Shopify stores</p>
        </div>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StoreConfiguration selectedStore={selectedStore} />
          <GoogleSheetsConfiguration selectedStoreId={selectedStoreId} />
        </div>

        {/* Sync Dashboard */}
        <SyncDashboard 
          selectedStoreId={selectedStoreId}
          syncStatus={syncStatus}
        />

        {/* Live Activity and History */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2">
            <LiveActivityLogs logs={liveLogs} />
          </div>
          <SyncHistory selectedStoreId={selectedStoreId} />
        </div>

        {/* Sheet Preview */}
        <SheetPreview 
          selectedStoreId={selectedStoreId} 
          liveLogs={liveLogs}
          syncStatus={syncStatus}
        />
      </div>
    </div>
  );
}
