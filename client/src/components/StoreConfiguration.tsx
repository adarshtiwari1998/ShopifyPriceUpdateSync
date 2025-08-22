import { useState } from 'react';
import { Store, Eye, EyeOff, Plug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Store as StoreType } from '@shared/schema';

interface StoreConfigurationProps {
  selectedStore?: StoreType;
}

export default function StoreConfiguration({ selectedStore }: StoreConfigurationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const response = await apiRequest('POST', `/api/stores/${storeId}/test-connection`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? 'Success' : 'Failed',
        description: data.connected ? 'Connection successful' : 'Connection failed',
        variant: data.connected ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    },
  });

  const handleTestConnection = () => {
    if (selectedStore) {
      testConnectionMutation.mutate(selectedStore.id);
    }
  };

  if (!selectedStore) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No store selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Store className="text-foxx-blue" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Store Configuration</h3>
              <p className="text-sm text-gray-500">Configure Shopify store credentials for API access</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-foxx-blue hover:text-blue-700 text-sm font-medium"
            data-testid="button-toggle-store-config"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
              <div className="flex items-center space-x-2">
                <Store className="text-gray-400" size={16} />
                <span className="text-sm text-gray-900" data-testid="text-store-name">{selectedStore.name}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shopify Store URL</label>
              <div className="flex items-center space-x-2">
                <i className="fas fa-globe text-gray-400"></i>
                <span className="text-sm text-gray-600" data-testid="text-shopify-url">{selectedStore.shopifyUrl}</span>
              </div>
            </div>
          </div>

          {isExpanded && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store Access Token</label>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-key text-gray-400"></i>
                  <span className="text-sm text-gray-600 font-mono flex-1" data-testid="text-access-token">
                    {showToken ? selectedStore.accessToken : '•'.repeat(35)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                    data-testid="button-toggle-token-visibility"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Private app access token with inventory permissions</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600" data-testid="text-connection-status">Connected</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                    data-testid="button-test-connection"
                  >
                    <Plug className="mr-2" size={16} />
                    {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
