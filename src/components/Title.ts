import { Container, Sprite, Assets } from "pixi.js";
import { createButton } from "./commons/Button";
import { createSpriteFromLoadedAssets } from "./commons/Sprites";

const createTitle = (appWidth?: number, appHeight?: number) => {
    const container = new Container();

    // Layout constants
    const TITLE_WIDTH_RATIO = 0.23;
    const TITLE_HEIGHT_RATIO = 0.13;
    const TITLE_X_RATIO = 0.25; // Distance from right edge
    const TITLE_Y_RATIO = 0.27; // Distance from bottom

    container.zIndex = 100;

    const currentWidth = appWidth || window.innerWidth;
    const currentHeight = appHeight || window.innerHeight;

    // Store reference to the animated title
    let animatedTitle: any = null;
    let isTitleInitialized = false;

    // Create animated title sprite
    const createAnimatedTitle = async () => {
        try {
            console.log('Creating animated title sprite...');
            
            animatedTitle = await createSpriteFromLoadedAssets('titleSprite', {
                x: currentWidth - currentWidth * TITLE_X_RATIO,
                y: currentHeight - currentHeight * TITLE_Y_RATIO,
                width: currentWidth * TITLE_WIDTH_RATIO,
                height: currentHeight * TITLE_HEIGHT_RATIO,
                animationSpeed: 0.3,
                loop: true,
                autoplay: true,
                anchor: 0
            });

            animatedTitle.zIndex = 100;
            container.addChild(animatedTitle);
            
            console.log('Animated title sprite created successfully');
            isTitleInitialized = true;
            
        } catch (error) {
            console.error('Failed to create animated title sprite, falling back to static title:', error);
            
            // Fallback to static title button
            const staticTitleButton = createButton({
                texture: Assets.get('title'),
                width: currentWidth * TITLE_WIDTH_RATIO,
                height: currentHeight * TITLE_HEIGHT_RATIO,
                x: currentWidth - currentWidth * TITLE_X_RATIO,
                y: currentHeight - currentHeight * TITLE_Y_RATIO,
                anchorX: 0,
                anchorY: 0,
            });
            
            animatedTitle = staticTitleButton;
            container.addChild(animatedTitle);
            isTitleInitialized = true;
        }
    };

    const updateLayout = (width: number, height: number) => {
        // Calculate new dimensions
        const newWidth = width * TITLE_WIDTH_RATIO;
        const newHeight = height * TITLE_HEIGHT_RATIO;
        const newX = width - width * TITLE_X_RATIO;
        const newY = height - height * TITLE_Y_RATIO;

        if (animatedTitle && isTitleInitialized) {
            animatedTitle.width = newWidth;
            animatedTitle.height = newHeight;
            animatedTitle.x = newX;
            animatedTitle.y = newY;
            
            console.log('Title layout updated - size:', { width: newWidth, height: newHeight }, 'position:', { x: newX, y: newY });
        }

        if (animatedTitle && (animatedTitle as any).resize) {
            (animatedTitle as any).resize(width, height);
        }
    };

    // Initialize the animated title
    const initializeTitle = async () => {
        await createAnimatedTitle();
        console.log('Title initialization complete');
    };

    initializeTitle().catch(error => {
        console.error('Failed to initialize animated title:', error);
    });

    // Expose resize function
    (container as any).resize = updateLayout;

    // Clean up when container is removed
    container.on('removed', () => {
        if (animatedTitle && animatedTitle.stop) {
            animatedTitle.stop();
        }
        if (animatedTitle && animatedTitle.destroy) {
            animatedTitle.destroy();
        }
    });

    return container;
}

export default createTitle;