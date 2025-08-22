import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Shield, ChevronDown, ChevronUp, CheckCircle, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const [step, setStep] = useState<'credentials' | 'sheet'>('credentials');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
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
      serviceAccountJson: '',
    },
  });

  const addSheetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/sheets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets'] });
      setIsAddSheetOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Google Sheet added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Add sheet mutation error:', error);
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
    console.log('Form data received:', data);
    console.log('Service account JSON:', serviceAccountJson);
    
    const submitData = {
      storeId: selectedStoreId,
      sheetId: data.sheetId,
      sheetName: data.sheetName || 'Sheet1',
      serviceAccountJson,
    };
    console.log('Submitting sheet data:', submitData);
    addSheetMutation.mutate(submitData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed.type === 'service_account') {
            setServiceAccountJson(content);
            setStep('sheet');
            toast({
              title: 'Success',
              description: 'Service account credentials loaded successfully',
            });
          } else {
            toast({
              title: 'Error',
              description: 'Invalid service account JSON file',
              variant: 'destructive',
            });
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to parse JSON file',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const resetForm = () => {
    setStep('credentials');
    setServiceAccountJson('');
    form.reset({ storeId: selectedStoreId, sheetId: '', sheetName: 'Sheet1', serviceAccountJson: '' });
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
        {primarySheet?.serviceAccountJson ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="text-foxx-green" size={16} />
              <span className="text-sm font-medium text-green-800">Service Account Active</span>
            </div>
            <p className="text-xs text-green-600 mt-1" data-testid="text-service-account">
              {JSON.parse(primarySheet.serviceAccountJson).client_email}
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="text-amber-600" size={16} />
              <span className="text-sm font-medium text-amber-800">Service Account Required</span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Upload Google Service Account JSON to access sheets
            </p>
          </div>
        )}

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
            <div className="space-y-6">
              {/* Step 1: Upload Service Account JSON */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Upload Service Account JSON</h4>
                
                {serviceAccountJson ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-foxx-green" size={16} />
                      <span className="text-sm font-medium text-green-800">Service Account Loaded</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {JSON.parse(serviceAccountJson).client_email}
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Upload Google Service Account JSON</p>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="service-account-upload-inline"
                        data-testid="input-service-account-file"
                      />
                      <label htmlFor="service-account-upload-inline">
                        <Button type="button" variant="outline" className="cursor-pointer" asChild>
                          <span>Choose File</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Configure Sheet Details */}
              {serviceAccountJson && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Configure Google Sheet</h4>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sheetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sheet ID</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-sheet-id" />
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
                            <FormLabel>Sheet Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Sheet1" {...field} data-testid="input-sheet-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Reset
                        </Button>
                        <Button type="submit" disabled={addSheetMutation.isPending} data-testid="button-save-sheet" className="bg-foxx-green hover:bg-green-700">
                          {addSheetMutation.isPending ? 'Adding...' : 'Add Sheet'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
