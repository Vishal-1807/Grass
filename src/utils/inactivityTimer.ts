// inactivityTimer.ts - Professional modular inactivity timer system
export interface InactivityTimerConfig {
  timeoutDuration: number; // Duration in milliseconds
  onTimeout: () => void; // Callback when timer expires
  debugMode?: boolean; // Enable console logging for debugging
  autoStart?: boolean; // Automatically start timer on creation
}

export interface InactivityTimerEvents {
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onTick?: (remainingTime: number) => void; // Called every second with remaining time
}

export class InactivityTimer {
  private config: InactivityTimerConfig;
  private events: InactivityTimerEvents;
  private timerId: number | null = null;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private tickInterval: number | null = null;

  constructor(config: InactivityTimerConfig, events: InactivityTimerEvents = {}) {
    this.config = {
      debugMode: false,
      autoStart: true,
      ...config
    };
    this.events = events;

    this.log('InactivityTimer created', {
      timeoutDuration: this.config.timeoutDuration,
      autoStart: this.config.autoStart
    });

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the inactivity timer
   */
  public start(): void {
    if (this.isRunning && !this.isPaused) {
      this.log('Timer already running, resetting instead');
      this.reset();
      return;
    }

    this.stop(); // Clear any existing timer
    this.startTime = Date.now();
    this.isRunning = true;
    this.isPaused = false;

    // Set the main timeout
    this.timerId = window.setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeoutDuration);

    // Start tick interval for remaining time updates
    if (this.events.onTick) {
      this.startTickInterval();
    }

    this.log('Timer started', {
      duration: this.config.timeoutDuration,
      startTime: this.startTime
    });

    this.events.onStart?.();
  }

  /**
   * Stop the inactivity timer
   */
  public stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.isRunning = false;
    this.isPaused = false;

    this.log('Timer stopped');
    this.events.onStop?.();
  }

  /**
   * Reset the inactivity timer (restart from beginning)
   */
  public reset(): void {
    const wasRunning = this.isRunning;
    
    this.stop();
    
    if (wasRunning) {
      this.start();
    }

    this.log('Timer reset');
    this.events.onReset?.();
  }

  /**
   * Pause the timer without stopping it completely
   */
  public pause(): void {
    if (!this.isRunning || this.isPaused) {
      this.log('Cannot pause - timer not running or already paused');
      return;
    }

    this.isPaused = true;
    
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.log('Timer paused');
  }

  /**
   * Resume a paused timer
   */
  public resume(): void {
    if (!this.isRunning || !this.isPaused) {
      this.log('Cannot resume - timer not running or not paused');
      return;
    }

    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.config.timeoutDuration - elapsed);

    if (remaining <= 0) {
      this.handleTimeout();
      return;
    }

    this.isPaused = false;

    // Set timeout for remaining time
    this.timerId = window.setTimeout(() => {
      this.handleTimeout();
    }, remaining);

    // Resume tick interval
    if (this.events.onTick) {
      this.startTickInterval();
    }

    this.log('Timer resumed', { remainingTime: remaining });
  }

  /**
   * Get the remaining time in milliseconds
   */
  public getRemainingTime(): number {
    if (!this.isRunning) {
      return 0;
    }

    if (this.isPaused) {
      return Math.max(0, this.config.timeoutDuration - (Date.now() - this.startTime));
    }

    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.config.timeoutDuration - elapsed);
  }

  /**
   * Get the elapsed time in milliseconds
   */
  public getElapsedTime(): number {
    if (!this.isRunning) {
      return 0;
    }

    return Date.now() - this.startTime;
  }

  /**
   * Check if timer is currently running
   */
  public isActive(): boolean {
    return this.isRunning && !this.isPaused;
  }

  /**
   * Check if timer is paused
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Update the timeout duration (only takes effect on next start/reset)
   */
  public setTimeoutDuration(duration: number): void {
    this.config.timeoutDuration = duration;
    this.log('Timeout duration updated', { newDuration: duration });
  }

  /**
   * Update the timeout callback
   */
  public setTimeoutCallback(callback: () => void): void {
    this.config.onTimeout = callback;
    this.log('Timeout callback updated');
  }

  /**
   * Destroy the timer and clean up all resources
   */
  public destroy(): void {
    this.stop();
    this.log('Timer destroyed');
  }

  /**
   * Handle timeout event
   */
  private handleTimeout(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.log('Timer expired - triggering timeout callback');
    
    try {
      this.config.onTimeout();
    } catch (error) {
      console.error('Error in timeout callback:', error);
    }
  }

  /**
   * Start the tick interval for onTick events
   */
  private startTickInterval(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
    }

    this.tickInterval = window.setInterval(() => {
      if (!this.isRunning || this.isPaused) {
        return;
      }

      const remaining = this.getRemainingTime();
      this.events.onTick?.(remaining);

      // Stop ticking when time runs out
      if (remaining <= 0 && this.tickInterval !== null) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
    }, 1000); // Tick every second
  }

  /**
   * Debug logging utility
   */
  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[InactivityTimer] ${message}`, data || '');
    }
  }
}

/**
 * Factory function to create a game-specific inactivity timer
 */
export const createGameInactivityTimer = (
  timeoutMinutes: number = 2,
  onTimeoutCallback: () => void,
  options: {
    debugMode?: boolean;
    autoStart?: boolean;
    onTick?: (remainingMs: number) => void;
  } = {}
): InactivityTimer => {
  return new InactivityTimer(
    {
      timeoutDuration: timeoutMinutes * 60 * 1000, // Convert minutes to milliseconds
      onTimeout: onTimeoutCallback,
      debugMode: options.debugMode || false,
      autoStart: options.autoStart !== false // Default to true
    },
    {
      onTick: options.onTick,
      onStart: () => {
        if (options.debugMode) {
          console.log(`🕐 Inactivity timer started (${timeoutMinutes} minutes)`);
        }
      },
      onReset: () => {
        if (options.debugMode) {
          console.log('🔄 Inactivity timer reset');
        }
      }
    }
  );
};

/**
 * Utility functions for common timer operations
 */
export const TimerUtils = {
  /**
   * Format milliseconds to human-readable time
   */
  formatTime: (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * Convert minutes to milliseconds
   */
  minutesToMs: (minutes: number): number => minutes * 60 * 1000,

  /**
   * Convert seconds to milliseconds
   */
  secondsToMs: (seconds: number): number => seconds * 1000,

  /**
   * Get current timestamp
   */
  now: (): number => Date.now()
};