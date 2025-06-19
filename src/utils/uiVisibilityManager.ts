// uiVisibilityManager.ts - Professional selective UI visibility management for gameplay
import { Container } from 'pixi.js';
import { GlobalState } from '../globals/gameState';

// Use Container as the base type since all PIXI display objects extend from it
type PIXIDisplayObject = Container;

// Interface for trackable UI elements
interface UIElement {
    displayObject: PIXIDisplayObject;
    name: string;
    originalVisible: boolean;
    originalEventMode?: string;
    originalAlpha?: number;
    isHidden: boolean;
    customComponent?: any; // For special components like grid selector
}

// Configuration for UI visibility behavior
interface UIVisibilityConfig {
    animationDuration: number;   // Duration of fade in/out animations in ms
    debugMode: boolean;          // Enable debug logging
    fadeEffect: boolean;         // Whether to use fade animations or instant hide/show
}

// Default configuration
const DEFAULT_CONFIG: UIVisibilityConfig = {
    animationDuration: 300,
    debugMode: true,
    fadeEffect: true
};

class UIVisibilityManager {
    private trackedElements: Map<string, UIElement> = new Map();
    private config: UIVisibilityConfig;
    private isGameActive: boolean = false;

    constructor(config: Partial<UIVisibilityConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.setupGameStateListeners();
        
        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager initialized with config:', this.config);
        }
    }

    /**
     * Register a UI element to be hidden during gameplay
     * @param displayObject - The PIXI display object to manage (Container, Sprite, etc.)
     * @param name - Unique name identifier for the element
     * @param customComponent - Optional custom component with special methods (e.g., grid selector)
     */
    public registerElement(displayObject: PIXIDisplayObject, name: string, customComponent?: any): void {
        if (this.trackedElements.has(name)) {
            console.warn(`👁️ UIVisibilityManager: Element '${name}' is already registered`);
            return;
        }

        const element: UIElement = {
            displayObject,
            name,
            originalVisible: displayObject.visible,
            originalEventMode: (displayObject as any).eventMode,
            originalAlpha: displayObject.alpha,
            isHidden: false,
            customComponent
        };

        this.trackedElements.set(name, element);
        
        if (this.config.debugMode) {
            console.log(`👁️ UIVisibilityManager: Registered element '${name}'${customComponent ? ' with custom component' : ''}`);
        }

        // If game is already active, immediately hide this element
        if (this.isGameActive) {
            this.hideElement(name);
        }
    }

    /**
     * Unregister a UI element from management
     * @param name - Name of the element to unregister
     */
    public unregisterElement(name: string): void {
        const element = this.trackedElements.get(name);
        if (!element) {
            console.warn(`👁️ UIVisibilityManager: Element '${name}' not found for unregistration`);
            return;
        }

        // Restore element to original state if it was hidden
        if (element.isHidden) {
            this.showElement(name);
        }

        this.trackedElements.delete(name);
        
        if (this.config.debugMode) {
            console.log(`👁️ UIVisibilityManager: Unregistered element '${name}'`);
        }
    }

    /**
     * Hide a specific element
     * @param name - Name of the element to hide
     */
    private hideElement(name: string): void {
        const element = this.trackedElements.get(name);
        if (!element || element.isHidden) {
            return;
        }

        const { displayObject, customComponent } = element;

        // Store original properties
        element.originalVisible = displayObject.visible;
        element.originalEventMode = (displayObject as any).eventMode;
        element.originalAlpha = displayObject.alpha;

        // Handle special components with custom disable methods
        if (customComponent && customComponent.disable && typeof customComponent.disable === 'function') {
            // For custom components like grid selector, use their disable method instead of hiding
            customComponent.disable();
            if (this.config.debugMode) {
                console.log(`👁️ Disabled custom component '${name}' (using custom disable method)`);
            }
        } else {
            // Standard display object handling - hide completely
            this.applyHideEffect(displayObject, element);
            
            // Disable interaction
            if ((displayObject as any).eventMode !== undefined) {
                (displayObject as any).eventMode = 'none';
            }
        }

        element.isHidden = true;

        if (this.config.debugMode) {
            console.log(`👁️ UIVisibilityManager: Hidden element '${name}'`);
        }
    }

    /**
     * Show a specific element
     * @param name - Name of the element to show
     */
    private showElement(name: string): void {
        const element = this.trackedElements.get(name);
        if (!element || !element.isHidden) {
            return;
        }

        const { displayObject, customComponent } = element;

        // Handle special components with custom enable methods
        if (customComponent && customComponent.enable && typeof customComponent.enable === 'function') {
            // For custom components like grid selector, use their enable method instead of showing
            customComponent.enable();
            if (this.config.debugMode) {
                console.log(`👁️ Enabled custom component '${name}' (using custom enable method)`);
            }
        } else {
            // Standard display object handling - show completely
            this.applyShowEffect(displayObject, element);
            
            // Restore interaction
            if (element.originalEventMode !== undefined) {
                (displayObject as any).eventMode = element.originalEventMode;
            }
        }

        element.isHidden = false;

        if (this.config.debugMode) {
            console.log(`👁️ UIVisibilityManager: Shown element '${name}'`);
        }
    }

    /**
     * Apply hide effect (fade out or instant)
     */
    private applyHideEffect(displayObject: PIXIDisplayObject, element: UIElement): void {
        if (this.config.fadeEffect) {
            this.animateAlpha(displayObject, displayObject.alpha, 0, () => {
                displayObject.visible = false;
            });
        } else {
            displayObject.visible = false;
            displayObject.alpha = 0;
        }
    }

    /**
     * Apply show effect (fade in or instant)
     */
    private applyShowEffect(displayObject: PIXIDisplayObject, element: UIElement): void {
        const targetAlpha = element.originalAlpha || 1;
        
        if (this.config.fadeEffect) {
            displayObject.visible = true;
            this.animateAlpha(displayObject, displayObject.alpha, targetAlpha);
        } else {
            displayObject.visible = element.originalVisible;
            displayObject.alpha = targetAlpha;
        }
    }

    /**
     * Animate alpha changes
     */
    private animateAlpha(displayObject: PIXIDisplayObject, fromAlpha: number, toAlpha: number, onComplete?: () => void): void {
        const startTime = Date.now();
        const duration = this.config.animationDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            displayObject.alpha = fromAlpha + (toAlpha - fromAlpha) * easedProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                displayObject.alpha = toAlpha;
                onComplete?.();
            }
        };
        
        animate();
    }

    /**
     * Hide all registered elements (called when game starts)
     */
    private hideAllElements(): void {
        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager: Hiding all elements for game start');
        }

        this.isGameActive = true;
        
        this.trackedElements.forEach((element, name) => {
            this.hideElement(name);
        });
    }

    /**
     * Show all registered elements (called when game ends)
     */
    private showAllElements(): void {
        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager: Showing all elements for game end');
        }

        this.isGameActive = false;

        this.trackedElements.forEach((element, name) => {
            this.showElement(name);
        });
    }

    /**
     * Setup listeners for game state changes
     */
    private setupGameStateListeners(): void {
        // Listen for game start
        GlobalState.addGameStartedListener?.(() => {
            if (this.config.debugMode) {
                console.log('👁️ UIVisibilityManager: Game started - hiding elements');
            }
            this.hideAllElements();
        });

        // Listen for game end
        GlobalState.addGameEndedListener?.(() => {
            if (this.config.debugMode) {
                console.log('👁️ UIVisibilityManager: Game ended - showing elements');
            }
            this.showAllElements();
        });

        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager: Game state listeners registered');
        }
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<UIVisibilityConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager: Configuration updated:', this.config);
        }
    }

    /**
     * Get current state information
     */
    public getState(): { isGameActive: boolean; elementCount: number; hiddenCount: number } {
        let hiddenCount = 0;
        this.trackedElements.forEach((element) => {
            if (element.isHidden) {
                hiddenCount++;
            }
        });

        return {
            isGameActive: this.isGameActive,
            elementCount: this.trackedElements.size,
            hiddenCount
        };
    }

    /**
     * Manually hide specific element
     */
    public hide(name: string): void {
        this.hideElement(name);
    }

    /**
     * Manually show specific element
     */
    public show(name: string): void {
        this.showElement(name);
    }

    /**
     * Check if element is currently hidden
     */
    public isHidden(name: string): boolean {
        const element = this.trackedElements.get(name);
        return element ? element.isHidden : false;
    }

    /**
     * Cleanup - remove all listeners and restore elements
     */
    public destroy(): void {
        // Show all elements before cleanup
        this.showAllElements();
        
        // Clear tracked elements
        this.trackedElements.clear();
        
        if (this.config.debugMode) {
            console.log('👁️ UIVisibilityManager: Destroyed and cleaned up');
        }
    }
}

// Create and export singleton instance
let uiVisibilityManagerInstance: UIVisibilityManager | null = null;

/**
 * Get the singleton UIVisibilityManager instance
 */
export const getUIVisibilityManager = (config?: Partial<UIVisibilityConfig>): UIVisibilityManager => {
    if (!uiVisibilityManagerInstance) {
        uiVisibilityManagerInstance = new UIVisibilityManager(config);
    }
    return uiVisibilityManagerInstance;
};

/**
 * Convenience function to register an element
 */
export const registerUIElement = (displayObject: PIXIDisplayObject, name: string, customComponent?: any): void => {
    const manager = getUIVisibilityManager();
    manager.registerElement(displayObject, name, customComponent);
};

/**
 * Convenience function to unregister an element
 */
export const unregisterUIElement = (name: string): void => {
    const manager = getUIVisibilityManager();
    manager.unregisterElement(name);
};

// Export types for external use
export type { UIVisibilityConfig };
export { UIVisibilityManager };