import { storage } from '../storage';
import { ShopifyService } from './shopify';
import { GoogleSheetsService } from './googleSheets';
import { WebSocket } from 'ws';

export interface SyncProgress {
  sessionId: string;
  storeId: string;
  totalSkus: number;
  processedSkus: number;
  updatedSkus: number;
  notFoundSkus: number;
  errorCount: number;
  currentSku?: string;
  status: string;
}

export class SyncService {
  private activeSyncs = new Map<string, boolean>();
  private websocketClients = new Set<WebSocket>();

  addWebSocketClient(ws: WebSocket) {
    this.websocketClients.add(ws);
    ws.on('close', () => {
      this.websocketClients.delete(ws);
    });
  }

  private broadcastUpdate(data: any) {
    const message = JSON.stringify(data);
    this.websocketClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  async startSync(storeId: string, sheetId: string): Promise<string> {
    // Check if sync already running for this store
    if (this.activeSyncs.get(storeId)) {
      throw new Error('Sync already running for this store');
    }

    // Get store and sheet configuration
    const store = await storage.getStore(storeId);
    const sheet = await storage.getGoogleSheet(sheetId);

    if (!store || !sheet) {
      throw new Error('Store or sheet not found');
    }

    // Create sync session
    const session = await storage.createSyncSession({
      storeId,
      sheetId,
      status: 'running',
    });

    // Mark sync as active
    this.activeSyncs.set(storeId, true);

    // Start sync process asynchronously
    this.performSync(session.id, store, sheet).catch(error => {
      console.error('Sync error:', error);
    });

    return session.id;
  }

  async stopSync(storeId: string): Promise<void> {
    this.activeSyncs.set(storeId, false);
    
    // Update any running sessions to stopped
    const currentSession = await storage.getCurrentSyncSession(storeId);
    if (currentSession) {
      await storage.updateSyncSession(currentSession.id, {
        status: 'stopped',
        completedAt: new Date(),
      });
    }
  }

  async clearSession(storeId: string): Promise<void> {
    // Stop any active sync
    this.activeSyncs.set(storeId, false);
    
    // Mark any running session as stopped so it goes to history
    const currentSession = await storage.getCurrentSyncSession(storeId);
    if (currentSession) {
      await storage.updateSyncSession(currentSession.id, {
        status: 'stopped',
        completedAt: new Date(),
      });
    }

    // Broadcast clear update
    this.broadcastUpdate({
      type: 'sync_complete',
      storeId,
    });
  }

  private async performSync(sessionId: string, store: any, sheet: any): Promise<void> {
    const shopify = new ShopifyService(store.shopifyUrl, store.accessToken);
    const googleSheets = new GoogleSheetsService(sheet.serviceAccountJson || undefined);

    try {
      // Add ID header to sheet if not present
      await googleSheets.updateSheetHeader(sheet.sheetId, sheet.sheetName);
      
      // Get sheet data
      const sheetData = await googleSheets.getSheetData(sheet.sheetId, sheet.sheetName);
      
      // Update session with total count
      await storage.updateSyncSession(sessionId, {
        totalSkus: sheetData.length,
      });

      let processedCount = 0;
      let updatedCount = 0;
      let notFoundCount = 0;
      let errorCount = 0;

      // Process each SKU
      for (const row of sheetData) {
        // Check if sync should stop
        if (!this.activeSyncs.get(store.id)) {
          break;
        }

        try {
          // Broadcast current processing status
          this.broadcastUpdate({
            type: 'sync_progress',
            sessionId,
            storeId: store.id,
            currentSku: row.sku,
            processedSkus: processedCount,
            totalSkus: sheetData.length,
          });

          // Find variant in Shopify
          const variant = await shopify.findVariantBySku(row.sku);
          
          if (!variant) {
            // Log not found
            await storage.createSyncLog({
              sessionId,
              sku: row.sku,
              status: 'not_found',
              newPrice: row.variantPrice.toString(),
              newComparePrice: row.compareAtPrice?.toString(),
            });

            notFoundCount++;

            this.broadcastUpdate({
              type: 'sync_log',
              log: {
                sku: row.sku,
                status: 'not_found',
                timestamp: new Date().toISOString(),
              }
            });
          } else {
            // Update prices
            const oldPrice = parseFloat(variant.price);
            const oldComparePrice = variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined;

            await shopify.updateVariantPrice(
              variant.id,
              row.variantPrice,
              row.compareAtPrice
            );

            // Log success
            await storage.createSyncLog({
              sessionId,
              sku: row.sku,
              status: 'success',
              oldPrice: oldPrice.toString(),
              newPrice: row.variantPrice.toString(),
              oldComparePrice: oldComparePrice?.toString(),
              newComparePrice: row.compareAtPrice?.toString(),
              shopifyVariantId: variant.id,
            });

            // Update variant ID in Google Sheets
            await googleSheets.updateVariantId(sheet.sheetId, sheet.sheetName, row.row, variant.id);

            updatedCount++;

            this.broadcastUpdate({
              type: 'sync_log',
              log: {
                sku: row.sku,
                status: 'success',
                oldPrice: oldPrice,
                newPrice: row.variantPrice,
                timestamp: new Date().toISOString(),
              }
            });
          }
        } catch (error) {
          console.error(`Error processing SKU ${row.sku}:`, error);
          
          // Log error
          await storage.createSyncLog({
            sessionId,
            sku: row.sku,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            newPrice: row.variantPrice.toString(),
            newComparePrice: row.compareAtPrice?.toString(),
          });

          errorCount++;

          this.broadcastUpdate({
            type: 'sync_log',
            log: {
              sku: row.sku,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }
          });
        }

        processedCount++;

        // Update session progress
        await storage.updateSyncSession(sessionId, {
          processedSkus: processedCount,
          updatedSkus: updatedCount,
          notFoundSkus: notFoundCount,
          errorCount,
        });

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Complete sync
      await storage.updateSyncSession(sessionId, {
        status: this.activeSyncs.get(store.id) ? 'completed' : 'stopped',
        completedAt: new Date(),
      });

      this.broadcastUpdate({
        type: 'sync_complete',
        sessionId,
        storeId: store.id,
      });

    } catch (error) {
      console.error('Sync failed:', error);
      
      // Mark session as failed
      await storage.updateSyncSession(sessionId, {
        status: 'failed',
        completedAt: new Date(),
      });

      this.broadcastUpdate({
        type: 'sync_error',
        sessionId,
        storeId: store.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Remove from active syncs
      this.activeSyncs.delete(store.id);
    }
  }

  async getSyncStatus(storeId: string): Promise<SyncProgress | null> {
    const session = await storage.getCurrentSyncSession(storeId);
    if (!session) return null;

    return {
      sessionId: session.id,
      storeId: session.storeId,
      totalSkus: session.totalSkus || 0,
      processedSkus: session.processedSkus || 0,
      updatedSkus: session.updatedSkus || 0,
      notFoundSkus: session.notFoundSkus || 0,
      errorCount: session.errorCount || 0,
      status: session.status,
    };
  }
}

export const syncService = new SyncService();
