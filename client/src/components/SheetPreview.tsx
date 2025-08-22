import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GoogleSheet } from '@shared/schema';

interface SheetPreviewProps {
  selectedStoreId: string;
}

interface SheetRowData {
  sku: string;
  variantPrice: number;
  compareAtPrice: number;
  row: number;
}

export default function SheetPreview({ selectedStoreId }: SheetPreviewProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: sheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: ['/api/sheets', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const primarySheet = sheets.find(sheet => sheet.storeId === selectedStoreId);

  const { data: previewData = [], isLoading, refetch } = useQuery<SheetRowData[]>({
    queryKey: [`/api/sheets/${primarySheet?.id}/preview`],
    enabled: !!primarySheet,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
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
              <h3 className="text-lg font-semibold text-gray-900">Google Sheets Preview</h3>
              <p className="text-sm text-gray-500">Sample data from connected spreadsheet</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || !primarySheet}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={16} />
            Refresh
          </Button>
        </div>

        {!primarySheet ? (
          <div className="text-center py-8">
            <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No Google Sheet configured</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading sheet data...</p>
          </div>
        ) : previewData.length === 0 ? (
          <div className="text-center py-8">
            <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No data found in sheet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" data-testid="sheet-preview-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKUs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                    Variant Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-amber-50">
                    Variant Compare At Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index} data-testid={`sheet-row-${row.sku}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid="cell-sku">
                      {row.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-blue-50" data-testid="cell-variant-price">
                      ${row.variantPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-amber-50" data-testid="cell-compare-price">
                      ${row.compareAtPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
