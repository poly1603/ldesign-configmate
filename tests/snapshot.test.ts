import { describe, it, expect, beforeEach } from 'vitest';
import { SnapshotManager } from '../src/utils/snapshot';

describe('SnapshotManager', () => {
  let manager: SnapshotManager;
  const testConfig1 = { server: { port: 3000 }, database: { host: 'localhost' } };
  const testConfig2 = { server: { port: 8080 }, database: { host: 'prod-db' } };

  beforeEach(() => {
    manager = new SnapshotManager(5);
  });

  describe('create', () => {
    it('should create a snapshot', () => {
      const snapshot = manager.create('test1', testConfig1, 'Test snapshot');
      
      expect(snapshot.id).toBe('test1');
      expect(snapshot.config).toEqual(testConfig1);
      expect(snapshot.description).toBe('Test snapshot');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should deep clone the config', () => {
      const snapshot = manager.create('test1', testConfig1);
      
      expect(snapshot.config).toEqual(testConfig1);
      expect(snapshot.config).not.toBe(testConfig1);
    });

    it('should respect max snapshots limit', () => {
      for (let i = 1; i <= 10; i++) {
        manager.create(`snapshot${i}`, { value: i });
      }
      
      expect(manager.size()).toBe(5);
      expect(manager.has('snapshot1')).toBe(false); // First 5 should be evicted
      expect(manager.has('snapshot6')).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve a snapshot by ID', () => {
      manager.create('test1', testConfig1);
      const snapshot = manager.get('test1');
      
      expect(snapshot).toBeDefined();
      expect(snapshot?.config).toEqual(testConfig1);
    });

    it('should return undefined for non-existent snapshots', () => {
      const snapshot = manager.get('nonexistent');
      expect(snapshot).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should check if snapshot exists', () => {
      manager.create('test1', testConfig1);
      
      expect(manager.has('test1')).toBe(true);
      expect(manager.has('test2')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a snapshot', () => {
      manager.create('test1', testConfig1);
      
      expect(manager.has('test1')).toBe(true);
      const deleted = manager.delete('test1');
      
      expect(deleted).toBe(true);
      expect(manager.has('test1')).toBe(false);
    });

    it('should return false for non-existent snapshot', () => {
      const deleted = manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all snapshot IDs', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      const ids = manager.list();
      expect(ids).toContain('test1');
      expect(ids).toContain('test2');
      expect(ids.length).toBe(2);
    });

    it('should return empty array when no snapshots', () => {
      const ids = manager.list();
      expect(ids).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all snapshots', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      const snapshots = manager.getAll();
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].id).toBe('test1');
      expect(snapshots[1].id).toBe('test2');
    });
  });

  describe('getLatest', () => {
    it('should return the most recent snapshot', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      const latest = manager.getLatest();
      expect(latest?.id).toBe('test2');
    });

    it('should return undefined when no snapshots', () => {
      const latest = manager.getLatest();
      expect(latest).toBeUndefined();
    });
  });

  describe('getByTimeRange', () => {
    it('should filter snapshots by time range', async () => {
      const start = new Date();
      
      manager.create('test1', testConfig1);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const middle = new Date();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      manager.create('test2', testConfig2);
      
      const end = new Date();
      
      const rangeAll = manager.getByTimeRange(start, end);
      expect(rangeAll.length).toBe(2);
      
      const rangeFirst = manager.getByTimeRange(start, middle);
      expect(rangeFirst.length).toBe(1);
      expect(rangeFirst[0].id).toBe('test1');
    });
  });

  describe('clear', () => {
    it('should clear all snapshots', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      expect(manager.size()).toBe(2);
      manager.clear();
      expect(manager.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return the number of snapshots', () => {
      expect(manager.size()).toBe(0);
      
      manager.create('test1', testConfig1);
      expect(manager.size()).toBe(1);
      
      manager.create('test2', testConfig2);
      expect(manager.size()).toBe(2);
    });
  });

  describe('compare', () => {
    it('should compare two snapshots', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      const comparison = manager.compare('test1', 'test2');
      
      expect(comparison.snapshot1?.id).toBe('test1');
      expect(comparison.snapshot2?.id).toBe('test2');
      expect(comparison.identical).toBe(false);
    });

    it('should detect identical snapshots', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig1); // Same config
      
      const comparison = manager.compare('test1', 'test2');
      expect(comparison.identical).toBe(true);
    });

    it('should handle non-existent snapshots', () => {
      manager.create('test1', testConfig1);
      
      const comparison = manager.compare('test1', 'nonexistent');
      expect(comparison.snapshot1).toBeDefined();
      expect(comparison.snapshot2).toBeUndefined();
      expect(comparison.identical).toBe(false);
    });
  });

  describe('export and import', () => {
    it('should export snapshots to JSON', () => {
      manager.create('test1', testConfig1);
      manager.create('test2', testConfig2);
      
      const exported = manager.export();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('test1');
    });

    it('should import snapshots from JSON', () => {
      manager.create('test1', testConfig1);
      const exported = manager.export();
      
      const newManager = new SnapshotManager();
      newManager.import(exported);
      
      expect(newManager.size()).toBe(1);
      expect(newManager.has('test1')).toBe(true);
      
      const imported = newManager.get('test1');
      expect(imported?.config).toEqual(testConfig1);
    });

    it('should restore Date objects on import', () => {
      const snapshot = manager.create('test1', testConfig1);
      const exported = manager.export();
      
      const newManager = new SnapshotManager();
      newManager.import(exported);
      
      const imported = newManager.get('test1');
      expect(imported?.timestamp).toBeInstanceOf(Date);
      expect(imported?.timestamp.getTime()).toBe(snapshot.timestamp.getTime());
    });
  });
});
