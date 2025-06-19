// Toolbar.ts - Generic version with configurable disabled state
import { Application, Container, Sprite, Assets } from 'pixi.js'
import { createButton } from './commons/Button'
import createSettingsPopup from './popups/settings'
import { ActivityTypes, recordUserActivity } from '../utils/gameActivityManager';
import { SoundManager } from '../utils/SoundManager';

const createToolbar = (appWidth: number, appHeight: number, app: Application) => {
    // Layout constants
    const BUTTON_SIZE_RATIO = 0.1;
    const SETTINGS_X_RATIO = 0.94;
    const AUDIO_X_RATIO = 0.86;
    const BUTTON_Y_OFFSET = 20;

    const buttonTextures = {
        music: 'music_sound',
        rules: 'rules',
        history: 'history',
    }

    const container = new Container();
    let settingsPopup: Container | null = null;
    
    container.zIndex = 100;

    // Track disabled state for settings button
    let isSettingsDisabled = false;
    
    // Function to close the settings popup
    const closeSettingsPopup = () => {
        if (settingsPopup) {
            settingsPopup.visible = false;
        }
    };
    
    // Function to toggle the settings popup (only if not disabled)
    const toggleSettingsPopup = () => {
        if (isSettingsDisabled) {
            console.log('⚙️ Settings button is disabled');
            return;
        }

        if (!settingsPopup) {
            settingsPopup = createSettingsPopup({
                width: appWidth,
                height: appHeight,
                onClose: closeSettingsPopup,
                buttonTextures: buttonTextures
            });
            settingsPopup.visible = false;
            app.stage.addChild(settingsPopup);
        }
        
        if (settingsPopup) {
            settingsPopup.visible = !settingsPopup.visible;
        }
    };

    const settingsButton = createButton({
        texture: Assets.get('settings'),
        width: appHeight * BUTTON_SIZE_RATIO, 
        height: appHeight * BUTTON_SIZE_RATIO, 
        x: appWidth * SETTINGS_X_RATIO,
        y: BUTTON_Y_OFFSET,
        anchorX: 0,
        anchorY: 0,
        onClick: () => {
            SoundManager.playPopup();
            recordUserActivity(ActivityTypes.SETTINGS_OPEN);
            if (!isSettingsDisabled) {
                if (!settingsPopup) {
                    settingsPopup = createSettingsPopup({
                        width: appWidth,
                        height: appHeight,
                        onClose: closeSettingsPopup
                    });
                    settingsPopup.visible = false;
                    app.stage.addChild(settingsPopup);
                }
                
                settingsPopup.visible = !settingsPopup.visible;
            } else {
                console.log('⚙️ Settings button is disabled');
            }
        }
    });
    container.addChild(settingsButton);

    const audioButton = createButton({
        texture: Assets.get('audio'),
        width: appHeight * BUTTON_SIZE_RATIO,
        height: appHeight * BUTTON_SIZE_RATIO,
        x: appWidth * AUDIO_X_RATIO,
        y: BUTTON_Y_OFFSET,
        anchorX: 0,
        anchorY: 0,
        onClick: () => {
            SoundManager.playUIClick();
            recordUserActivity(ActivityTypes.AUDIO_TOGGLE);
            // Toggle audio
            if ((audioButton.getChildAt(0) as Sprite).texture === Assets.get('audio')) {
                SoundManager.mute();
                (audioButton.getChildAt(0) as Sprite).texture = Assets.get('audioOff');
            } else {
                SoundManager.unmute();
                (audioButton.getChildAt(0) as Sprite).texture = Assets.get('audio');
            }
        },
    });
    container.addChild(audioButton);

    /**
     * Enable the settings button (normal state)
     */
    const enableSettingsButton = () => {
        console.log('⚙️ Toolbar: Enabling settings button');
        isSettingsDisabled = false;
        settingsButton.alpha = 1.0;
        settingsButton.eventMode = 'static';
    };

    /**
     * Disable the settings button (reduced opacity, no interactions)
     */
    const disableSettingsButton = () => {
        console.log('⚙️ Toolbar: Disabling settings button');
        isSettingsDisabled = true;
        settingsButton.alpha = 0.3;
        settingsButton.eventMode = 'none';
        
        // Close settings popup if it's open
        if (settingsPopup && settingsPopup.visible) {
            settingsPopup.visible = false;
        }
    };

    const updateLayout = (width: number, height: number) => {
        const buttonSize = height * BUTTON_SIZE_RATIO;

        // Update settings button size and position
        settingsButton.width = buttonSize;
        settingsButton.height = buttonSize;
        settingsButton.x = width * SETTINGS_X_RATIO;
        settingsButton.y = BUTTON_Y_OFFSET;

        // Update audio button size and position
        audioButton.width = buttonSize;
        audioButton.height = buttonSize;
        audioButton.x = width * AUDIO_X_RATIO;
        audioButton.y = BUTTON_Y_OFFSET;

        if ((settingsButton as any).resize) {
            (settingsButton as any).resize(width, height);
        }
        if ((audioButton as any).resize) {
            (audioButton as any).resize(width, height);
        }
        
        // Update popup if it exists
        if (settingsPopup) {
            if ((settingsPopup as any).resize) {
                (settingsPopup as any).resize(width, height);
            } else {
                const wasVisible = settingsPopup.visible;
                app.stage.removeChild(settingsPopup);
                settingsPopup = createSettingsPopup({ 
                    width, 
                    height,
                    onClose: closeSettingsPopup 
                });
                settingsPopup.visible = wasVisible;
                app.stage.addChild(settingsPopup);
            }
        }
    };

    // Expose methods
    (container as any).resize = updateLayout;
    (container as any).enableSettingsButton = enableSettingsButton;
    (container as any).disableSettingsButton = disableSettingsButton;
    (container as any).isSettingsDisabled = () => isSettingsDisabled;

    return container;
}

export default createToolbar;