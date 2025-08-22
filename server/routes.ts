import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { syncService } from "./services/syncService";
import { ShopifyService } from "./services/shopify";
import { GoogleSheetsService } from "./services/googleSheets";
import { insertStoreSchema, insertGoogleSheetSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    syncService.addWebSocketClient(ws);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Store routes
  app.get('/api/stores', async (req, res) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  });

  app.post('/api/stores', async (req, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(storeData);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: 'Invalid store data' });
    }
  });

  app.put('/api/stores/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const storeData = insertStoreSchema.partial().parse(req.body);
      const store = await storage.updateStore(id, storeData);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update store' });
    }
  });

  app.delete('/api/stores/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStore(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete store' });
    }
  });

  // Test Shopify connection
  app.post('/api/stores/:id/test-connection', async (req, res) => {
    try {
      const { id } = req.params;
      const store = await storage.getStore(id);
      
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const shopify = new ShopifyService(store.shopifyUrl, store.accessToken);
      const isConnected = await shopify.testConnection();
      
      res.json({ connected: isConnected });
    } catch (error) {
      res.status(500).json({ error: 'Connection test failed' });
    }
  });

  // Google Sheets routes
  app.get('/api/sheets', async (req, res) => {
    try {
      const { storeId } = req.query;
      const sheets = await storage.getGoogleSheets(storeId as string);
      res.json(sheets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sheets' });
    }
  });

  app.post('/api/sheets', async (req, res) => {
    try {
      const sheetData = insertGoogleSheetSchema.parse(req.body);
      const sheet = await storage.createGoogleSheet(sheetData);
      res.json(sheet);
    } catch (error) {
      res.status(400).json({ error: 'Invalid sheet data' });
    }
  });

  // Test Google Sheets access
  app.post('/api/sheets/:id/test-access', async (req, res) => {
    try {
      const { id } = req.params;
      const sheet = await storage.getGoogleSheet(id);
      
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' });
      }

      const googleSheets = new GoogleSheetsService();
      const hasAccess = await googleSheets.testAccess(sheet.sheetId);
      
      res.json({ accessible: hasAccess });
    } catch (error) {
      res.status(500).json({ error: 'Access test failed' });
    }
  });

  // Get sheet preview data
  app.get('/api/sheets/:id/preview', async (req, res) => {
    try {
      const { id } = req.params;
      const sheet = await storage.getGoogleSheet(id);
      
      if (!sheet) {
        return res.status(404).json({ error: 'Sheet not found' });
      }

      const googleSheets = new GoogleSheetsService();
      const data = await googleSheets.getSheetData(sheet.sheetId, sheet.sheetName);
      
      // Return first 10 rows for preview
      res.json(data.slice(0, 10));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sheet preview' });
    }
  });

  // Sync routes
  app.post('/api/sync/start', async (req, res) => {
    try {
      const { storeId, sheetId } = req.body;
      
      if (!storeId || !sheetId) {
        return res.status(400).json({ error: 'Store ID and Sheet ID are required' });
      }

      const sessionId = await syncService.startSync(storeId, sheetId);
      res.json({ sessionId });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to start sync' });
    }
  });

  app.post('/api/sync/stop', async (req, res) => {
    try {
      const { storeId } = req.body;
      
      if (!storeId) {
        return res.status(400).json({ error: 'Store ID is required' });
      }

      await syncService.stopSync(storeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop sync' });
    }
  });

  app.get('/api/sync/status/:storeId', async (req, res) => {
    try {
      const { storeId } = req.params;
      const status = await syncService.getSyncStatus(storeId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sync status' });
    }
  });

  // Sync history routes
  app.get('/api/sync/sessions', async (req, res) => {
    try {
      const { storeId } = req.query;
      const sessions = await storage.getSyncSessions(storeId as string);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sync sessions' });
    }
  });

  app.get('/api/sync/logs/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit } = req.query;
      const logs = await storage.getSyncLogs(sessionId, limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sync logs' });
    }
  });

  // Recent logs for live activity
  app.get('/api/sync/logs/recent', async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getRecentLogs(limit ? parseInt(limit as string) : 50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recent logs' });
    }
  });

  return httpServer;
}
