// GridTab.ts - Updated with text display during gameplay
import { Container, Sprite, Assets, Text, TextStyle } from "pixi.js";
import { createButton } from "./commons/Button";
import { createGridSelector } from "./GridSelector";
import { GlobalState } from "../globals/gameState";
import { recordUserActivity, ActivityTypes } from '../utils/gameActivityManager';
import { SoundManager } from "../utils/SoundManager";

/**
 * Creates the grid tab with integrated grid selector and text display during gameplay
 */
const createGridTab = (appWidth: number, appHeight: number, appStage: Container) => {
    const container = new Container();
    container.zIndex = 110; // Higher than bottombar (100)

    const barHeight = appHeight * 0.17;

    // Initialize grid selector and text display
    let gridSelector: ReturnType<typeof createGridSelector> | null = null;
    let gridDisplayText: Text;

    /**
     * Create grid display text (shown during gameplay)
     */
    const createGridDisplayText = () => {
        const textStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 32,
            fontWeight: 'bold',
            fill: 0x7DE8EB,
            align: 'center',
            stroke: 0x000000,
            // strokeThickness: 2,
        });

        gridDisplayText = new Text({
            text: `${GlobalState.total_cols}×${GlobalState.total_rows}`,
            style: textStyle
        });
        
        gridDisplayText.anchor.set(0.5);
        gridDisplayText.visible = false; // Initially hidden
        container.addChild(gridDisplayText);
        
        return gridDisplayText;
    };

    /**
     * Handle grid selection change
     */
    const handleGridSelection = (option: any) => {
        SoundManager.playUIClick();
        recordUserActivity(ActivityTypes.GRID_CHANGE)
        console.log(`🎮 Grid selected: ${option.displayName} (${option.cols}×${option.rows})`);
        
        // GlobalState is automatically updated by the grid selector via setGridDimensions
        // The mines container will be notified via the dimension change listener
        
        // Update text display
        updateGridDisplayText();
        
        // Add visual feedback
        showGridChangeNotification(option.displayName);
    };

    /**
     * Update grid display text with current grid dimensions
     */
    const updateGridDisplayText = () => {
        if (gridDisplayText) {
            gridDisplayText.text = `${GlobalState.total_cols}×${GlobalState.total_rows}`;
        }
    };

    /**
     * Show visual notification for grid change
     */
    const showGridChangeNotification = (gridName: string) => {
        console.log(`✨ Grid changed to: ${gridName}`);
        // Optional: Add temporary visual indicator or toast notification
    };

    /**
     * Handle grid tab click
     */
    const handleGridTabClick = () => {
        console.log('🎮 Grid tab clicked - current grid:', gridSelector?.getCurrentSelection()?.displayName);
        // Could open grid options modal or show grid stats
    };

    /**
     * Switch to text display mode (during gameplay)
     */
    const switchToTextMode = () => {
        console.log('🎮 GridTab: Switching to text display mode');
        if (gridSelector) {
            gridSelector.getContainer().visible = false;
        }
        if (gridDisplayText) {
            gridDisplayText.visible = true;
            updateGridDisplayText();
        }
    };

    /**
     * Switch to interactive mode (when game ends)
     */
    const switchToInteractiveMode = () => {
        console.log('🎮 GridTab: Switching to interactive mode');
        if (gridSelector) {
            gridSelector.getContainer().visible = true;
        }
        if (gridDisplayText) {
            gridDisplayText.visible = false;
        }
    };

    // Create grid tab button
    const gridTabButton = createButton({
        texture: Assets.get('gridTab'),
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        anchorX: 0,
        anchorY: 0,
        onClick: handleGridTabClick
    });
    container.addChild(gridTabButton);

    /**
     * Create and configure grid selector
     */
    const initializeGridSelector = (width: number, height: number) => {
        const barHeight = height * 0.17;
        const selectorWidth = width * 0.14;
        const selectorHeight = barHeight * 0.7;
        const selectorX = width - width * 0.1; // Will be positioned relative to container
        const selectorY = height - height * 0.15; // Offset from grid tab button

        gridSelector = createGridSelector({
            width: selectorWidth,
            height: selectorHeight,
            x: selectorX,
            y: selectorY,
            visibleItems: 3, // Show 3 items at once
            itemSpacing: 10,
            animationDuration: 300, // 300ms smooth animation
            easing: 'easeOut'
        });

        // Handle grid selection changes
        gridSelector.onGridSelectionChange(handleGridSelection);

        container.addChild(gridSelector.getContainer());
        
        console.log('🎮 Grid selector initialized with infinite scrolling');
        console.log(`📊 Initial GlobalState - total_rows: ${GlobalState.total_rows}, total_cols: ${GlobalState.total_cols}`);
    };

    /**
     * Comprehensive layout update function
     */
    const updateLayout = (width: number, height: number) => {
        const barHeight = height * 0.17;
        
        // Calculate responsive button dimensions
        const buttonWidth = width * 0.17;
        const buttonHeight = barHeight * 0.58;
        
        // Position the entire grid tab group on the right side
        const groupX = width - buttonWidth * 1.1 - width * 0.06;
        const groupY = height - barHeight * 0.8;
        
        // Update grid tab button
        gridTabButton.width = buttonWidth;
        gridTabButton.height = buttonHeight;
        gridTabButton.x = groupX;
        gridTabButton.y = groupY;

        // Update grid selector if it exists
        if (gridSelector) {
            const selectorWidth = buttonWidth;
            const selectorHeight = barHeight * 0.7;
            const selectorX = width - width * 0.24;
            const selectorY = height - height * 0.15; // Position above the grid tab button
            
            gridSelector.resize(selectorWidth, selectorHeight, selectorX, selectorY);
        }

        // Update grid display text position and size
        if (gridDisplayText) {
            // Position the text in the center of the grid tab button
            gridDisplayText.x = gridTabButton.x + (gridTabButton.width / 2);
            gridDisplayText.y = gridTabButton.y + (gridTabButton.height / 2);
            
            // Scale text based on button size
            const fontSize = Math.min(28, Math.max(16, buttonHeight * 0.35));
            gridDisplayText.style = new TextStyle({
                fontFamily: 'Arial',
                fontSize: fontSize,
                fontWeight: 'bold',
                fill: 0x7DE8EB,
                align: 'center',
                stroke: 0x000000,
                // strokeThickness: 2,
            });
        }
        
        // Call button resize methods if available
        if ((gridTabButton as any).resize) {
            (gridTabButton as any).resize(width, height);
        }
    };

    // Initialize components
    initializeGridSelector(appWidth, appHeight);
    createGridDisplayText();
    updateLayout(appWidth, appHeight);
    
    // Setup cleanup
    container.on('removed', () => {
        if (gridSelector) {
            gridSelector.destroy();
            gridSelector = null;
        }
    });
    
    // Expose public interface
    const gridTabInterface = {
        resize: updateLayout,
        getGridSelector: () => gridSelector,
        getCurrentGrid: () => gridSelector?.getCurrentSelection(),
        getContainer: () => container,
        switchToTextMode,
        switchToInteractiveMode,
        updateGridDisplayText
    };

    // Assign methods to container for backward compatibility
    (container as any).resize = updateLayout;
    (container as any).getGridSelector = () => gridSelector;
    (container as any).getCurrentGrid = () => gridSelector?.getCurrentSelection();
    (container as any).switchToTextMode = switchToTextMode;
    (container as any).switchToInteractiveMode = switchToInteractiveMode;
    (container as any).updateGridDisplayText = updateGridDisplayText;
    
    return container;
};

export default createGridTab;