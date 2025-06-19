import { Container, Sprite, Assets, Text } from 'pixi.js'
import { createButton } from './commons/Button';
import { GlobalState } from '../globals/gameState';
import { startButtonEvents } from '../WebSockets/startEvents';
import { ActivityTypes, recordUserActivity } from '../utils/gameActivityManager';
import { SoundManager } from '../utils/SoundManager';
import { getTextAPI } from '../utils/textManager';
import { createSpriteFromLoadedAssets } from './commons/Sprites';

const createStartButton = (appWidth: number, appHeight: number, minesContainer?: any) => {
    // Layout constants
    const BUTTON_SIZE_RATIO = 0.25;
    const BUTTON_X_RATIO = 0.93; // Position closer to right edge
    const BUTTON_Y_RATIO = 0.65; // Position closer to bottom

    const CLICK_DEBOUNCE_MS = 1000;

    const mainContainer = new Container();
    const startContainer = new Container();
    const collectContainer = new Container();
    const buttonSize = appHeight * BUTTON_SIZE_RATIO;

    // Using text api to update bottomText
    const text = getTextAPI();

    mainContainer.zIndex = 100;
    startContainer.zIndex = 101;
    collectContainer.zIndex = 101;

    // Set initial visibility - start button visible, collect button hidden
    startContainer.visible = true;
    collectContainer.visible = false;

    // Add sub-containers to main container
    mainContainer.addChild(startContainer);
    mainContainer.addChild(collectContainer);

    // Store references to button components
    let startButtonSprite: any = null;
    let collectButtonSprite: any = null;
    let areButtonsInitialized = false;

    // Store references to UI components for disabling during start
    let betTabRef: any = null;
    let gridTabRef: any = null;
    let homeRef: any = null;
    let toolbarRef: any = null;

    // Click debouncing
    let lastClickTime = 0;

    // Functions to disable/enable UI components immediately
    const disableUIComponents = () => {
        console.log('🔒 Disabling UI components immediately...');

        // Disable bet tab
        if (betTabRef && betTabRef.switchToTextMode) {
            betTabRef.switchToTextMode();
        }
        if (betTabRef && betTabRef.disableBetButtons) {
            betTabRef.disableBetButtons();
        }

        // Disable grid tab
        if (gridTabRef && gridTabRef.switchToTextMode) {
            gridTabRef.switchToTextMode();
        }

        // Disable home button
        if (homeRef && homeRef.disableButton) {
            homeRef.disableButton();
        }

        // Disable settings button in toolbar
        if (toolbarRef && toolbarRef.disableSettingsButton) {
            toolbarRef.disableSettingsButton();
        }

        console.log('✅ UI components disabled');
    };

    const enableUIComponents = () => {
        console.log('🔓 Re-enabling UI components...');

        // Re-enable bet tab
        if (betTabRef && betTabRef.switchToInteractiveMode) {
            betTabRef.switchToInteractiveMode();
        }
        if (betTabRef && betTabRef.enableBetButtons) {
            betTabRef.enableBetButtons();
        }

        // Re-enable grid tab
        if (gridTabRef && gridTabRef.switchToInteractiveMode) {
            gridTabRef.switchToInteractiveMode();
        }

        // Re-enable home button
        if (homeRef && homeRef.enableButton) {
            homeRef.enableButton();
        }

        // Re-enable settings button in toolbar
        if (toolbarRef && toolbarRef.enableSettingsButton) {
            toolbarRef.enableSettingsButton();
        }

        console.log('✅ UI components re-enabled');
    };

    // Default click handlers - can be overridden
    let startClickHandler = async () => {
        try {
            console.log('🎮 Start button clicked - preparing for new game');

            // IMMEDIATELY disable UI components to prevent interaction during start process
            console.log('🔒 Immediately disabling UI components...');
            disableUIComponents();

            // Perform defensive cleanup first to ensure no lingering overlays
            if (minesContainer && minesContainer.forceCleanupAllOverlays) {
                minesContainer.forceCleanupAllOverlays();
            }

            // Reset all overlays and prepare for fresh start
            if (minesContainer && minesContainer.resetForFreshStart) {
                minesContainer.resetForFreshStart();
            }

            // Disable mines container before starting
            if (minesContainer && minesContainer.disableContainer) {
                minesContainer.disableContainer();
            }

            // Call startButtonEvents from startEvents.ts
            const startSuccess = await startButtonEvents();

            if (startSuccess) {
                console.log('✅ Start events completed successfully - enabling mines container');

                // Enable mines container after successful start
                if (minesContainer && minesContainer.enableContainer) {
                    minesContainer.enableContainer();
                }

                // Switch current row from blue to green overlays
                if (minesContainer && minesContainer.switchCurrentRowToGreen) {
                    minesContainer.switchCurrentRowToGreen();
                }

                // Update game state
                GlobalState.setGameStarted(true);
            } else {
                console.log('❌ Start events failed - re-enabling UI components');

                // Re-enable UI components on failure
                enableUIComponents();

                // Re-enable mines container on error
                if (minesContainer && minesContainer.enableContainer) {
                    minesContainer.enableContainer();
                }

                // Ensure game state is reset on failure
                GlobalState.setGameStarted(false);
            }

        } catch (error) {
            console.error('❌ Start events failed:', error);

            // Re-enable UI components on failure
            console.log('🔓 Re-enabling UI components after start failure...');
            enableUIComponents();

            // Re-enable mines container on error
            if (minesContainer && minesContainer.enableContainer) {
                minesContainer.enableContainer();
            }

            // Ensure game state is reset on failure
            GlobalState.setGameStarted(false);
        }
    };

    let collectClickHandler = async () => {
        console.log('🎯 Collect button clicked - calling mines container collect handler');

        try {
            // Disable mines container before starting
            if (minesContainer && minesContainer.disableContainer) {
                minesContainer.disableContainer();
            }
            // Call the mines container's collect handler
            if (minesContainer && minesContainer.handleCollect) {
                // Collect handled and TEXT update called in mines
                await minesContainer.handleCollect(); 
                console.log('✅ Mines container collect handler completed successfully');
            } else {
                console.warn('⚠️ Mines container collect handler not available');
                // Fallback behavior: set game as not started
                GlobalState.setGameStarted(false);
            }
        } catch (error) {
            console.error('❌ Collect handler failed:', error);
            // Ensure game state is reset on failure
            GlobalState.setGameStarted(false);
        }
    };

    // Internal click handlers with debouncing
    const handleStartClick = async () => {
        text.showClickGreenCell();
        recordUserActivity(ActivityTypes.GAME_START);
        const now = Date.now();
        if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
            console.log('Click ignored - too rapid');
            return;
        }
        lastClickTime = now;

        try {
            console.log('=== START BUTTON CLICKED ===');
            await startClickHandler();
            SoundManager.playStartClick();
            console.log('=== START BUTTON HANDLER COMPLETED ===');
        } catch (error) {
            console.error('=== START BUTTON HANDLER FAILED ===', error);
        }
    };

    const handleCollectClick = async () => {
        recordUserActivity(ActivityTypes.COLLECT_CLICK);
        // Same debounce logic as start button
        const now = Date.now();
        if (now - lastClickTime < CLICK_DEBOUNCE_MS) return;
        lastClickTime = now;

        try {
            console.log('=== COLLECT BUTTON CLICKED ===');
            await collectClickHandler();
            SoundManager.playCollectClick();
            console.log('=== COLLECT BUTTON HANDLER COMPLETED ===');
        } catch (error) {
            console.error('=== COLLECT BUTTON HANDLER FAILED ===', error);
        }
    };

    // Create start and collect button sprites
    const createButtonSprites = () => {
        try {
            console.log('Creating start and collect button sprites...');

            // Check if animated sprites are available
            const useAnimatedStart = Assets.get('startbuttonSprite') !== undefined;
            const useAnimatedCollect = Assets.get('collectbuttonSprite') !== undefined;

            if (useAnimatedStart) {
                // Create animated start button
                createSpriteFromLoadedAssets('startbuttonSprite', {
                    x: appWidth * BUTTON_X_RATIO,
                    y: appHeight * BUTTON_Y_RATIO,
                    width: buttonSize,
                    height: buttonSize,
                    animationSpeed: 0.3,
                    loop: true,
                    autoplay: true,
                    anchor: 0.5
                }).then(sprite => {
                    startButtonSprite = sprite;
                    startButtonSprite.eventMode = 'static';
                    startButtonSprite.cursor = 'pointer';
                    startButtonSprite.on('pointerdown', handleStartClick);
                    startButtonSprite.zIndex = 100;
                    startContainer.addChild(startButtonSprite);
                });
            } else {
                // Fallback to static texture
                startButtonSprite = createButton({
                    texture: Assets.get('startButton'),
                    width: buttonSize,
                    height: buttonSize,
                    x: appWidth * BUTTON_X_RATIO,
                    y: appHeight * BUTTON_Y_RATIO,
                    anchorX: 0.5,
                    anchorY: 0.5,
                    onClick: handleStartClick
                });
                startButtonSprite.zIndex = 100;
                startContainer.addChild(startButtonSprite);
            }

            if (useAnimatedCollect) {
                // Create animated collect button
                createSpriteFromLoadedAssets('collectbuttonSprite', {
                    x: appWidth * BUTTON_X_RATIO,
                    y: appHeight * BUTTON_Y_RATIO,
                    width: buttonSize,
                    height: buttonSize,
                    animationSpeed: 0.3,
                    loop: true,
                    autoplay: true,
                    anchor: 0.5
                }).then(sprite => {
                    collectButtonSprite = sprite;
                    collectButtonSprite.eventMode = 'static';
                    collectButtonSprite.cursor = 'pointer';
                    collectButtonSprite.on('pointerdown', handleCollectClick);
                    collectButtonSprite.zIndex = 100;
                    collectContainer.addChild(collectButtonSprite);
                });
            } else {
                // Fallback to static texture
                collectButtonSprite = createButton({
                    texture: Assets.get('collectButton'),
                    width: buttonSize,
                    height: buttonSize,
                    x: appWidth * BUTTON_X_RATIO,
                    y: appHeight * BUTTON_Y_RATIO,
                    anchorX: 0.5,
                    anchorY: 0.5,
                    onClick: handleCollectClick
                });
                collectButtonSprite.zIndex = 100;
                collectContainer.addChild(collectButtonSprite);
            }

            console.log('Button sprites created successfully');
            return true;
        } catch (error) {
            console.error('Failed to create button sprites:', error);
            return false;
        }
    };

    // Track animation completion state
    let cellClickAnimationsComplete = false;

    // Track button hiding state
    let isButtonTemporarilyHidden = false;
    let buttonHideTimeout: number | null = null;

    // Function to update button visibility based on game state
    const updateButtonVisibility = () => {
        const gameStarted = GlobalState.getGameStarted();
        const currentRow = GlobalState.getCurrentRow();
        const totalRows = GlobalState.total_rows;

        // Start button: show when game is not started and not temporarily hidden
        startContainer.visible = !gameStarted && !isButtonTemporarilyHidden;

        // Collect button: show when game is started AND not at initial row (totalRows - 1) AND animations are complete AND not temporarily hidden
        const isAtInitialRow = currentRow === totalRows - 1;
        collectContainer.visible = gameStarted && !isAtInitialRow && cellClickAnimationsComplete && !isButtonTemporarilyHidden;

        console.log(`Button visibility updated - Start: ${startContainer.visible}, Collect: ${collectContainer.visible} (gameStarted: ${gameStarted}, currentRow: ${currentRow}, totalRows: ${totalRows}, isAtInitialRow: ${isAtInitialRow}, animationsComplete: ${cellClickAnimationsComplete}, temporarilyHidden: ${isButtonTemporarilyHidden})`);
    };

    // Function to mark cell click animations as complete and update button visibility
    const markAnimationsComplete = () => {
        console.log('🎬 Cell click animations marked as complete');
        cellClickAnimationsComplete = true;
        updateButtonVisibility();
    };

    // Function to reset animation state (called when game starts/resets)
    const resetAnimationState = () => {
        console.log('🔄 Resetting animation state');
        cellClickAnimationsComplete = false;
        updateButtonVisibility();
    };

    // Function to mark animations as starting (hide collect button during animations)
    const markAnimationsStarting = () => {
        console.log('🎬 Cell click animations starting - hiding collect button');
        cellClickAnimationsComplete = false;
        updateButtonVisibility();
    };

    // Function to temporarily hide buttons for 1 second
    const temporarilyHideButtons = () => {
        console.log('⏰ Temporarily hiding buttons for 1 second');

        // Clear any existing timeout
        if (buttonHideTimeout) {
            clearTimeout(buttonHideTimeout);
        }

        // Set temporarily hidden state
        isButtonTemporarilyHidden = true;
        updateButtonVisibility();

        // Set timeout to show buttons again after 1 second
        buttonHideTimeout = setTimeout(() => {
            console.log('⏰ 1 second elapsed - showing buttons again');
            isButtonTemporarilyHidden = false;
            updateButtonVisibility();
            buttonHideTimeout = null;
        }, 1000);
    };

    // Initialize the button components
    const initializeButton = async () => {
        if (areButtonsInitialized) {
            console.log('Buttons already initialized');
            return;
        }

        try {
            console.log('Initializing start and collect buttons...');

            // Create button sprites
            const buttonsCreated = createButtonSprites();
            if (!buttonsCreated) {
                console.error('Failed to create button sprites');
                return;
            }

            // Add listeners for game state changes to automatically update visibility
            GlobalState.addGameStartedListener(() => {
                console.log('Game started - resetting animation state and updating button visibility');
                resetAnimationState(); // Reset animation state when game starts
            });

            GlobalState.addGameEndedListener(() => {
                console.log('Game ended - updating button visibility and re-enabling UI components');
                updateButtonVisibility();
                // Re-enable UI components when game ends
                enableUIComponents();
            });

            // Add listener for current row changes
            GlobalState.addCurrentRowChangeListener((newRow: number) => {
                console.log(`Current row changed to ${newRow} - updating button visibility`);
                updateButtonVisibility();
            });

            areButtonsInitialized = true;
            console.log('✅ Start and collect buttons initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize buttons:', error);
        }
    };

    // Public API
    const buttonAPI = {
        // Initialize the button (call this after assets are loaded)
        initialize: initializeButton,

        // Set custom click handlers
        setStartClickHandler: (handler: () => Promise<void>) => {
            startClickHandler = handler;
        },

        setCollectClickHandler: (handler: () => Promise<void>) => {
            collectClickHandler = handler;
        },

        // Update visibility based on current game state
        updateVisibility: updateButtonVisibility,

        // Get the main container
        getContainer: () => mainContainer,

        // Check if initialized
        isInitialized: () => areButtonsInitialized,

        // Manual state control
        showStart: () => {
            startContainer.visible = true;
            collectContainer.visible = false;
        },

        showCollect: () => {
            startContainer.visible = false;
            collectContainer.visible = true;
        },

        // Get individual containers
        getStartContainer: () => startContainer,
        getCollectContainer: () => collectContainer,

        // Animation control functions
        markAnimationsComplete: markAnimationsComplete,
        markAnimationsStarting: markAnimationsStarting,
        resetAnimationState: resetAnimationState,
        temporarilyHideButtons: temporarilyHideButtons,

        // UI component reference setters
        setBetTabRef: (ref: any) => {
            betTabRef = ref;
            console.log('🔗 BetTab reference set in start button');
        },
        setGridTabRef: (ref: any) => {
            gridTabRef = ref;
            console.log('🔗 GridTab reference set in start button');
        },
        setHomeRef: (ref: any) => {
            homeRef = ref;
            console.log('🔗 Home reference set in start button');
        },
        setToolbarRef: (ref: any) => {
            toolbarRef = ref;
            console.log('🔗 Toolbar reference set in start button');
        },

        // Manual UI control functions
        disableUIComponents: disableUIComponents,
        enableUIComponents: enableUIComponents,

        // Resize method for responsive layout
        resize: (newWidth: number, newHeight: number) => {
            console.log(`Resizing button containers to ${newWidth}x${newHeight}`);
            const newButtonSize = newHeight * BUTTON_SIZE_RATIO;
            const newX = newWidth * BUTTON_X_RATIO;
            const newY = newHeight * BUTTON_Y_RATIO;

            // Update start button position and size
            if (startButtonSprite) {
                startButtonSprite.x = newX;
                startButtonSprite.y = newY;
                startButtonSprite.width = newButtonSize;
                startButtonSprite.height = newButtonSize;
            }

            // Update collect button position and size
            if (collectButtonSprite) {
                collectButtonSprite.x = newX;
                collectButtonSprite.y = newY;
                collectButtonSprite.width = newButtonSize;
                collectButtonSprite.height = newButtonSize;
            }
        }
    };

    // Attach API to main container for external access
    Object.assign(mainContainer, buttonAPI);

    // Auto-initialize the button when created
    setTimeout(() => {
        initializeButton();
    }, 100);

    return mainContainer;
}
export default createStartButton;