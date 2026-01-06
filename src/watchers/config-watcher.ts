/**
 * ConfigWatcher - File watching module for configuration files
 * Handles file system events and debounces rapid changes
 */

import chokidar, { type FSWatcher } from 'chokidar';
const { watch } = chokidar;

/** Chokidar watch options */
interface ChokidarWatchOptions {
  persistent?: boolean;
  ignoreInitial?: boolean;
  awaitWriteFinish?: {
    stabilityThreshold?: number;
    pollInterval?: number;
  } | boolean;
  usePolling?: boolean;
  ignored?: string | string[] | ((path: string) => boolean);
}
import { EventEmitter } from 'eventemitter3';
import { debounce } from '../utils/function-utils';
import { WatcherError } from '../errors';
import { DEFAULT_OPTIONS } from '../constants';

/**
 * Watcher event types
 */
export interface WatcherEvents {
  change: (filePath: string) => void;
  add: (filePath: string) => void;
  unlink: (filePath: string) => void;
  error: (error: Error) => void;
  ready: () => void;
}

/**
 * Watcher options
 */
export interface ConfigWatcherOptions {
  /** Paths to watch */
  paths: string[];

  /** Debounce delay in milliseconds */
  debounceDelay?: number;

  /** Chokidar stability threshold */
  stabilityThreshold?: number;

  /** Chokidar poll interval */
  pollInterval?: number;

  /** Use polling (for network drives) */
  usePolling?: boolean;

  /** Ignore dotfiles */
  ignoreDotFiles?: boolean;

  /** Custom ignore patterns */
  ignorePatterns?: string[];

  /** Enable persistent watching */
  persistent?: boolean;
}

/**
 * ConfigWatcher class - handles file watching with debouncing
 */
export class ConfigWatcher extends EventEmitter<WatcherEvents> {
  private watcher: FSWatcher | null = null;
  private paths: string[];
  private options: Required<Omit<ConfigWatcherOptions, 'paths'>>;
  private isWatching = false;
  private debouncedHandlers: Map<string, ReturnType<typeof debounce>> = new Map();

  constructor(options: ConfigWatcherOptions) {
    super();
    this.paths = options.paths;
    this.options = {
      debounceDelay: options.debounceDelay ?? DEFAULT_OPTIONS.WATCHER.DEBOUNCE_DELAY,
      stabilityThreshold:
        options.stabilityThreshold ?? DEFAULT_OPTIONS.WATCHER.STABILITY_THRESHOLD,
      pollInterval: options.pollInterval ?? DEFAULT_OPTIONS.WATCHER.POLL_INTERVAL,
      usePolling: options.usePolling ?? false,
      ignoreDotFiles: options.ignoreDotFiles ?? true,
      ignorePatterns: options.ignorePatterns ?? [],
      persistent: options.persistent ?? true,
    };
  }

  /**
   * Start watching files
   */
  start(): void {
    if (this.isWatching) {
      return;
    }

    if (this.paths.length === 0) {
      return;
    }

    try {
      const watchOptions: ChokidarWatchOptions = {
        persistent: this.options.persistent,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: this.options.stabilityThreshold,
          pollInterval: this.options.pollInterval,
        },
        usePolling: this.options.usePolling,
        ignored: this.buildIgnorePattern(),
      };

      this.watcher = watch(this.paths, watchOptions);
      this.setupEventHandlers();
      this.isWatching = true;
    } catch (error) {
      throw new WatcherError(
        `Failed to start watcher: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    try {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      this.cleanupDebouncedHandlers();
    } catch (error) {
      throw new WatcherError(
        `Failed to stop watcher: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Add paths to watch
   */
  addPaths(paths: string[]): void {
    if (!this.watcher) {
      this.paths.push(...paths);
      return;
    }

    for (const path of paths) {
      if (!this.paths.includes(path)) {
        this.paths.push(path);
        this.watcher.add(path);
      }
    }
  }

  /**
   * Remove paths from watching
   */
  removePaths(paths: string[]): void {
    if (!this.watcher) {
      this.paths = this.paths.filter((p) => !paths.includes(p));
      return;
    }

    for (const path of paths) {
      const index = this.paths.indexOf(path);
      if (index > -1) {
        this.paths.splice(index, 1);
        this.watcher.unwatch(path);
        // Clean up debounced handler for this path
        const handler = this.debouncedHandlers.get(path);
        if (handler && 'cancel' in handler) {
          (handler as { cancel: () => void }).cancel();
        }
        this.debouncedHandlers.delete(path);
      }
    }
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    return [...this.paths];
  }

  /**
   * Check if watcher is active
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Setup event handlers for watcher
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on('change', (filePath) => {
      this.handleChange(filePath as string);
    });

    this.watcher.on('add', (filePath) => {
      this.emit('add', filePath as string);
    });

    this.watcher.on('unlink', (filePath) => {
      this.emit('unlink', filePath as string);
      // Clean up debounced handler
      const handler = this.debouncedHandlers.get(filePath as string);
      if (handler && 'cancel' in handler) {
        (handler as { cancel: () => void }).cancel();
      }
      this.debouncedHandlers.delete(filePath as string);
    });

    this.watcher.on('error', (error) => {
      this.emit(
        'error',
        error instanceof Error ? error : new Error(String(error))
      );
    });

    this.watcher.on('ready', () => {
      this.emit('ready');
    });
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(filePath: string): void {
    if (this.options.debounceDelay > 0) {
      let handler = this.debouncedHandlers.get(filePath);

      if (!handler) {
        handler = debounce(() => {
          this.emit('change', filePath);
        }, this.options.debounceDelay);
        this.debouncedHandlers.set(filePath, handler);
      }

      handler();
    } else {
      this.emit('change', filePath);
    }
  }

  /**
   * Build ignore pattern for chokidar
   */
  private buildIgnorePattern(): string[] | ((path: string) => boolean) {
    const patterns: string[] = [...this.options.ignorePatterns];

    if (this.options.ignoreDotFiles) {
      patterns.push('**/.*'); // Ignore dotfiles
    }

    // Always ignore node_modules and common build directories
    patterns.push('**/node_modules/**');
    patterns.push('**/dist/**');
    patterns.push('**/.git/**');

    return patterns as unknown as string[];
  }

  /**
   * Cleanup debounced handlers
   */
  private cleanupDebouncedHandlers(): void {
    for (const handler of this.debouncedHandlers.values()) {
      if (handler && 'cancel' in handler) {
        (handler as { cancel: () => void }).cancel();
      }
    }
    this.debouncedHandlers.clear();
  }

  /**
   * Restart watcher with new paths
   */
  async restart(paths?: string[]): Promise<void> {
    await this.stop();

    if (paths) {
      this.paths = paths;
    }

    this.start();
  }

  /**
   * Get watcher stats
   */
  getStats(): {
    isWatching: boolean;
    watchedPathsCount: number;
    activeDebouncedHandlers: number;
  } {
    return {
      isWatching: this.isWatching,
      watchedPathsCount: this.paths.length,
      activeDebouncedHandlers: this.debouncedHandlers.size,
    };
  }
}

/**
 * Factory function to create a config watcher
 */
export function createConfigWatcher(options: ConfigWatcherOptions): ConfigWatcher {
  return new ConfigWatcher(options);
}
