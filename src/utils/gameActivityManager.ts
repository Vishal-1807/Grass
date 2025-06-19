// gameActivityManager.ts - Simplified version that doesn't require additional GlobalState listeners
import { InactivityTimer, createGameInactivityTimer, TimerUtils } from './inactivityTimer';

export interface GameActivityConfig {
  timeoutMinutes?: number;
  debugMode?: boolean;
  excludeFromTimer?: string[]; // Array of event types to exclude from resetting timer
}

export class GameActivityManager {
  private timer: InactivityTimer | null = null;
  private config: GameActivityConfig;
  private isEnabled: boolean = true;

  constructor(config: GameActivityConfig = {}) {
    this.config = {
      timeoutMinutes: 2,
      debugMode: false,
      excludeFromTimer: [],
      ...config
    };

    this.log('GameActivityManager initialized', this.config);
  }

  /**
   * Initialize the activity manager and start the timer
   */
  public initialize(): void {
    if (this.timer) {
      this.log('Timer already initialized, destroying previous instance');
      this.timer.destroy();
    }

    this.timer = createGameInactivityTimer(
      this.config.timeoutMinutes!,
      this.handleInactivityTimeout.bind(this),
      {
        debugMode: this.config.debugMode,
        autoStart: true,
        onTick: this.config.debugMode ? (remaining) => {
          if (remaining <= 30000 && remaining % 10000 === 0) {
            // Log warning in last 30 seconds every 10 seconds
            this.log(`Timeout warning: ${TimerUtils.formatTime(remaining)} remaining`);
          }
        } : undefined
      }
    );

    this.log('Activity manager initialized and timer started');
  }

  /**
   * Record user activity and reset the timer
   */
  public recordActivity(activityType: string, details?: any): void {
    if (!this.isEnabled) {
      this.log(`Activity ignored (disabled): ${activityType}`, details);
      return;
    }

    if (this.config.excludeFromTimer?.includes(activityType)) {
      this.log(`Activity excluded from timer reset: ${activityType}`, details);
      return;
    }

    if (!this.timer) {
      this.log('Timer not initialized, cannot record activity');
      return;
    }

    this.log(`Activity recorded: ${activityType}`, details);
    this.timer.reset();
  }

  /**
   * Pause the inactivity timer (useful during popups or loading states)
   */
  public pauseTimer(): void {
    if (this.timer) {
      this.timer.pause();
      this.log('Timer paused');
    }
  }

  /**
   * Resume the inactivity timer
   */
  public resumeTimer(): void {
    if (this.timer) {
      this.timer.resume();
      this.log('Timer resumed');
    }
  }

  /**
   * Temporarily disable activity tracking
   */
  public disable(): void {
    this.isEnabled = false;
    this.pauseTimer();
    this.log('Activity manager disabled');
  }

  /**
   * Re-enable activity tracking
   */
  public enable(): void {
    this.isEnabled = true;
    this.resumeTimer();
    this.log('Activity manager enabled');
  }

  /**
   * Get remaining time before timeout
   */
  public getRemainingTime(): number {
    return this.timer?.getRemainingTime() || 0;
  }

  /**
   * Get formatted remaining time
   */
  public getFormattedRemainingTime(): string {
    return TimerUtils.formatTime(this.getRemainingTime());
  }

  /**
   * Check if timer is currently active
   */
  public isTimerActive(): boolean {
    return this.timer?.isActive() || false;
  }

  /**
   * Manually trigger timeout (for testing)
   */
  public triggerTimeout(): void {
    this.log('Manually triggering timeout');
    this.handleInactivityTimeout();
  }

  /**
   * Update timeout duration
   */
  public setTimeoutDuration(minutes: number): void {
    this.config.timeoutMinutes = minutes;
    if (this.timer) {
      this.timer.setTimeoutDuration(TimerUtils.minutesToMs(minutes));
    }
    this.log(`Timeout duration updated to ${minutes} minutes`);
  }

  /**
   * Clean up and destroy the activity manager
   */
  public destroy(): void {
    if (this.timer) {
      this.timer.destroy();
      this.timer = null;
    }

    this.log('Activity manager destroyed');
  }

  /**
   * Handle inactivity timeout
   */
  private handleInactivityTimeout(): void {
    this.log('Inactivity timeout triggered - calling window.openInActivePopup()');
    
    try {
      // Call the external popup function
      if (typeof window !== 'undefined' && (window as any).openInActivePopup) {
        (window as any).openInActivePopup();
        this.log('Inactivity popup opened successfully');
      } else {
        console.warn('window.openInActivePopup not available - make sure it is defined by the hosting website');
        
        // Fallback: show browser alert (remove this in production)
        if (this.config.debugMode) {
          alert('Inactivity timeout! (This is a debug alert - in production, window.openInActivePopup() should be called)');
        }
      }
    } catch (error) {
      console.error('Error opening inactivity popup:', error);
    }

    // Optional: Pause/stop the game
    // Note: You can add game-specific logic here if needed
    // For example: GlobalState.setGameStarted?.(false);
  }

  /**
   * Debug logging utility
   */
  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[GameActivityManager] ${message}`, data || '');
    }
  }
}

// Global instance for easy access across the game
let globalActivityManager: GameActivityManager | null = null;

/**
 * Initialize the global activity manager
 */
export const initializeActivityManager = (config: GameActivityConfig = {}): GameActivityManager => {
  if (globalActivityManager) {
    globalActivityManager.destroy();
  }

  globalActivityManager = new GameActivityManager(config);
  globalActivityManager.initialize();
  
  return globalActivityManager;
};

/**
 * Get the global activity manager instance
 */
export const getActivityManager = (): GameActivityManager | null => {
  return globalActivityManager;
};

/**
 * Record activity using the global manager (main function you'll use)
 */
export const recordUserActivity = (activityType: string, details?: any): void => {
  if (globalActivityManager) {
    globalActivityManager.recordActivity(activityType, details);
  } else {
    console.warn('Activity manager not initialized. Call initializeActivityManager() first.');
  }
};

/**
 * Pause the global activity timer
 */
export const pauseActivityTimer = (): void => {
  if (globalActivityManager) {
    globalActivityManager.pauseTimer();
  }
};

/**
 * Resume the global activity timer
 */
export const resumeActivityTimer = (): void => {
  if (globalActivityManager) {
    globalActivityManager.resumeTimer();
  }
};

/**
 * Quick activity types enum for consistency
 */
export const ActivityTypes = {
  // Game actions
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  CELL_CLICK: 'cell_click',
  COLLECT_CLICK: 'collect_click',
  
  // UI interactions
  BET_CHANGE: 'bet_change',
  GRID_CHANGE: 'grid_change',
  
  // Settings and toolbar
  SETTINGS_OPEN: 'settings_open',
  SETTINGS_CLOSE: 'settings_close',
  AUDIO_TOGGLE: 'audio_toggle',
  
  // Settings sub-sections
  SETTINGS_MUSIC: 'settings_music',
  SETTINGS_RULES: 'settings_rules',
  SETTINGS_HISTORY: 'settings_history',
  
  // History interactions
  HISTORY_PAGE_CHANGE: 'history_page_change',
  MATRIX_VIEW: 'matrix_view',
  
  // Generic button click (for any other buttons)
  BUTTON_CLICK: 'button_click'
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

/**
 * Utility function to wrap button onClick handlers with activity tracking
 */
export const withActivityTracking = <T extends (...args: any[]) => any>(
  originalFunction: T,
  activityType: string,
  getDetails?: (...args: Parameters<T>) => any
): T => {
  return ((...args: Parameters<T>) => {
    const details = getDetails ? getDetails(...args) : undefined;
    recordUserActivity(activityType, details);
    return originalFunction(...args);
  }) as T;
};

/**
 * Utility to create an activity-tracked button config
 */
export const createTrackedButtonConfig = (
  buttonConfig: any,
  activityType: string,
  activityDetails?: any
) => {
  const originalOnClick = buttonConfig.onClick;
  
  if (originalOnClick) {
    buttonConfig.onClick = withActivityTracking(
      originalOnClick,
      activityType,
      () => activityDetails
    );
  }
  
  return buttonConfig;
};