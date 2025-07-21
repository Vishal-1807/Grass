import { Container, Sprite, Assets, Text, TextStyle } from "pixi.js";
import { createButton } from "./commons/Button";
import { GlobalState } from "../globals/gameState";

const createBalanceTab = (appWidth?: number, appHeight?: number) => {
    // Layout constants
    const TAB_WIDTH_RATIO = 0.19;
    const TAB_HEIGHT_RATIO = 0.10;
    const TAB_X_RATIO = 0.1;
    const TAB_Y_RATIO = 0.033;
    const TEXT_X_OFFSET_RATIO = 1.7;
    const TEXT_SIZE_RATIO = 0.11;

    const container = new Container();
    container.zIndex = 100;

    // Balance state - Initialize with balance from GlobalState
    let currentBalance = GlobalState.getBalance();

    // Create balance amount text display
    let balanceAmountText: Text;
    const createBalanceAmountText = () => {
        const textStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 25,
            fill: 0x7DE8EB,
            align: 'center',
            stroke: 0x7DE8EB,
        });

        balanceAmountText = new Text({
            text: `${currentBalance.toFixed(2)}`,
            style: textStyle
        });
        
        balanceAmountText.anchor.set(0.5);
        container.addChild(balanceAmountText);
        
        return balanceAmountText;
    };

    /**
     * Update balance display text
     */
    const updateBalanceDisplay = (newBalance?: number) => {
        if (newBalance !== undefined) {
            currentBalance = newBalance;
        }
        
        console.log(`💳 Current balance display: ${currentBalance}`);
        
        if (balanceAmountText) {
            balanceAmountText.text = `${currentBalance.toFixed(2)}`;
        }
    };

    /**
     * Handle balance tab click (could show balance history or options)
     */
    const handleBalanceTabClick = () => {
        console.log('💳 Balance tab clicked - current balance:', currentBalance);
        updateBalanceDisplay(); // Refresh display when clicked
    };

    // Create the balance button
    const balanceTab = createButton({
        texture: Assets.get('balanceTab'),
        width: (appWidth || window.innerWidth) * TAB_WIDTH_RATIO,
        height: (appHeight || window.innerHeight) * TAB_HEIGHT_RATIO,
        x: (appWidth || window.innerWidth) * TAB_X_RATIO,
        y: (appHeight || window.innerHeight) * TAB_Y_RATIO,
        anchorX: 0,
        anchorY: 0,
        onClick: handleBalanceTabClick
    });
    container.addChild(balanceTab);

    const updateLayout = (width: number, height: number) => {
        // Update balance button size and position
        balanceTab.width = width * TAB_WIDTH_RATIO;
        balanceTab.height = height * TAB_HEIGHT_RATIO;
        balanceTab.x = width * TAB_X_RATIO;
        balanceTab.y = height * TAB_Y_RATIO;

        // Update balance amount text position and size
        if (balanceAmountText) {
            // Position the text in the center of the balance tab
            balanceAmountText.x = balanceTab.x + (balanceTab.width / TEXT_X_OFFSET_RATIO);
            balanceAmountText.y = balanceTab.y + (balanceTab.height / 2);
            
            // Scale text based on button size
            const fontSize = balanceTab.width * TEXT_SIZE_RATIO;
            balanceAmountText.style = new TextStyle({
                fontFamily: 'Arial',
                fontSize: fontSize,
                fill: 0x7DE8EB,
                align: 'center',
                stroke: 0x7DE8EB,
            });
        }

        if ((balanceTab as any).resize) {
            (balanceTab as any).resize(width, height);
        }
    };

    // Initialize components
    createBalanceAmountText();
    updateLayout(appWidth || window.innerWidth, appHeight || window.innerHeight);

    // Update display with current balance from GlobalState
    updateBalanceDisplay();

    // Listen for balance changes from GlobalState
    GlobalState.addBalanceChangeListener((newBalance: number) => {
        currentBalance = newBalance;
        updateBalanceDisplay();
        console.log('💳 BalanceTab: Updated balance from GlobalState:', newBalance);
    });

    // Expose public methods
    (container as any).resize = updateLayout;
    (container as any).updateBalanceDisplay = updateBalanceDisplay;
    (container as any).setBalance = (balance: number) => {
        currentBalance = balance;
        updateBalanceDisplay();
    };
    (container as any).getBalance = () => currentBalance;

    return container;
}

export default createBalanceTab;