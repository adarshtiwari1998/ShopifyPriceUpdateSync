import { google } from 'googleapis';

export interface SheetRowData {
  sku: string;
  variantPrice: number;
  compareAtPrice: number;
  row: number;
}

interface GoogleSheetsQueueItem {
  operation: 'get' | 'update';
  sheetId: string;
  range: string;
  values?: any[][];
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class GoogleSheetsService {
  private sheets: any;
  private requestQueue: GoogleSheetsQueueItem[] = [];
  private isProcessingQueue = false;
  private queueDelay = 500; // 500ms between Google Sheets requests

  constructor(serviceAccountJson?: string) {
    let credentials;
    
    if (serviceAccountJson) {
      // Use provided service account JSON
      credentials = JSON.parse(serviceAccountJson);
    } else {
      // Fallback to environment credentials
      credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift()!;
      
      try {
        // Add delay between requests (queue system)
        await new Promise(resolve => setTimeout(resolve, this.queueDelay));
        
        let result;
        if (item.operation === 'get') {
          result = await this.sheets.spreadsheets.values.get({
            spreadsheetId: item.sheetId,
            range: item.range,
          });
        } else if (item.operation === 'update') {
          result = await this.sheets.spreadsheets.values.update({
            spreadsheetId: item.sheetId,
            range: item.range,
            valueInputOption: 'RAW',
            requestBody: {
              values: item.values
            }
          });
        }
        
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async queueRequest(operation: 'get' | 'update', sheetId: string, range: string, values?: any[][]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        operation,
        sheetId,
        range,
        values,
        resolve,
        reject
      });

      // Start processing queue
      this.processQueue();
    });
  }

  async testAccess(sheetId: string): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      return true;
    } catch (error) {
      console.error('Google Sheets access test failed:', error);
      return false;
    }
  }

  async getSheetData(sheetId: string, sheetName: string = 'Sheet1'): Promise<SheetRowData[]> {
    try {
      // Get all data from the sheet using queue
      const response = await this.queueRequest('get', sheetId, `${sheetName}!A:D`);

      const rows = response.data.values || [];
      const data: SheetRowData[] = [];

      // Skip header row and process data
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        if (row.length >= 3 && row[0]) { // SKU must exist
          const sku = row[0].toString().trim();
          const variantPrice = parseFloat(row[1]?.toString().replace(/[$,]/g, '') || '0');
          const compareAtPrice = parseFloat(row[2]?.toString().replace(/[$,]/g, '') || '0');

          if (sku && variantPrice > 0) {
            data.push({
              sku,
              variantPrice,
              compareAtPrice,
              row: i + 1, // 1-based row number
            });
          }
        }
      }

      return data;
    } catch (error) {
      console.error(`Error reading sheet ${sheetId}:`, error);
      throw error;
    }
  }

  async updateSheetHeader(sheetId: string, sheetName: string = 'Sheet1'): Promise<void> {
    try {
      // Check if D1 already has "ID" header using queue
      const headerResponse = await this.queueRequest('get', sheetId, `${sheetName}!D1`);

      const headerValue = headerResponse.data.values?.[0]?.[0];
      if (headerValue !== 'ID') {
        // Add ID header to D1 using queue
        await this.queueRequest('update', sheetId, `${sheetName}!D1`, [['ID']]);
        console.log('Added ID header to column D');
      }
    } catch (error) {
      console.error('Error updating sheet header:', error);
      throw new Error('Failed to update sheet header');
    }
  }

  async updateVariantId(sheetId: string, sheetName: string, rowIndex: number, variantId: string): Promise<void> {
    try {
      // Use queue system for updating variant ID
      await this.queueRequest('update', sheetId, `${sheetName}!D${rowIndex}`, [[variantId]]);
    } catch (error) {
      console.error(`Error updating variant ID for row ${rowIndex}:`, error);
      // Don't throw error - continue sync even if ID update fails
    }
  }

  async updateSheetStatus(sheetId: string, sku: string, status: string, sheetName: string = 'Sheet1'): Promise<void> {
    try {
      // This would require write permissions - for now just log
      console.log(`Would update ${sku} status to ${status} in sheet ${sheetId}`);
    } catch (error) {
      console.error(`Error updating sheet status for ${sku}:`, error);
    }
  }
}
