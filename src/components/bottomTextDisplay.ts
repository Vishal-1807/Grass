// Simplified bottomTextDisplay.ts - Pure text display component
import { Container, Text, TextStyle } from 'pixi.js';

// Text display states enum for better type safety
enum TextDisplayState {
    PRESS_START = 'PRESS_START',
    CLICK_GREEN_CELL = 'CLICK_GREEN_CELL',
    YOU_CAN_WIN = 'YOU_CAN_WIN', 
    YOU_WIN_COLLECT = 'YOU_WIN_COLLECT'
}

// Interface for text display options
interface BottomTextDisplayOptions {
    width: number;
    height: number;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    animationDuration?: number;
    fadeEffect?: boolean;
}

export const createBottomTextDisplay = (options: BottomTextDisplayOptions) => {
    const {
        width,
        height,
        fontFamily = 'GameFont',
        fontSize = 24,
        fontColor = '0x7DE8EB',
        animationDuration = 300,
        fadeEffect = true
    } = options;

    const container = new Container();
    container.zIndex = 150; // Ensure it's above other UI elements

    // Current state tracking
    let currentState: TextDisplayState = TextDisplayState.PRESS_START;

    // Calculate responsive font sizes
    const baseFontSize = height * 0.05; // Minimum 24px, scales with height
    const largeFontSize = height * 0.05; // For start and win states
    const xlFontSize = height * 0.07; // For victory state

    // Text style configurations for different states
    const textStyles = {
        [TextDisplayState.PRESS_START]: new TextStyle({
            fontFamily,
            fontSize: largeFontSize,
            fill: '0x7DE8EB',
            fontWeight: 'bold',
            align: 'center',
            dropShadow: true,
        }),
        [TextDisplayState.CLICK_GREEN_CELL]: new TextStyle({
            fontFamily,
            fontSize: baseFontSize,
            fill: '0x7DE8EB',
            fontWeight: 'bold',
            align: 'center',
            dropShadow: true,
        }),
        [TextDisplayState.YOU_CAN_WIN]: new TextStyle({
            fontFamily,
            fontSize: baseFontSize,
            fill: '0x7DE8EB',
            fontWeight: 'bold',
            align: 'center',
            dropShadow: true,
        }),
        [TextDisplayState.YOU_WIN_COLLECT]: new TextStyle({
            fontFamily,
            fontSize: xlFontSize,
            fill: '#e59050',
            fontWeight: 'bold',
            align: 'center',
            dropShadow: true,
        })
    };

    // Main text display
    const mainText = new Text('Press Start', textStyles[TextDisplayState.PRESS_START]);
    mainText.anchor.set(0.5);
    container.addChild(mainText);

    // Position the container at bottom center
    const positionContainer = () => {
        container.x = width / 2;
        container.y = height - (height * 0.06); // 6% from bottom for better visibility
        // Center text
        mainText.x = 0;
        mainText.y = 0;
    };

    // Update display based on current state
    const updateDisplay = (newState: TextDisplayState, text: string, immediate: boolean = false) => {
        // Format text based on state
        let displayText = text;
        if (newState === TextDisplayState.YOU_CAN_WIN) {
            displayText = `you can take ${text}`;
        }

        if (newState === TextDisplayState.YOU_WIN_COLLECT) {
            displayText = `you won ${text}`;
        }

        if (currentState === newState && mainText.text === displayText && !immediate) {
            return; // No change needed
        }

        const newStyle = textStyles[newState];

        currentState = newState;
        mainText.text = displayText;
        mainText.style = newStyle;

        if (immediate) {
            positionContainer();
        }
    };

    // Show/hide functionality
    const show = () => {
        container.visible = true;
        mainText.visible = true;
    };

    const hide = () => {
        container.visible = false;
    };

    // Resize function for responsive design
    const updateLayout = (newWidth: number, newHeight: number) => {
        // Recalculate responsive font sizes
        const newBaseFontSize = newHeight * 0.05;
        const newLargeFontSize = newHeight * 0.05;
        const newXlFontSize = newHeight * 0.07;
        
        // Update all text styles with new font sizes
        textStyles[TextDisplayState.PRESS_START].fontSize = newLargeFontSize;
        textStyles[TextDisplayState.CLICK_GREEN_CELL].fontSize = newBaseFontSize;
        textStyles[TextDisplayState.YOU_CAN_WIN].fontSize = newBaseFontSize;
        textStyles[TextDisplayState.YOU_WIN_COLLECT].fontSize = newXlFontSize;

        // Update current text style
        mainText.style = textStyles[currentState];

        // Reposition container with new dimensions
        container.x = newWidth / 2;
        container.y = newHeight - (newHeight * 0.06);
    };

    // Public API for manual control
    const publicAPI = {
        // State-based display methods
        showPressStart: (text: string = 'Press Start') => 
            updateDisplay(TextDisplayState.PRESS_START, text),
        showClickGreenCell: (text: string = 'Click a green cell') => 
            updateDisplay(TextDisplayState.CLICK_GREEN_CELL, text),
        showYouCanWin: (text: string = 'You can win') => 
            updateDisplay(TextDisplayState.YOU_CAN_WIN, text),
        showYouWinCollect: (text: string = 'You won!') => 
            updateDisplay(TextDisplayState.YOU_WIN_COLLECT, text),
        
        // Generic display method
        displayText: (state: TextDisplayState, text: string, immediate?: boolean) =>
            updateDisplay(state, text, immediate),
        
        // Visibility controls
        show,
        hide,
        
        // State getters
        getCurrentState: () => currentState,
        getCurrentText: () => mainText.text,
        isVisible: () => container.visible,
        
        // Force update positioning
        updatePosition: () => positionContainer(),
        
        // Clear text
        clear: () => {
            mainText.text = '';
        }
    };

    // Expose API and resize function
    (container as any).api = publicAPI;
    (container as any).resize = updateLayout;

    // Initialize positioning
    positionContainer();
    show();

    return container;
};

// Export types for external use
export { TextDisplayState };
export type { BottomTextDisplayOptions };