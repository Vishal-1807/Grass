import { Container, Sprite, Assets } from "pixi.js";

/**
 * Creates the bottom bar (background only, tabs are separate components)
 */
const createBottombar = (appWidth: number, appHeight: number) => {
    // Layout constants
    const BAR_HEIGHT_RATIO = 1;
    const BAR_WIDTH_PADDING = 10;
    const BAR_X_OFFSET = -5;

    const container = new Container();
    
    const barHeight = appHeight * BAR_HEIGHT_RATIO;
    container.zIndex = 100;

    // Create bottom bar sprite
    const bottomBar = Sprite.from(Assets.get('bottomBar'));
    container.addChild(bottomBar);

    /**
     * Comprehensive layout update function
     */
    const updateLayout = (width: number, height: number) => {
        const barHeight = height * BAR_HEIGHT_RATIO;
        
        // Update bottom bar
        bottomBar.width = width + BAR_WIDTH_PADDING;
        bottomBar.height = barHeight;
        bottomBar.x = BAR_X_OFFSET;
        bottomBar.y = height - barHeight;
    };

    // Initialize layout
    updateLayout(appWidth, appHeight);
    
    // Expose public interface
    (container as any).resize = updateLayout;
    
    return container;
};

export default createBottombar;