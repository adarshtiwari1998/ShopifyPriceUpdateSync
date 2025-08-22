import { useState } from 'react';
import { Plus, FlaskConical, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insertStoreSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Store } from '@shared/schema';

interface HeaderProps {
  stores: Store[];
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
  selectedStore?: Store;
}

export default function Header({ stores, selectedStoreId, onStoreChange, selectedStore }: HeaderProps) {
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertStoreSchema),
    defaultValues: {
      name: '',
      shopifyUrl: '',
      accessToken: '',
    },
  });

  const addStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/stores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      setIsAddStoreOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Store added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add store',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    addStoreMutation.mutate(data);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-foxx-blue rounded-lg flex items-center justify-center">
                <FlaskConical className="text-white" size={16} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Foxx Life Sciences</h1>
                <p className="text-xs text-gray-500">Internal Tools</p>
              </div>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <h2 className="text-sm font-medium text-gray-700">Price Update Variant SKU Tool</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Store Selector */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 block mb-1">Store:</label>
              <Select value={selectedStoreId} onValueChange={onStoreChange}>
                <SelectTrigger className="w-48" data-testid="select-store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedStore && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-foxx-green rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600" data-testid="text-store-status">
                  {selectedStore.name} Ready
                </span>
              </div>
            )}
            
            <Dialog open={isAddStoreOpen} onOpenChange={setIsAddStoreOpen}>
              <DialogTrigger asChild>
                <Button className="bg-foxx-blue hover:bg-blue-700" data-testid="button-add-store">
                  <Plus className="mr-2" size={16} />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Store</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Name</FormLabel>
                          <FormControl>
                            <Input placeholder="LabSafetyShop (LSS)" {...field} data-testid="input-store-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shopifyUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shopify Store URL</FormLabel>
                          <FormControl>
                            <Input placeholder="your-store.myshopify.com" {...field} data-testid="input-shopify-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="shppa_..." {...field} data-testid="input-access-token" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddStoreOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addStoreMutation.isPending} data-testid="button-save-store">
                        {addStoreMutation.isPending ? 'Adding...' : 'Add Store'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
