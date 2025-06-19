import { Container, Sprite, Assets } from "pixi.js";
import { createButton } from "./commons/Button";
import { recordUserActivity, ActivityTypes } from "../utils/gameActivityManager";
import { SoundManager } from "../utils/SoundManager";

const createHome = (appWidth?: number, appHeight?: number) => {
    // Layout constants
    const BUTTON_SIZE_RATIO = 0.10;
    const BUTTON_X_RATIO = 0.02;
    const BUTTON_Y_RATIO = 0.04;

    const container = new Container();
    container.zIndex = 100;

    // Track disabled state
    let isDisabled = false;

    // Default click handler - can be overridden
    let clickHandler = () => {
        console.log('🏠 Home button clicked - no handler set');
        if (typeof (window as any).redirectToHome === 'function') {
            (window as any).redirectToHome();
        }
    };

    // Create the home button
    const homeButton = createButton({
        texture: Assets.get('home'),
        width: (appHeight || window.innerHeight) * BUTTON_SIZE_RATIO,
        height: (appHeight || window.innerHeight) * BUTTON_SIZE_RATIO,
        x: (appWidth || window.innerWidth) * BUTTON_X_RATIO,
        y: (appHeight || window.innerHeight) * BUTTON_Y_RATIO,
        anchorX: 0,
        anchorY: 0,
        onClick: () => {
            SoundManager.playUIClick();
            recordUserActivity(ActivityTypes.BUTTON_CLICK);
            if (!isDisabled) {
                clickHandler();
            } else {
                console.log('🏠 Home button is disabled');
            }
        }
    });
    container.addChild(homeButton);

    /**
     * Enable the home button (normal state)
     */
    const enableButton = () => {
        console.log('🏠 Home: Enabling button');
        isDisabled = false;
        homeButton.alpha = 1.0;
        homeButton.eventMode = 'static';
    };

    /**
     * Disable the home button (reduced opacity, no interactions)
     */
    const disableButton = () => {
        console.log('🏠 Home: Disabling button');
        isDisabled = true;
        homeButton.alpha = 0.3;
        homeButton.eventMode = 'none';
    };

    const updateLayout = (width: number, height: number) => {
        const buttonSize = height * BUTTON_SIZE_RATIO;

        // Update home button size and position
        homeButton.width = buttonSize;
        homeButton.height = buttonSize;
        homeButton.x = width * BUTTON_X_RATIO;
        homeButton.y = height * BUTTON_Y_RATIO;

        if ((homeButton as any).resize) {
            (homeButton as any).resize(width, height);
        }
    };

    // Expose public interface
    (container as any).resize = updateLayout;
    (container as any).enableButton = enableButton;
    (container as any).disableButton = disableButton;
    (container as any).isDisabled = () => isDisabled;
    (container as any).setClickHandler = (handler: () => void) => {
        clickHandler = handler;
    };

    return container;
}

export default createHome;