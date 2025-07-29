// mines.ts - Simplified mines container with original responsiveness
import { Container, Assets, Ticker } from 'pixi.js';
import { createGrid } from './createGrid';
import { getGridOffset } from './constants/gridOffsets';
import { GlobalState } from '../globals/gameState';
import { roundEndEvents } from '../WebSockets/cellClickEvents';
import { getTextAPI } from '../utils/textManager';
import { CellClickHandlers } from './cellClickHandlers';

export const createMines = (appWidth: number, appHeight: number, rows: number, cols: number, startButton?: any) => { // bottomTextDisplay?: any
    const container = new Container();

    let minesGrid: Container;
    let currentAppWidth = appWidth;
    let currentAppHeight = appHeight;
    let currentRows = rows;
    let currentCols = cols;

    // Reference values for 1075x546 viewport (preserve original scaling)
    const initialWidth = 1075;
    const initialHeight = 546;
    const initialCellSize = 150;
    const initialGap = 10;

    // Using text api to update bottomText
    const text = getTextAPI();

    // Track current and target positions for smooth movement
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    // Track initial row for consistent movement direction
    let initialRow = GlobalState.getCurrentRow();
    // Store the original starting row position for resets (mutable for grid dimension changes)
    let originalStartingRow = GlobalState.total_rows - 1;

    // Function to mark animations as starting and hide collect button
    const markAnimationsStarting = () => {
        if (startButton && startButton.markAnimationsStarting) {
            console.log('🎬 Marking cell click animations as starting - hiding collect button');
            startButton.markAnimationsStarting();
        }
    };

    // Function to mark animations as complete and update button visibility
    const markAnimationsComplete = () => {
        if (startButton && startButton.markAnimationsComplete) {
            console.log('🎬 Marking cell click animations as complete');
            startButton.markAnimationsComplete();
        }

        // Re-enable mines container when animations are complete
        if ((container as any).enableContainer) {
            (container as any).enableContainer();
            console.log('🔓 Mines container re-enabled after animations complete');
        }
    };

    // Interface for storing grid state
    interface GridState {
        pressedCells: Set<string>;
        greenOverlayCells: Set<string>;
        mineOverlayCells: Set<string>;
        bombOverlayCells: Set<string>;
        greenFlagCells: Set<string>;
        currentRow: number;
        gameStarted: boolean;
    }

    // Function to capture current grid state
    const captureGridState = (): GridState | null => {
        if (!minesGrid) return null;

        console.log('📸 Capturing current grid state before rebuild');

        const state: GridState = {
            pressedCells: new Set<string>(),
            greenOverlayCells: new Set<string>(),
            mineOverlayCells: new Set<string>(),
            bombOverlayCells: new Set<string>(),
            greenFlagCells: new Set<string>(),
            currentRow: GlobalState.getCurrentRow(),
            gameStarted: GlobalState.getGameStarted()
        };

        const grid = minesGrid as any;
        if (grid && grid.getDimensions) {
            const { rows, cols } = grid.getDimensions();

            // Check each cell for its current state
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const cellContainer = grid.getCell ? grid.getCell(row, col) : null;
                    if (cellContainer) {
                        const cellKey = `${row}-${col}`;

                        // Check if cell is pressed by examining background position
                        // If bg.y > 0, the cell is in pressed state
                        const cellChildren = cellContainer.children;
                        if (cellChildren && cellChildren.length > 0) {
                            const bg = cellChildren[0]; // Background is first child
                            if (bg && bg.y > 0) {
                                state.pressedCells.add(cellKey);
                            }
                        }

                        // Check for overlays by examining cell children
                        cellContainer.children.forEach((child: any) => {
                            if (child.userData) {
                                // Check for mine overlay
                                if (child.userData.isMineOverlay) {
                                    console.log(`📸 Found mine overlay at ${cellKey}`);
                                    state.mineOverlayCells.add(cellKey);
                                }
                                // Check for bomb overlay (grenade idle or bomb overlay)
                                if (child.userData.isGrenadeIdleOverlay || child.userData.isBombOverlay) {
                                    console.log(`📸 Found bomb overlay at ${cellKey} (type: ${child.userData.isGrenadeIdleOverlay ? 'grenade' : 'bomb'})`);
                                    state.bombOverlayCells.add(cellKey);
                                }
                                // Check for green flag (flag idle or green flag overlay)
                                if (child.userData.isFlagIdleOverlay || child.userData.isGreenFlagOverlay) {
                                    console.log(`📸 Found green flag at ${cellKey} (type: ${child.userData.isFlagIdleOverlay ? 'flag-idle' : 'green-flag'})`);
                                    state.greenFlagCells.add(cellKey);
                                }
                            }
                        });

                        // Check for green lights (now independent components)
                        const grid = minesGrid as any;
                        if (grid && grid.getGreenLight) {
                            const greenLight = grid.getGreenLight(row, col);
                            if (greenLight && greenLight.visible) {
                                console.log(`📸 Found visible green light at ${cellKey}`);
                                state.greenOverlayCells.add(cellKey);
                            }
                        }
                    }
                }
            }
        }

        console.log('📸 Grid state captured:', {
            pressedCells: state.pressedCells.size,
            greenOverlayCells: state.greenOverlayCells.size,
            mineOverlayCells: state.mineOverlayCells.size,
            bombOverlayCells: state.bombOverlayCells.size,
            greenFlagCells: state.greenFlagCells.size,
            currentRow: state.currentRow,
            gameStarted: state.gameStarted
        });

        return state;
    };

    // Function to restore grid state after rebuild
    const restoreGridState = (state: GridState) => {
        if (!state || !minesGrid) return;

        console.log('🎨 Restoring grid state after rebuild');

        const grid = minesGrid as any;

        // Restore pressed cells
        console.log(`🎨 Restoring ${state.pressedCells.size} pressed cells`);
        state.pressedCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            console.log(`🎨 Restoring pressed state for cell ${cellKey}`);
            if (grid.setCellPressed) {
                grid.setCellPressed(row, col, true);
            }
        });

        // Restore green light cells
        console.log(`🎨 Restoring ${state.greenOverlayCells.size} green light cells`);
        state.greenOverlayCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            console.log(`🎨 Restoring green light for cell ${cellKey}`);
            if (grid.showGreenLight) {
                grid.showGreenLight(row, col);
            }
        });

        // Restore mine overlay cells
        console.log(`🎨 Restoring ${state.mineOverlayCells.size} mine overlay cells`);
        state.mineOverlayCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            console.log(`🎨 Restoring mine overlay for cell ${cellKey}`);
            if (grid.addMineOverlay) {
                grid.addMineOverlay(row, col);
            }
        });

        // Restore bomb overlay cells
        console.log(`🎨 Restoring ${state.bombOverlayCells.size} bomb overlay cells`);
        state.bombOverlayCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            console.log(`🎨 Restoring bomb overlay for cell ${cellKey}`);
            if (grid.addBombOverlay) {
                grid.addBombOverlay(row, col);
            }
        });

        // Restore green flag cells
        console.log(`🎨 Restoring ${state.greenFlagCells.size} green flag cells`);
        state.greenFlagCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            console.log(`🎨 Restoring green flag for cell ${cellKey}`);
            if (grid.addGreenFlag) {
                grid.addGreenFlag(row, col);
            }
        });

        console.log('🎨 Grid state restoration completed');
    };

    // Function to create or update the grid
    const buildGrid = (width: number, height: number, newRows?: number, newCols?: number, preserveState: boolean = true) => {
        // Update dimensions if provided
        if (newRows !== undefined && newCols !== undefined) {
            currentRows = newRows;
            currentCols = newCols;
            console.log(`Building grid with NEW dimensions: ${newCols}x${newRows}`);
        }

        // Capture current state before destroying grid (only if preserveState is true)
        let savedState: GridState | null = null;
        if (preserveState && minesGrid) {
            savedState = captureGridState();
        }

        // Remove existing grid if it exists with thorough cleanup
        if (minesGrid) {
            console.log('🧹 Performing thorough cleanup of existing grid before rebuilding');

            // Remove from container
            container.removeChild(minesGrid);

            // Destroy the old grid completely to free memory and prevent lingering references
            if (minesGrid.destroy) {
                minesGrid.destroy({ children: true, texture: false });
                console.log('🗑️ Old grid destroyed completely');
            }

            // Clear the reference
            minesGrid = null as any;
        }

        // Calculate scaled values based on current viewport (preserve original scaling)
        const scaleFactor = Math.min(width / initialWidth, height / initialHeight);
        const cellSize = currentRows > 1 ? initialCellSize * scaleFactor * 1.2 : initialCellSize * scaleFactor * 1.5;
        const gap = initialGap * scaleFactor;

        // Get grid offsets based on NEW dimensions
        const { offsetX, offsetY } = getGridOffset(currentRows, currentCols);

        // Scale offsets according to the viewport size (preserve original logic)
        const scaledOffsetX = 0;
        const scaledOffsetY = 0;

        // Get multipliers from GlobalState based on NEW grid configuration
        const multipliers = GlobalState.getMultipliers ? GlobalState.getMultipliers(currentCols, currentRows) : [];
        console.log(`Using multipliers for ${currentCols}x${currentRows} grid:`, multipliers);

        // Create new grid
        minesGrid = createGrid({
            width: currentAppWidth,
            height: currentAppHeight,
            rows: currentRows,
            cols: currentCols,
            gap: gap,
            cellSize: cellSize,
            offsetX: scaledOffsetX,
            offsetY: scaledOffsetY,
            multipliers: multipliers,
            
            // Game logic cell click handler
            onCellClick: (row: number, col: number) => {
                // Create cell click handlers instance with context
                const cellClickHandlers = new CellClickHandlers({
                    container,
                    minesGrid,
                    currentCols,
                    markAnimationsStarting,
                    markAnimationsComplete,
                    triggerForwardMovementAnimation,
                    startButton
                });

                // Handle the cell click asynchronously
                cellClickHandlers.handleCellClick(row, col);
            }
        });

        container.addChild(minesGrid);

        // Restore state after grid is built (only if we have saved state)
        if (savedState && preserveState) {
            console.log('🎨 Restoring grid state after rebuild');
            restoreGridState(savedState);
        }

        console.log(`Grid built - dimensions: ${currentRows}x${currentCols}, cellSize: ${cellSize}`);
    };

    // Function to center the current row in the viewport (preserve original logic)
    const centerCurrentRow = (width: number, height: number, currentRow: number) => {
        if (!minesGrid || currentRow < 0) {
            console.log("Grid not available or row is negative, maintaining current position");
            return;
        }

        const baseCenterX = width / 2;
        const baseCenterY = height / 2;

        const rowsProgressed = initialRow - currentRow;

        const xMovementPerRow = width * 0.05;
        const yMovementPerRow = height * 0.05;

        const adjustedCenterX = baseCenterX - (rowsProgressed * xMovementPerRow);
        const adjustedCenterY = baseCenterY + (rowsProgressed * yMovementPerRow);

        targetX = adjustedCenterX - (minesGrid.width / 2);
        targetY = adjustedCenterY - (minesGrid.height / 2);

        if (currentX === 0 && currentY === 0) {
            currentX = targetX;
            currentY = targetY;
        }

        console.log(`Row ${currentRow} - centered at (${targetX}, ${targetY})`);
    };

    // Handle grid dimension changes
    const handleGridDimensionChange = (newCols: number, newRows: number) => {
        console.log(`Grid dimension change: ${currentCols}x${currentRows} -> ${newCols}x${newRows}`);

        if (newCols !== currentCols || newRows !== currentRows) {
            // Reset positioning
            currentX = 0;
            currentY = 0;
            targetX = 0;
            targetY = 0;

            // Update initial row for new grid size
            const newStartingRow = newRows - 1;
            initialRow = newStartingRow;
            // Update the original starting row for the new grid size
            originalStartingRow = newRows - 1;

            // Stop any ongoing animation
            if (animationState) {
                animationState.isAnimating = false;
            }

            // Rebuild grid with new dimensions (don't preserve state since dimensions changed)
            buildGrid(currentAppWidth, currentAppHeight, newRows, newCols, false);

            // Center the new grid at the new starting position
            if (minesGrid) {
                centerCurrentRow(currentAppWidth, currentAppHeight, newStartingRow);
                container.x = currentX;
                container.y = currentY;
            }

            console.log(`Grid dimension change completed - new size: ${newCols}x${newRows}, new starting row: ${originalStartingRow}`);
        }
    };

    // Restart function
    const restartGrid = () => {
        console.log('=== RESTARTING GRID ===');

        // Reset positioning to original starting position
        currentX = 0;
        currentY = 0;
        targetX = 0;
        targetY = 0;
        initialRow = originalStartingRow; // Use original starting row, not current progressed row

        // Stop any ongoing animation
        if (animationState) {
            animationState.isAnimating = false;
        }

        // Rebuild grid (don't preserve state since it's a restart)
        buildGrid(currentAppWidth, currentAppHeight, currentRows, currentCols, false);

        // Reset position to original starting position
        if (minesGrid) {
            centerCurrentRow(currentAppWidth, currentAppHeight, originalStartingRow);
            container.x = currentX;
            container.y = currentY;
            console.log(`📍 Grid restarted at original starting position for row ${originalStartingRow}`);
        }

        console.log('=== GRID RESTART COMPLETE ===');
    };

    // Initial grid build (no state to preserve)
    buildGrid(appWidth, appHeight, rows, cols, false);

    // Set initial container position
    if (minesGrid) {
        centerCurrentRow(appWidth, appHeight, initialRow);
        container.x = currentX;
        container.y = currentY;
    }

    // Set up animation ticker for smooth movement (preserve original logic)
    const ticker = new Ticker();
    ticker.maxFPS = 60;

    // Animation state for smooth movement
    let animationState = {
        isAnimating: false,
        startTime: 0,
        duration: 800,
        startX: 0,
        startY: 0,
        targetXFinal: 0,
        targetYFinal: 0
    };

    const easeOutCubic = (t: number): number => {
        return 1 - Math.pow(1 - t, 3);
    };

    ticker.add(() => {
        if (!animationState.isAnimating) {
            const easing = 0.12;
            const deltaX = targetX - currentX;
            const deltaY = targetY - currentY;

            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                currentX += deltaX * easing;
                currentY += deltaY * easing;
            } else {
                currentX = targetX;
                currentY = targetY;
            }
        } else {
            const elapsed = Date.now() - animationState.startTime;
            const progress = Math.min(elapsed / animationState.duration, 1);
            const easedProgress = easeOutCubic(progress);

            currentX = animationState.startX + (animationState.targetXFinal - animationState.startX) * easedProgress;
            currentY = animationState.startY + (animationState.targetYFinal - animationState.startY) * easedProgress;

            if (progress >= 1) {
                animationState.isAnimating = false;
                currentX = animationState.targetXFinal;
                currentY = animationState.targetYFinal;
            }
        }

        container.x = currentX;
        container.y = currentY;
    });
    ticker.start();

    const startSmoothAnimation = (newTargetX: number, newTargetY: number) => {
        animationState.isAnimating = true;
        animationState.startTime = Date.now();
        animationState.startX = currentX;
        animationState.startY = currentY;
        animationState.targetXFinal = newTargetX;
        animationState.targetYFinal = newTargetY;
    };

    // Forward movement animation for safe cell clicks
    const triggerForwardMovementAnimation = (callback?: () => void) => {
        console.log('🎬 Starting forward movement animation');

        // Calculate forward movement position (positive Y%, negative X%)
        const forwardMovementX = currentAppWidth * -0.05; // Move left (negative X)
        const forwardMovementY = currentAppHeight * 0.05; // Move down (positive Y)

        // Calculate the forward position relative to current position
        const forwardTargetX = currentX + forwardMovementX;
        const forwardTargetY = currentY + forwardMovementY;

        // First animation: move forward
        const originalDuration = animationState.duration;
        animationState.duration = 300; // Shorter duration for forward movement

        startSmoothAnimation(forwardTargetX, forwardTargetY);

        // Set up callback for when forward animation completes
        const checkForwardComplete = () => {
            if (!animationState.isAnimating) {
                console.log('🎬 Forward movement complete, moving to new row position');

                // Restore original animation duration
                animationState.duration = originalDuration;

                // Calculate the new row position and animate to it
                const newCurrentRow = GlobalState.getCurrentRow();
                centerCurrentRow(currentAppWidth, currentAppHeight, newCurrentRow);
                startSmoothAnimation(targetX, targetY);

                // Execute callback if provided
                if (callback) {
                    callback();
                }

                // Remove this ticker callback
                ticker.remove(checkForwardComplete);
            }
        };

        // Add ticker to check when forward animation completes
        ticker.add(checkForwardComplete);
    };

    // Update layout function for resize events (preserve original logic)
    const updateLayout = (width: number, height: number) => {
        console.log("Resize event - new dimensions:", width, height);

        currentAppWidth = width;
        currentAppHeight = height;

        const currentRow = GlobalState.getCurrentRow();

        // Rebuild grid with current dimensions and preserve state
        buildGrid(width, height, currentRows, currentCols, true);
        centerCurrentRow(width, height, currentRow);

        if (targetX !== 0 || targetY !== 0) {
            currentX = targetX;
            currentY = targetY;
            container.x = currentX;
            container.y = currentY;
        }

        animationState.isAnimating = false;

        console.log(`After resize - Row: ${currentRow}, Position: (${currentX}, ${targetY}), Dimensions: ${currentCols}x${currentRows}`);
    };

    // Subscribe to global state changes
    const unsubscribeGridDimensionChange = GlobalState.addGridDimensionChangeListener ?
        GlobalState.addGridDimensionChangeListener((newCols: number, newRows: number) => {
            console.log('Grid dimension change event received:', { newCols, newRows });
            handleGridDimensionChange(newCols, newRows);
        }) : () => {};

    // Function to restore pending game state
    const restorePendingGameState = () => {
        console.log('🎨 === RESTORING PENDING GAME STATE ===');

        const currentRow = GlobalState.getCurrentRow();
        const totalRows = GlobalState.total_rows;
        const totalCols = GlobalState.total_cols;
        const gameMatrix = GlobalState.game_matrix;

        console.log('🎨 Restoration parameters:', {
            currentRow,
            totalRows,
            totalCols,
            hasGameMatrix: gameMatrix && gameMatrix.length > 0
        });

        // Step 1: Rebuild grid with correct dimensions if needed
        if (currentCols !== totalCols || currentRows !== totalRows) {
            console.log('🎨 Rebuilding grid with restored dimensions');
            buildGrid(currentAppWidth, currentAppHeight, totalRows, totalCols, false);
        }

        // Step 2: Calculate and set grid position based on progress
        const completedRows = totalRows - 1 - currentRow; // How many rows have been completed
        console.log(`🎨 Game progress: ${completedRows} rows completed, current row: ${currentRow}`);

        // if (completedRows > 0) {
        //     // Game has progressed - position grid to show current row
        //     console.log('🎨 Positioning grid for progressed game');

        //     // Calculate the forward movement needed
        //     const cellSize = Math.min(
        //         (currentAppWidth * 0.8) / totalCols,
        //         (currentAppHeight * 0.6) / totalRows
        //     );
        //     const forwardMovement = completedRows * cellSize * 0.8; // Same as forward animation

        //     // Set target position
        //     targetY = forwardMovement;
        //     currentY = targetY;
        //     container.y = currentY;

        //     console.log(`🎨 Grid positioned with forward movement: ${forwardMovement}px`);
        // } else {
            // Game at starting position
            console.log('🎨 Positioning grid at starting position');
            centerCurrentRow(currentAppWidth, currentAppHeight, currentRow);
            container.x = currentX;
            container.y = currentY;
        // }

        // Step 3: Restore overlay states based on game progress
        const grid = minesGrid as any;
        if (grid) {
            console.log('🎨 Restoring overlay states');

            // Reset all overlays first
            if (grid.resetGrid) {
                grid.resetGrid();
            }

            // Set current row to green overlays (clickable)
            if (grid.setRowGreenOverlay) {
                grid.setRowGreenOverlay(currentRow, true);
                console.log(`🎨 Current row ${currentRow} set to green overlays`);
            }

            // Set current row to use animated background
            if (grid.setRowAnimatedBackground) {
                grid.setRowAnimatedBackground(currentRow, true);
                console.log(`🎨 Current row ${currentRow} set to animated background`);
            }

            // Update row tinting for pending game restoration
            if (grid.updateRowTinting) {
                grid.updateRowTinting(currentRow);
                console.log(`🎨 Row tinting updated for restored current row ${currentRow}`);
            }
            console.log('pending restore, completed rows', completedRows);
            // Set completed rows to pressed state if we have game matrix
            if (gameMatrix && gameMatrix.length > 0) {
                for (let completedRowIndex = 0; completedRowIndex < completedRows; completedRowIndex++) {
                    const visualRow = totalRows - 1 - completedRowIndex;

                    if (grid.setRowPressed) {
                        grid.setRowPressed(visualRow, true);
                        console.log(`🎨 Completed row ${visualRow} set to pressed state`);
                    }

                    // Show flags for safe cells and bombs for mines in completed rows
                    const matrixRowIndex = completedRowIndex;
                    if (gameMatrix[matrixRowIndex]) {
                        console.log('pending restore, matrix row', gameMatrix[matrixRowIndex]);
                        for (let col = 0; col < gameMatrix[matrixRowIndex].length && col < totalCols; col++) {
                            const cellValue = gameMatrix[matrixRowIndex][col];
                            if (cellValue === 'SAFE') {
                                if (grid.addGreenFlag) {
                                    grid.addGreenFlag(visualRow, col);
                                    console.log(`🎨 Added green flag at (${visualRow}, ${col}) for safe cell`);
                                }
                            } else if (cellValue === 'MINE') {
                                if (grid.addBombOverlay) {
                                    grid.addBombOverlay(visualRow, col);
                                    console.log(`🎨 Added bomb overlay at (${visualRow}, ${col}) for mine cell`);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Step 4: Enable mines container for resumed game
        if (container && (container as any).enableContainer) {
            (container as any).enableContainer();
            console.log('🎨 Mines container enabled for resumed game');
        }

        // Step 5: Mark animations as complete for pending game restoration
        // This ensures the collect button becomes visible for resumed games
        if (startButton && startButton.markAnimationsComplete) {
            startButton.markAnimationsComplete();
            console.log('🎨 Animations marked as complete for pending game restoration');
        }

        // Step 6: Disable UI components for restored game (since game is already started)
        if (startButton && startButton.disableUIComponents) {
            startButton.disableUIComponents();
            console.log('🎨 UI components disabled for restored game state');
        }

        console.log('🎨 === PENDING GAME STATE RESTORATION COMPLETED ===');

        // Notify that restoration is complete (this will trigger splash screen removal)
        if (GlobalState.triggerPendingGameRestoreComplete) {
            console.log('🎨 Triggering pending game restoration completion notification');
            GlobalState.triggerPendingGameRestoreComplete();
        }
    };

    // Subscribe to pending game restoration
    const unsubscribePendingGameRestore = GlobalState.addPendingGameRestoreListener ?
        GlobalState.addPendingGameRestoreListener(() => {
            console.log('🎨 Mines component received pending game restore trigger');
            restorePendingGameState();
        }) : () => {};

    // Expose methods for external access
    (container as any).restartGrid = restartGrid;
    (container as any).resize = updateLayout;
    
    // Grid control methods
    (container as any).getGrid = () => minesGrid;
    (container as any).getDimensions = () => ({ rows: currentRows, cols: currentCols });
    
    // Example methods to demonstrate grid control
    (container as any).setCellPressed = (row: number, col: number, pressed: boolean) => {
        const grid = minesGrid as any;
        if (grid && grid.setCellPressed) {
            grid.setCellPressed(row, col, pressed);
        }
    };
    
    (container as any).addMineOverlay = (row: number, col: number) => {
        const grid = minesGrid as any;
        if (grid && grid.addMineOverlay) {
            grid.addMineOverlay(row, col);
        }
    };

    (container as any).addBombOverlay = (row: number, col: number) => {
        const grid = minesGrid as any;
        if (grid && grid.addBombOverlay) {
            grid.addBombOverlay(row, col);
        }
    };

    (container as any).playBlastAnimation = (row: number, col: number) => {
        const grid = minesGrid as any;
        if (grid && grid.playBlastAnimation) {
            grid.playBlastAnimation(row, col);
        }
    };
    
    (container as any).addGreenFlag = (row: number, col: number) => {
        const grid = minesGrid as any;
        if (grid && grid.addGreenFlag) {
            grid.addGreenFlag(row, col);
        }
    };
    
    (container as any).setRowGreenOverlay = (row: number, useGreen: boolean) => {
        const grid = minesGrid as any;
        if (grid && grid.setRowGreenOverlay) {
            grid.setRowGreenOverlay(row, useGreen);
        }
    };

    (container as any).hideGreenLight = (row: number, col: number) => {
        const grid = minesGrid as any;
        if (grid && grid.hideGreenLight) {
            grid.hideGreenLight(row, col);
        }
    };
    
    (container as any).resetGrid = () => {
        const grid = minesGrid as any;
        if (grid && grid.resetGrid) {
            grid.resetGrid();
        }
    };
    
    (container as any).triggerCellAnimation = (row: number, col: number, animationName: string) => {
        const grid = minesGrid as any;
        if (grid && grid.triggerCellAnimation) {
            grid.triggerCellAnimation(row, col, animationName);
        }
    };

    // Expose forward movement animation for external use
    (container as any).triggerForwardMovementAnimation = (callback?: () => void) => {
        triggerForwardMovementAnimation(callback);
    };

    // Method to set start button reference after it's created
    (container as any).setStartButton = (startButtonRef: any) => {
        console.log('🔗 Setting start button reference in mines container');
        startButton = startButtonRef;
    };

    // Method to set bottom text display reference
    // (container as any).setBottomTextDisplay = (textDisplayRef: any) => {
    //     console.log('🔗 Setting bottom text display reference in mines container');
    //     bottomTextDisplay = textDisplayRef;
    // };

    // Collect handler function
    (container as any).handleCollect = async () => {
        console.log('🎯 Collect button clicked - handling collect logic');

        try {
            // Send round_end event for collect
            console.log('📡 Sending round_end event for collect...');
            const roundEndResult = await roundEndEvents('collect');
            console.log('✅ Collect round end event successful:', roundEndResult);

            text.showYouWinCollect(GlobalState.getReward());

            // Use the revealed matrix from round end response to show all mines
            const gameMatrix = GlobalState.game_matrix;
            if (gameMatrix && gameMatrix.length > 0) {
                const totalRows = GlobalState.total_rows;
                console.log(`🎯 Collect successful! Revealing all mines in the entire grid`);

                // Loop through all rows in the matrix
                for (let matrixRowIndex = 0; matrixRowIndex < gameMatrix.length; matrixRowIndex++) {
                    const matrixRow = gameMatrix[matrixRowIndex];
                    if (matrixRow) {
                        // Calculate the visual row for this matrix row
                        const visualRow = totalRows - (matrixRowIndex + 1);

                        // Check each column in this row for mines
                        for (let colIndex = 0; colIndex < matrixRow.length && colIndex < currentCols; colIndex++) {
                            const cellValue = matrixRow[colIndex];

                            // If this cell contains a mine, show bomb overlay
                            if (cellValue === 'MINE') {
                                console.log(`💣 Revealing mine at visual position (${visualRow}, ${colIndex}) from collect`);
                                const grid = minesGrid as any;
                                if (grid && grid.addBombOverlay) {
                                    grid.addBombOverlay(visualRow, colIndex);
                                }
                            }
                        }
                    }
                }
            } else {
                console.warn('⚠️ No revealed matrix available to show mines after collect');
            }

            // Switch current row back to static background after collect
            const currentRow = GlobalState.getCurrentRow();
            const grid = minesGrid as any;
            if (grid && grid.setRowAnimatedBackground) {
                grid.setRowAnimatedBackground(currentRow, false);
                console.log(`🎬 Row ${currentRow} background switched back to static after collect`);
            }

            // Remove all row tinting after successful collect - player won, all rows should be untinted
            if (grid && grid.updateRowTinting) {
                // Set to a row that doesn't exist to remove all tinting (player collected successfully)
                grid.updateRowTinting(-1);
                console.log(`🎨 All row tinting removed after successful collect`);
            }

            // Reset game state after successful collect
            console.log('🎯 Collect completed - resetting game state');
            GlobalState.setGameStarted(false);
            GlobalState.setCurrentRow(GlobalState.total_rows - 1); // Reset to bottom row

            // Show win message with current reward
            const currentReward = GlobalState.getReward();
            console.log(`🏆 Game won by collect! Reward: ${currentReward}`);

            // Update bottom text to show win message for 3 seconds, then "Press Start"
            // if (bottomTextDisplay && (bottomTextDisplay as any).api && (bottomTextDisplay as any).api.showWinMessageThenPressStart) {
            //     (bottomTextDisplay as any).api.showWinMessageThenPressStart(currentReward);
            // }

            console.log('🎮 Collect successful - start button is now enabled for new game');

            // Temporarily hide buttons for 1 second after collect
            if (startButton && startButton.temporarilyHideButtons) {
                startButton.temporarilyHideButtons();
            }

        } catch (error) {
            console.error('❌ Collect failed:', error);

            // Switch current row back to static background even on collect failure
            const currentRow = GlobalState.getCurrentRow();
            const grid = minesGrid as any;
            if (grid && grid.setRowAnimatedBackground) {
                grid.setRowAnimatedBackground(currentRow, false);
                console.log(`🎬 Row ${currentRow} background switched back to static after collect failure`);
            }

            // Remove all row tinting after collect failure - reset to clean state
            if (grid && grid.updateRowTinting) {
                // Set to a row that doesn't exist to remove all tinting
                grid.updateRowTinting(-1);
                console.log(`🎨 All row tinting removed after collect failure`);
            }

            // Reset game state even on collect failure
            GlobalState.setGameStarted(false);
            GlobalState.setCurrentRow(GlobalState.total_rows - 1);

            // Temporarily hide buttons for 1 second even on collect failure
            if (startButton && startButton.temporarilyHideButtons) {
                startButton.temporarilyHideButtons();
            }

            throw error; // Re-throw to let the caller handle the error
        }
    };

    // Container state management methods
    (container as any).disableContainer = () => {
        console.log('🔒 Disabling mines container');
        container.eventMode = 'none';
        container.alpha = 0.9;

        // Disable grid interactions if available
        const grid = minesGrid as any;
        if (grid && grid.disableInteractions) {
            grid.disableInteractions();
        }
    };

    (container as any).enableContainer = () => {
        console.log('🔓 Enabling mines container');
        container.eventMode = 'static';
        container.alpha = 1.0;

        // Enable grid interactions if available
        const grid = minesGrid as any;
        if (grid && grid.enableInteractions) {
            grid.enableInteractions();
        }
    };

    // Method to switch current row from blue to green overlays
    (container as any).switchCurrentRowToGreen = () => {
        const currentRow = GlobalState.getCurrentRow();
        console.log(`🟢 Switching current row ${currentRow} from blue to green overlays`);

        const grid = minesGrid as any;
        if (grid && grid.setRowGreenOverlay) {
            grid.setRowGreenOverlay(currentRow, true);
            console.log(`✅ Current row ${currentRow} overlays switched to green`);
        } else {
            console.warn('⚠️ Grid setRowGreenOverlay method not available');
        }

        // Set current row to use animated background
        if (grid && grid.setRowAnimatedBackground) {
            grid.setRowAnimatedBackground(currentRow, true);
            console.log(`🎬 Current row ${currentRow} background switched to animated`);
        } else {
            console.warn('⚠️ Grid setRowAnimatedBackground method not available');
        }

        // Update row tinting - make rows above current row darker
        if (grid && grid.updateRowTinting) {
            grid.updateRowTinting(currentRow);
            console.log(`🎨 Row tinting updated for current row ${currentRow}`);
        }

        // Force update bottom text display to override any lingering win messages
        // if (bottomTextDisplay && (bottomTextDisplay as any).api && (bottomTextDisplay as any).api.forceUpdateTextForCurrentState) {
        //     console.log('🔄 Forcing bottom text update to override any win messages');
        //     (bottomTextDisplay as any).api.forceUpdateTextForCurrentState();
        // }
    };

    // Method to reset all overlays and prepare for fresh start
    (container as any).resetForFreshStart = () => {
        console.log('🔄 Resetting grid for fresh start - performing thorough cleanup');

        // Reset positioning to original starting position
        console.log('🔄 Resetting grid position to original starting position');
        currentX = 0;
        currentY = 0;
        targetX = 0;
        targetY = 0;

        // Reset initialRow to the original starting row
        initialRow = originalStartingRow;

        // Stop any ongoing animation
        if (animationState) {
            animationState.isAnimating = false;
        }

        // Perform thorough cleanup of existing grid before rebuilding
        const grid = minesGrid as any;
        if (grid && grid.resetGrid) {
            console.log('🧹 Performing deep reset of all grid cells and overlays');
            grid.resetGrid();
            console.log('✅ All overlays removed - grid reset to initial state');
        }

        // Force a complete rebuild of the grid to ensure no lingering overlays
        console.log('🔄 Rebuilding grid completely to ensure clean state');
        buildGrid(currentAppWidth, currentAppHeight, currentRows, currentCols, false);

        // Recalculate position for the original starting row
        if (minesGrid) {
            centerCurrentRow(currentAppWidth, currentAppHeight, originalStartingRow);
            container.x = currentX;
            container.y = currentY;
            console.log(`📍 Grid position reset to original starting position for row ${originalStartingRow}`);
        }

        // Set current row to green overlays for new game
        const currentRow = GlobalState.getCurrentRow();
        const newGrid = minesGrid as any;
        if (newGrid && newGrid.setRowGreenOverlay) {
            newGrid.setRowGreenOverlay(currentRow, true);
            console.log(`🟢 Current row ${currentRow} set to green overlays for new game`);
        }

        // // Set current row to use animated background for new game
        // if (newGrid && newGrid.setRowAnimatedBackground) {
        //     newGrid.setRowAnimatedBackground(currentRow, true);
        //     console.log(`🎬 Current row ${currentRow} set to animated background for new game`);
        // }

        // Update row tinting for fresh start
        if (newGrid && newGrid.updateRowTinting) {
            newGrid.updateRowTinting(currentRow);
            console.log(`🎨 Row tinting updated for fresh start current row ${currentRow}`);
        }

        console.log('✅ Fresh start reset completed - grid is clean and ready');
    };

    // Defensive cleanup method to remove any lingering overlays
    (container as any).forceCleanupAllOverlays = () => {
        console.log('🧹 Performing defensive cleanup of all overlays');

        const grid = minesGrid as any;
        if (grid && grid.getDimensions) {
            const { rows, cols } = grid.getDimensions();

            // Force reset every single cell
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (grid.resetCell) {
                        grid.resetCell(row, col);
                    }
                }
            }
            console.log(`✅ Defensive cleanup completed for ${rows}x${cols} grid`);
        }
    };

    // Clean up function
    (container as any).destroy = function() {
        if (unsubscribeGridDimensionChange) {
            unsubscribeGridDimensionChange();
        }
        if (unsubscribePendingGameRestore) {
            unsubscribePendingGameRestore();
        }
        ticker.stop();
        ticker.destroy();
        Container.prototype.destroy.call(this);
    };

    return container;
};

export default createMines;