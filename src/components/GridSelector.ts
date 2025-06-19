// GridSelector.ts - Complete corrected version with infinite scrolling, dimension listeners, and game state synchronization
import { Container, Sprite, Assets, Ticker, Graphics } from 'pixi.js';
import { createButton } from './commons/Button';
import { GlobalState } from '../globals/gameState';

/**
 * Configuration interface for grid selector component
 */
interface GridSelectorConfig {
    width: number;
    height: number;
    x: number;
    y: number;
    visibleItems: number;
    itemSpacing: number;
    animationDuration: number;
    easing: 'linear' | 'easeOut' | 'easeInOut';
}

/**
 * Grid option data structure
 */
interface GridOption {
    id: string;
    texture: string;
    rows: number;
    cols: number;
    displayName: string;
    isSelected: boolean;
}

/**
 * Animation state management
 */
interface AnimationState {
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startPosition: number;
    targetPosition: number;
    currentPosition: number;
}

/**
 * Easing functions for smooth animations
 */
const easingFunctions = {
    linear: (t: number): number => t,
    easeOut: (t: number): number => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number): number => t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2
};

/**
 * Initialize available grid options
 */
const initializeGridOptions = (): GridOption[] => {
    const options: GridOption[] = [
        {
            id: '2x3',
            texture: 'grid2x3',
            rows: 3,
            cols: 2,
            displayName: '2×3',
            isSelected: false
        },
        {
            id: '3x6',
            texture: 'grid3x6',
            rows: 6,
            cols: 3,
            displayName: '3×6',
            isSelected: true // Default selection
        },
        {
            id: '4x9',
            texture: 'grid4x9',
            rows: 9,
            cols: 4,
            displayName: '4×9',
            isSelected: false
        },
        {
            id: '5x12',
            texture: 'grid5x12',
            rows: 12,
            cols: 5,
            displayName: '5×12',
            isSelected: false
        },
        {
            id: '6x15',
            texture: 'grid6x15',
            rows: 15,
            cols: 6,
            displayName: '6×15',
            isSelected: false
        }
    ];

    return options;
};

/**
 * Create mask for scrollable area
 */
const createMask = (config: GridSelectorConfig): Graphics => {
    const maskGraphics = new Graphics();
    maskGraphics.rect(0, 0, config.width, config.height);
    maskGraphics.fill(0xFFFFFF);
    return maskGraphics;
};

/**
 * Create individual grid button
 */
const createGridButton = (
    option: GridOption, 
    index: number, 
    config: GridSelectorConfig,
    onSelect: (index: number) => void
): Container => {
    const buttonWidth = config.width / config.visibleItems - config.itemSpacing;
    const buttonHeight = config.height * 0.8;

    const button = createButton({
        texture: Assets.get(option.texture),
        width: buttonWidth,
        height: buttonHeight,
        x: 0,
        y: (config.height - buttonHeight) / 2,
        anchorX: 0,
        anchorY: 0,
        onClick: () => onSelect(index)
    });

    // Store option reference
    (button as any).gridOption = option;
    (button as any).optionIndex = index;

    return button;
};

/**
 * Create virtual copies of buttons for infinite scrolling effect
 */
const createInfiniteButtonLayout = (
    gridOptions: GridOption[],
    contentContainer: Container,
    config: GridSelectorConfig,
    handleSelection: (index: number) => void
): Container[] => {
    const allButtons: Container[] = [];
    const totalOptions = gridOptions.length;
    
    // Create three sets of buttons: [previous set][main set][next set]
    // This ensures we always have buttons visible on both sides
    for (let setIndex = 0; setIndex < 3; setIndex++) {
        gridOptions.forEach((option, index) => {
            const button = createGridButton(option, index, config, (originalIndex) => {
                // Always use the original index for selection, regardless of which set
                handleSelection(originalIndex);
            });
            
            // Store which set this button belongs to and its original index
            (button as any).setIndex = setIndex;
            (button as any).originalIndex = index;
            (button as any).isVirtualCopy = setIndex !== 1; // Middle set (index 1) is the main set
            
            allButtons.push(button);
            contentContainer.addChild(button);
        });
    }
    
    return allButtons;
};

/**
 * Update button alpha for fade effect
 */
const updateButtonAlpha = (button: Container, config: GridSelectorConfig): void => {
    const buttonCenter = button.x + button.width / 2;
    const selectorCenter = config.width / 2;
    const maxDistance = config.width / 2;
    
    const distance = Math.abs(buttonCenter - selectorCenter);
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    
    // Fade out buttons at edges
    button.alpha = Math.max(0.3, 1 - normalizedDistance);
    
    // Scale effect for center item
    const scale = Math.max(0.8, 1 - normalizedDistance * 0.2);
    button.scale.set(scale);
};

/**
 * Apply current positions to buttons with true infinite loop visualization
 */
const applyInfiniteButtonPositions = (
    allButtons: Container[], 
    animationState: AnimationState, 
    config: GridSelectorConfig,
    totalOptions: number
): void => {
    const itemWidth = config.width / config.visibleItems;

    allButtons.forEach((button, globalIndex) => {
        const setIndex = (button as any).setIndex;
        const originalIndex = (button as any).originalIndex;
        
        // Calculate position based on set and original index
        // Set 0 (left): positions -totalOptions to -1
        // Set 1 (main): positions 0 to totalOptions-1  
        // Set 2 (right): positions totalOptions to 2*totalOptions-1
        const virtualIndex = (setIndex * totalOptions) + originalIndex - totalOptions;
        
        button.x = animationState.currentPosition + (virtualIndex * itemWidth);
        updateButtonAlpha(button, config);
    });
};

/**
 * Start smooth scrolling animation
 */
const startAnimation = (animationState: AnimationState, targetPosition: number): void => {
    animationState.isAnimating = true;
    animationState.startTime = Date.now();
    animationState.startPosition = animationState.currentPosition;
    animationState.targetPosition = targetPosition;
};

/**
 * Update animation frame with infinite layout
 */
const updateAnimation = (
    animationState: AnimationState, 
    allButtons: Container[], 
    config: GridSelectorConfig,
    totalOptions: number
): void => {
    const elapsed = Date.now() - animationState.startTime;
    const progress = Math.min(elapsed / animationState.duration, 1);

    // Apply easing function
    const easingFunction = easingFunctions[config.easing];
    const easedProgress = easingFunction(progress);

    // Calculate current position
    animationState.currentPosition = 
        animationState.startPosition + 
        (animationState.targetPosition - animationState.startPosition) * easedProgress;

    applyInfiniteButtonPositions(allButtons, animationState, config, totalOptions);

    // End animation when complete
    if (progress >= 1) {
        animationState.isAnimating = false;
        animationState.currentPosition = animationState.targetPosition;
    }
};

/**
 * Update button positions with optional animation and infinite scrolling support
 */
const updateButtonPositions = (
    currentIndex: number,
    animationState: AnimationState,
    allButtons: Container[],
    config: GridSelectorConfig,
    totalOptions: number,
    animate: boolean
): void => {
    const itemWidth = config.width / config.visibleItems;
    const centerOffset = (config.visibleItems - 1) / 2;
    const targetPosition = -(currentIndex - centerOffset) * itemWidth;

    if (animate && !animationState.isAnimating) {
        startAnimation(animationState, targetPosition);
    } else if (!animate) {
        animationState.currentPosition = targetPosition;
        applyInfiniteButtonPositions(allButtons, animationState, config, totalOptions);
    }
};

/**
 * Get center option index and update GlobalState (enhanced)
 */
const updateCenterOption = (
    currentIndex: number,
    gridOptions: GridOption[],
    config: GridSelectorConfig
): void => {
    // Calculate which option is in the center
    const centerIndex = Math.max(0, Math.min(currentIndex, gridOptions.length - 1));
    const centerOption = gridOptions[centerIndex];
    
    if (centerOption) {
        console.log(`Center option: ${centerOption.displayName} (${centerOption.cols}×${centerOption.rows})`);
        
        // Update GlobalState with center option dimensions using the new function
        GlobalState.setGridDimensions(centerOption.cols, centerOption.rows);
        
        console.log(`GlobalState updated via setGridDimensions - cols: ${centerOption.cols}, rows: ${centerOption.rows}`);
    }
};

/**
 * Update selection indicators for infinite layout
 */
const updateSelectionIndicators = (allButtons: Container[], gridOptions: GridOption[]): void => {
    allButtons.forEach((button, globalIndex) => {
        const originalIndex = (button as any).originalIndex;
        const indicator = (button as any).selectionIndicator as Graphics;
        const option = gridOptions[originalIndex];
        
        if (indicator) {
            indicator.clear();
            
            if (option.isSelected) {
                indicator.stroke({ width: 3, color: 0x00FF88, alpha: 0.8 });
                indicator.rect(-2, -2, button.width + 4, button.height + 4);
                indicator.stroke();
            }
        }
    });
};

/**
 * Select grid option and update global state with wraparound (enhanced for infinite layout)
 */
const selectGridOption = (
    index: number,
    currentIndex: number,
    gridOptions: GridOption[],
    allButtons: Container[],
    animationState: AnimationState,
    config: GridSelectorConfig,
    onSelectionChange?: (option: GridOption) => void
): number => {
    // Handle wraparound for selection
    if (index < 0) {
        index = gridOptions.length - 1; // Wrap to last option
    } else if (index >= gridOptions.length) {
        index = 0; // Wrap to first option
    }
    
    if (index === currentIndex) return currentIndex;

    // Update selection state
    gridOptions.forEach((option, i) => {
        option.isSelected = i === index;
    });

    // Update visual indicators on all button sets
    updateSelectionIndicators(allButtons, gridOptions);

    // Get selected option
    const selectedOption = gridOptions[index];
    
    // Update GlobalState with selected dimensions using the new function
    GlobalState.setGridDimensions(selectedOption.cols, selectedOption.rows);
    
    console.log(`Grid selection changed to: ${selectedOption.displayName} (${selectedOption.cols}×${selectedOption.rows})`);
    console.log(`GlobalState updated via setGridDimensions - cols: ${selectedOption.cols}, rows: ${selectedOption.rows}`);

    // Update button positions to center the selected option
    updateButtonPositions(index, animationState, allButtons, config, gridOptions.length, true);

    // Notify external handlers
    if (onSelectionChange) {
        onSelectionChange(selectedOption);
    }

    return index;
};

/**
 * Scroll to specific index with animation and wraparound (enhanced for infinite layout)
 */
const scrollToIndex = (
    targetIndex: number,
    currentIndex: number,
    gridOptions: GridOption[],
    allButtons: Container[],
    animationState: AnimationState,
    config: GridSelectorConfig
): number => {
    // Handle wraparound instead of clamping
    if (targetIndex < 0) {
        targetIndex = gridOptions.length - 1; // Wrap to last option
    } else if (targetIndex >= gridOptions.length) {
        targetIndex = 0; // Wrap to first option
    }
    
    if (targetIndex === currentIndex || animationState.isAnimating) {
        return currentIndex;
    }

    // Update button positions
    updateButtonPositions(targetIndex, animationState, allButtons, config, gridOptions.length, true);
    
    // Update center option in GlobalState using the enhanced function
    updateCenterOption(targetIndex, gridOptions, config);

    return targetIndex;
};

/**
 * Setup touch scrolling for infinite visual loop
 */
const setupTouchScrolling = (
    container: Container,
    contentContainer: Container,
    currentIndex: { value: number },
    gridOptions: GridOption[],
    allButtons: Container[],
    animationState: AnimationState,
    config: GridSelectorConfig
): void => {
    let startX = 0;
    let isDragging = false;
    let hasMoved = false;

    // Create invisible overlay for better drag detection
    const dragOverlay = new Graphics();
    dragOverlay.rect(0, 0, config.width, config.height);
    dragOverlay.fill({ color: 0x000000, alpha: 0 }); // Invisible but interactive
    dragOverlay.eventMode = 'static';
    dragOverlay.cursor = 'grab';
    container.addChild(dragOverlay);

    // Function to handle drag start
    const handleDragStart = (event: any) => {
        startX = event.global.x;
        isDragging = true;
        hasMoved = false;
        dragOverlay.cursor = 'grabbing';
        
        // Disable button interactions during drag
        allButtons.forEach(button => {
            button.eventMode = 'none';
        });
    };

    // Function to handle drag move with wraparound
    const handleDragMove = (event: any) => {
        if (!isDragging) return;

        const deltaX = event.global.x - startX;
        const threshold = 30; // Reduced threshold for more responsive dragging

        if (Math.abs(deltaX) > threshold) {
            hasMoved = true;
            const direction = deltaX > 0 ? -1 : 1;
            
            // Calculate new index with wraparound
            let newIndex = currentIndex.value + direction;
            
            // Handle wraparound
            if (newIndex < 0) {
                newIndex = gridOptions.length - 1; // Wrap to last
            } else if (newIndex >= gridOptions.length) {
                newIndex = 0; // Wrap to first
            }
            
            currentIndex.value = scrollToIndex(
                newIndex,
                currentIndex.value,
                gridOptions,
                allButtons,
                animationState,
                config
            );
            
            // Reset start position for continuous scrolling
            startX = event.global.x;
        }
    };

    // Function to handle drag end
    const handleDragEnd = () => {
        if (isDragging) {
            isDragging = false;
            dragOverlay.cursor = 'grab';
            
            // Re-enable button interactions after a short delay
            setTimeout(() => {
                allButtons.forEach(button => {
                    if (!(button as any).isVirtualCopy) {
                        button.eventMode = 'static';
                    }
                });
            }, hasMoved ? 100 : 0); // Longer delay if we moved to prevent accidental clicks
        }
    };

    // Mouse/touch events on the invisible overlay
    dragOverlay.on('pointerdown', handleDragStart);
    dragOverlay.on('pointermove', handleDragMove);
    dragOverlay.on('pointerup', handleDragEnd);
    dragOverlay.on('pointerupoutside', handleDragEnd);

    // Global pointer events for better tracking
    container.on('globalpointermove', handleDragMove);
    container.on('globalpointerup', handleDragEnd);

    // Store reference for cleanup
    (container as any).dragOverlay = dragOverlay;
};

/**
 * Setup animation ticker with infinite layout support
 */
const setupAnimationTicker = (
    animationState: AnimationState,
    allButtons: Container[],
    config: GridSelectorConfig,
    totalOptions: number
): Ticker => {
    const ticker = new Ticker();
    ticker.maxFPS = 60;
    
    ticker.add(() => {
        if (animationState.isAnimating) {
            updateAnimation(animationState, allButtons, config, totalOptions);
        }
    });
    
    ticker.start();
    return ticker;
};

/**
 * Professional grid selector component with true infinite scrolling visualization and game state synchronization
 */
export const createGridSelector = (config: GridSelectorConfig) => {
    const container = new Container();
    const contentContainer = new Container();
    const gridOptions = initializeGridOptions();
    let currentIndex = gridOptions.findIndex(option => option.isSelected);
    if (currentIndex === -1) currentIndex = 1; // Default to 3x6

    // Wrap currentIndex in object for reference passing
    const currentIndexRef = { value: currentIndex };

    const animationState: AnimationState = {
        isAnimating: false,
        startTime: 0,
        duration: config.animationDuration,
        startPosition: 0,
        targetPosition: 0,
        currentPosition: 0
    };

    let onSelectionChange: ((option: GridOption) => void) | undefined;

    // Create mask for visible area
    const maskGraphics = createMask(config);
    container.addChild(maskGraphics);
    container.addChild(contentContainer);
    contentContainer.mask = maskGraphics;

    // Create fixed orange selection indicator in center
    const createCenterSelectionIndicator = () => {
        const selectionIndicator = new Sprite(Assets.get('gridTabSelectionOrange'));
        
        // Position in the exact center of the grid selector
        selectionIndicator.anchor.set(0.5);
        selectionIndicator.x = config.width / 2 - config.width * 0.05; // Offset for better visibility
        selectionIndicator.y = config.height / 2;
        
        // Size it appropriately (90% of a single button's height)
        const buttonHeight = config.height * 0.8;
        selectionIndicator.width = buttonHeight * 1.2;
        selectionIndicator.height = buttonHeight;
        
        // Add to container (not content container so it doesn't scroll)
        container.addChild(selectionIndicator);
        
        return selectionIndicator;
    };

    // Create the fixed center selection indicator
    const centerSelectionIndicator = createCenterSelectionIndicator();

    // Declare allButtons array first
    let allButtons: Container[] = [];

    // Selection handler
    const handleSelection = (index: number) => {
        currentIndexRef.value = selectGridOption(
            index,
            currentIndexRef.value,
            gridOptions,
            allButtons,
            animationState,
            config,
            onSelectionChange
        );
    };

    // Create infinite button layout (3 sets of buttons for seamless scrolling)
    allButtons = createInfiniteButtonLayout(gridOptions, contentContainer, config, handleSelection);

    // Position container
    container.x = config.x;
    container.y = config.y;

    // Set initial position
    updateButtonPositions(currentIndexRef.value, animationState, allButtons, config, gridOptions.length, false);
    
    // Update initial center option in GlobalState
    updateCenterOption(currentIndexRef.value, gridOptions, config);

    // Setup animation ticker with infinite layout support
    const ticker = setupAnimationTicker(animationState, allButtons, config, gridOptions.length);

    // Enable interactive mode for scroll detection
    container.eventMode = 'static';

    // Enhanced mouse wheel scrolling with wraparound
    container.on('wheel', (event: any) => {
        event.preventDefault();
        
        const delta = event.deltaY || event.detail || event.wheelDelta;
        const direction = delta > 0 ? 1 : -1;
        
        // Calculate new index with wraparound
        let newIndex = currentIndexRef.value + direction;
        
        // Handle wraparound
        if (newIndex < 0) {
            newIndex = gridOptions.length - 1; // Wrap to last
        } else if (newIndex >= gridOptions.length) {
            newIndex = 0; // Wrap to first
        }
        
        currentIndexRef.value = scrollToIndex(
            newIndex,
            currentIndexRef.value,
            gridOptions,
            allButtons,
            animationState,
            config
        );
    });

    // Setup touch scrolling with infinite wraparound
    setupTouchScrolling(container, contentContainer, currentIndexRef, gridOptions, allButtons, animationState, config);

    // NEW: Listen for grid dimension changes from game state (for pending game restoration)
    const listenForGridDimensionChanges = () => {
        const unsubscribeGridDimensionChange = GlobalState.addGridDimensionChangeListener?.((cols: number, rows: number) => {
            console.log(`🎮 Grid selector received dimension change: ${cols}x${rows}`);
            
            // Find the matching grid option
            const targetOptionIndex = gridOptions.findIndex(option => 
                option.cols === cols && option.rows === rows
            );
            
            if (targetOptionIndex !== -1 && targetOptionIndex !== currentIndexRef.value) {
                console.log(`🎮 Updating grid selector to match game state: ${gridOptions[targetOptionIndex].displayName}`);
                
                // Update selection state
                gridOptions.forEach((option, i) => {
                    option.isSelected = i === targetOptionIndex;
                });
                
                // Update current index
                currentIndexRef.value = targetOptionIndex;
                
                // Update visual positions without triggering selection change callback
                updateButtonPositions(targetOptionIndex, animationState, allButtons, config, gridOptions.length, true);
                updateSelectionIndicators(allButtons, gridOptions);
                
                console.log(`🎮 Grid selector synchronized with game state`);
            } else if (targetOptionIndex === -1) {
                console.warn(`🎮 No matching grid option found for ${cols}x${rows}`);
            }
        });
        
        // Store unsubscribe function for cleanup
        (container as any).unsubscribeGridDimensionChange = unsubscribeGridDimensionChange;
    };

    // Call the listener setup
    listenForGridDimensionChanges();

    // Public interface
    const gridSelector = {
        getContainer: () => container,
        
        getCurrentSelection: () => gridOptions[currentIndexRef.value],
        
        onGridSelectionChange: (callback: (option: GridOption) => void) => {
            onSelectionChange = callback;
        },
        
        scrollToIndex: (targetIndex: number) => {
            currentIndexRef.value = scrollToIndex(
                targetIndex,
                currentIndexRef.value,
                gridOptions,
                allButtons,
                animationState,
                config
            );
        },
        
        resize: (width: number, height: number, x: number, y: number) => {
            config.width = width;
            config.height = height;
            config.x = x;
            config.y = y;

            // Update container position
            container.x = x;
            container.y = y;

            // Update mask
            maskGraphics.clear();
            maskGraphics.rect(0, 0, width, height);
            maskGraphics.fill(0xFFFFFF);

            // Update drag overlay size
            const dragOverlay = (container as any).dragOverlay;
            if (dragOverlay) {
                dragOverlay.clear();
                dragOverlay.rect(0, 0, width, height);
                dragOverlay.fill({ color: 0x000000, alpha: 0 });
            }

            // Update center selection indicator position and size
            if (centerSelectionIndicator) {
                centerSelectionIndicator.x = width / 2 - width * 0.03; // Offset for better visibility
                centerSelectionIndicator.y = height / 2 + height * 0.02; // Center vertically
                
                const buttonHeight = height * 0.8;
                centerSelectionIndicator.width = buttonHeight * 1.3;
                centerSelectionIndicator.height = buttonHeight;
            }

            // Recreate infinite button layout with new dimensions
            allButtons.forEach(button => contentContainer.removeChild(button));
            allButtons.length = 0;
            
            const newAllButtons = createInfiniteButtonLayout(gridOptions, contentContainer, config, handleSelection);
            allButtons.push(...newAllButtons);

            // Update positions
            updateButtonPositions(currentIndexRef.value, animationState, allButtons, config, gridOptions.length, false);
        },
        
        destroy: () => {
            // Clean up grid dimension listener
            const unsubscribeGridDimensionChange = (container as any).unsubscribeGridDimensionChange;
            if (unsubscribeGridDimensionChange) {
                unsubscribeGridDimensionChange();
            }
            
            ticker.stop();
            ticker.destroy();
            container.destroy({ children: true });
        }
    };

    return gridSelector;
};

export default createGridSelector;