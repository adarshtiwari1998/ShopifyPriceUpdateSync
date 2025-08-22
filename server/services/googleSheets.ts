import { google } from 'googleapis';

export interface SheetRowData {
  sku: string;
  variantPrice: number;
  compareAtPrice: number;
  row: number;
}

export class GoogleSheetsService {
  private sheets: any;

  constructor() {
    // Initialize with service account credentials from environment
    const credentials = {
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

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
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
      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:C`, // Assuming A=SKU, B=Variant Price, C=Compare At Price
      });

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

  async updateSheetStatus(sheetId: string, sku: string, status: string, sheetName: string = 'Sheet1'): Promise<void> {
    try {
      // This would require write permissions - for now just log
      console.log(`Would update ${sku} status to ${status} in sheet ${sheetId}`);
    } catch (error) {
      console.error(`Error updating sheet status for ${sku}:`, error);
    }
  }
}
