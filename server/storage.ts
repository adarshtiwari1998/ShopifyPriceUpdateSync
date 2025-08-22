import { stores, googleSheets, syncSessions, syncLogs, users, type Store, type InsertStore, type GoogleSheet, type InsertGoogleSheet, type SyncSession, type InsertSyncSession, type SyncLog, type InsertSyncLog, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods (keep existing)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store methods
  getStores(): Promise<Store[]>;
  getStore(id: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: string): Promise<void>;
  
  // Google Sheets methods
  getGoogleSheets(storeId?: string): Promise<GoogleSheet[]>;
  getGoogleSheet(id: string): Promise<GoogleSheet | undefined>;
  createGoogleSheet(sheet: InsertGoogleSheet): Promise<GoogleSheet>;
  updateGoogleSheet(id: string, sheet: Partial<InsertGoogleSheet>): Promise<GoogleSheet>;
  deleteGoogleSheet(id: string): Promise<void>;
  
  // Sync Session methods
  getSyncSessions(storeId?: string): Promise<SyncSession[]>;
  getCurrentSyncSession(storeId: string): Promise<SyncSession | undefined>;
  createSyncSession(session: InsertSyncSession): Promise<SyncSession>;
  updateSyncSession(id: string, session: Partial<SyncSession>): Promise<SyncSession>;
  
  // Sync Log methods
  getSyncLogs(sessionId: string, limit?: number): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  getRecentLogs(limit: number): Promise<SyncLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Store methods
  async getStores(): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.isActive, true)).orderBy(stores.name);
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store || undefined;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db
      .insert(stores)
      .values(store)
      .returning();
    return newStore;
  }

  async updateStore(id: string, store: Partial<InsertStore>): Promise<Store> {
    const [updatedStore] = await db
      .update(stores)
      .set(store)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async deleteStore(id: string): Promise<void> {
    await db.update(stores).set({ isActive: false }).where(eq(stores.id, id));
  }

  // Google Sheets methods
  async getGoogleSheets(storeId?: string): Promise<GoogleSheet[]> {
    if (storeId) {
      return await db.select().from(googleSheets)
        .where(and(eq(googleSheets.storeId, storeId), eq(googleSheets.isActive, true)));
    }
    return await db.select().from(googleSheets).where(eq(googleSheets.isActive, true));
  }

  async getGoogleSheet(id: string): Promise<GoogleSheet | undefined> {
    const [sheet] = await db.select().from(googleSheets).where(eq(googleSheets.id, id));
    return sheet || undefined;
  }

  async createGoogleSheet(sheet: InsertGoogleSheet): Promise<GoogleSheet> {
    const [newSheet] = await db
      .insert(googleSheets)
      .values(sheet)
      .returning();
    return newSheet;
  }

  async updateGoogleSheet(id: string, sheet: Partial<InsertGoogleSheet>): Promise<GoogleSheet> {
    const [updatedSheet] = await db
      .update(googleSheets)
      .set(sheet)
      .where(eq(googleSheets.id, id))
      .returning();
    return updatedSheet;
  }

  async deleteGoogleSheet(id: string): Promise<void> {
    await db.update(googleSheets).set({ isActive: false }).where(eq(googleSheets.id, id));
  }

  // Sync Session methods
  async getSyncSessions(storeId?: string): Promise<SyncSession[]> {
    if (storeId) {
      return await db.select().from(syncSessions)
        .where(eq(syncSessions.storeId, storeId))
        .orderBy(desc(syncSessions.startedAt))
        .limit(50);
    }
    return await db.select().from(syncSessions)
      .orderBy(desc(syncSessions.startedAt))
      .limit(50);
  }

  async getCurrentSyncSession(storeId: string): Promise<SyncSession | undefined> {
    const [session] = await db.select().from(syncSessions)
      .where(and(eq(syncSessions.storeId, storeId), eq(syncSessions.status, 'running')))
      .orderBy(desc(syncSessions.startedAt))
      .limit(1);
    return session || undefined;
  }

  async createSyncSession(session: InsertSyncSession): Promise<SyncSession> {
    const [newSession] = await db
      .insert(syncSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateSyncSession(id: string, session: Partial<SyncSession>): Promise<SyncSession> {
    const [updatedSession] = await db
      .update(syncSessions)
      .set(session)
      .where(eq(syncSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Sync Log methods
  async getSyncLogs(sessionId: string, limit: number = 100): Promise<SyncLog[]> {
    return await db.select().from(syncLogs)
      .where(eq(syncLogs.sessionId, sessionId))
      .orderBy(desc(syncLogs.timestamp))
      .limit(limit);
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const [newLog] = await db
      .insert(syncLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getRecentLogs(limit: number = 50): Promise<SyncLog[]> {
    return await db.select().from(syncLogs)
      .orderBy(desc(syncLogs.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
