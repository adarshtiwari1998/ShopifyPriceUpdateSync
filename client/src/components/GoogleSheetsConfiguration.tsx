import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Shield, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertGoogleSheetSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { GoogleSheet } from '@shared/schema';

interface GoogleSheetsConfigurationProps {
  selectedStoreId: string;
}

export default function GoogleSheetsConfiguration({ selectedStoreId }: GoogleSheetsConfigurationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: ['/api/sheets', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const primarySheet = sheets.find(sheet => sheet.storeId === selectedStoreId);

  const form = useForm({
    resolver: zodResolver(insertGoogleSheetSchema),
    defaultValues: {
      storeId: selectedStoreId,
      sheetId: '',
      sheetName: 'Sheet1',
    },
  });

  const addSheetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/sheets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets'] });
      setIsAddSheetOpen(false);
      form.reset({ storeId: selectedStoreId, sheetId: '', sheetName: 'Sheet1' });
      toast({
        title: 'Success',
        description: 'Google Sheet added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add Google Sheet',
        variant: 'destructive',
      });
    },
  });

  const testAccessMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const response = await apiRequest('POST', `/api/sheets/${sheetId}/test-access`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.accessible ? 'Success' : 'Failed',
        description: data.accessible ? 'Sheet is accessible' : 'Sheet access failed',
        variant: data.accessible ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to test sheet access',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    addSheetMutation.mutate(data);
  };

  const handleTestAccess = () => {
    if (primarySheet) {
      testAccessMutation.mutate(primarySheet.id);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Table className="text-foxx-green" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Google Sheets Configuration</h3>
              <p className="text-sm text-gray-500">Configure Google Sheets API credentials and sheet access</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-foxx-blue hover:text-blue-700 text-sm font-medium"
            data-testid="button-toggle-sheets-config"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {/* Service Account Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-foxx-green" size={16} />
            <span className="text-sm font-medium text-green-800">Service Account Active</span>
          </div>
          <p className="text-xs text-green-600 mt-1" data-testid="text-service-account">
            shopifyinventoryautomationsheets-global-automation-1.iam.gserviceaccount.com
          </p>
        </div>

        {/* Sheet Configuration */}
        <div className="space-y-4">
          {primarySheet ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sheet ID</label>
                <div className="flex items-center space-x-2">
                  <Table className="text-gray-400" size={16} />
                  <span className="text-sm text-gray-600 font-mono" data-testid="text-sheet-id">
                    {primarySheet.sheetId}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Google Sheets document ID from the URL</p>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="text-blue-600" size={16} />
                      <span className="text-sm font-medium text-blue-800" data-testid="text-sheet-status">Sheet Accessible</span>
                    </div>
                    <p className="text-xs text-blue-600">Ready for sync</p>
                  </div>
                  <div className="text-right">
                    <Button
                      className="bg-foxx-green hover:bg-green-700"
                      onClick={handleTestAccess}
                      disabled={testAccessMutation.isPending}
                      data-testid="button-verify-access"
                    >
                      <Shield className="mr-2" size={16} />
                      {testAccessMutation.isPending ? 'Testing...' : 'Verify Access'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No Google Sheet configured</p>
              <Dialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-foxx-green hover:bg-green-700" data-testid="button-add-sheet">
                    Add Google Sheet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Google Sheet</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sheetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sheet ID</FormLabel>
                            <FormControl>
                              <Input placeholder="1KzGBkHn7xYGLaVSKqZSEUVReAHEcSkzfWRPfqjhN-4" {...field} data-testid="input-sheet-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sheetName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sheet Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Sheet1" {...field} data-testid="input-sheet-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddSheetOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addSheetMutation.isPending} data-testid="button-save-sheet">
                          {addSheetMutation.isPending ? 'Adding...' : 'Add Sheet'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
