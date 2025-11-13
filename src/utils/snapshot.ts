import { cloneDeep } from './cache';

export interface Snapshot {
  /** Snapshot identifier */
  id: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Configuration state */
  config: any;
  /** Optional description */
  description?: string;
}

/**
 * Manages configuration snapshots for rollback capability
 */
export class SnapshotManager {
  private snapshots: Map<string, Snapshot>;
  private maxSnapshots: number;
  private history: string[]; // Track snapshot order

  constructor(maxSnapshots: number = 50) {
    this.snapshots = new Map();
    this.maxSnapshots = maxSnapshots;
    this.history = [];
  }

  /**
   * Create a snapshot of the current configuration
   */
  create(id: string, config: any, description?: string): Snapshot {
    // Remove oldest snapshot if limit reached
    if (this.snapshots.size >= this.maxSnapshots) {
      const oldestId = this.history.shift();
      if (oldestId) {
        this.snapshots.delete(oldestId);
      }
    }

    const snapshot: Snapshot = {
      id,
      timestamp: new Date(),
      config: cloneDeep(config),
      description,
    };

    this.snapshots.set(id, snapshot);
    this.history.push(id);

    return snapshot;
  }

  /**
   * Get a snapshot by ID
   */
  get(id: string): Snapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Check if a snapshot exists
   */
  has(id: string): boolean {
    return this.snapshots.has(id);
  }

  /**
   * Delete a snapshot
   */
  delete(id: string): boolean {
    const index = this.history.indexOf(id);
    if (index > -1) {
      this.history.splice(index, 1);
    }
    return this.snapshots.delete(id);
  }

  /**
   * Get all snapshot IDs
   */
  list(): string[] {
    return [...this.history];
  }

  /**
   * Get all snapshots
   */
  getAll(): Snapshot[] {
    return this.history
      .map(id => this.snapshots.get(id))
      .filter((s): s is Snapshot => s !== undefined);
  }

  /**
   * Get the most recent snapshot
   */
  getLatest(): Snapshot | undefined {
    const latestId = this.history[this.history.length - 1];
    return latestId ? this.snapshots.get(latestId) : undefined;
  }

  /**
   * Get snapshot by timestamp
   */
  getByTimestamp(timestamp: Date): Snapshot | undefined {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.timestamp.getTime() === timestamp.getTime()) {
        return snapshot;
      }
    }
    return undefined;
  }

  /**
   * Get snapshots within a time range
   */
  getByTimeRange(start: Date, end: Date): Snapshot[] {
    return this.getAll().filter(
      snapshot =>
        snapshot.timestamp >= start && snapshot.timestamp <= end
    );
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear();
    this.history = [];
  }

  /**
   * Get snapshot count
   */
  size(): number {
    return this.snapshots.size;
  }

  /**
   * Compare two snapshots
   */
  compare(id1: string, id2: string): {
    snapshot1: Snapshot | undefined;
    snapshot2: Snapshot | undefined;
    identical: boolean;
  } {
    const snapshot1 = this.snapshots.get(id1);
    const snapshot2 = this.snapshots.get(id2);

    if (!snapshot1 || !snapshot2) {
      return {
        snapshot1,
        snapshot2,
        identical: false,
      };
    }

    const identical =
      JSON.stringify(snapshot1.config) === JSON.stringify(snapshot2.config);

    return {
      snapshot1,
      snapshot2,
      identical,
    };
  }

  /**
   * Export snapshots to JSON
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import snapshots from JSON
   */
  import(json: string): void {
    try {
      const snapshots = JSON.parse(json) as Snapshot[];
      for (const snapshot of snapshots) {
        // Restore Date objects
        snapshot.timestamp = new Date(snapshot.timestamp);
        this.snapshots.set(snapshot.id, snapshot);
        this.history.push(snapshot.id);
      }
    } catch (error) {
      throw new Error(`Failed to import snapshots: ${error}`);
    }
  }
}
