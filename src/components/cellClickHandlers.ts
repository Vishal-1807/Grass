// cellClickHandlers.ts - Refactored cell click logic from mines.ts
import { GlobalState } from '../globals/gameState';
import { cellClickEvents, roundEndEvents } from '../WebSockets/cellClickEvents';
import { recordUserActivity, ActivityTypes } from '../utils/gameActivityManager';
import { SoundManager } from '../utils/SoundManager';
import { getTextAPI } from '../utils/textManager';

export interface CellClickContext {
    container: any;
    minesGrid: any;
    currentCols: number;
    markAnimationsStarting: () => void;
    markAnimationsComplete: () => void;
    triggerForwardMovementAnimation: (callback?: () => void) => void;
    startButton?: any;
}

export class CellClickHandlers {
    private context: CellClickContext;
    private text = getTextAPI();

    constructor(context: CellClickContext) {
        this.context = context;
    }

    /**
     * Main cell click handler - validates and routes to appropriate handler
     */
    async handleCellClick(row: number, col: number): Promise<void> {
        recordUserActivity(ActivityTypes.CELL_CLICK);
        console.log(`Cell clicked: row ${row}, col ${col}`);

        // Validate game state
        if (!this.validateGameState(row)) {
            return;
        }

        console.log(`✅ Valid cell click on current row ${GlobalState.getCurrentRow()}, col ${col}`);

        // Prepare for cell click processing
        this.prepareForCellClick(row);

        try {
            // Call cellClickEvents from cellClickEvents.ts
            const result = await cellClickEvents(row, col) as { hitMine: boolean; response: any };
            console.log('📡 Cell click response received:', result);

            // Route to appropriate handler based on result
            if (result.hitMine) {
                await this.handleMineHit(row, col);
            } else {
                await this.handleSafeCell(row, col);
            }
        } catch (error) {
            console.error('❌ Cell click failed:', error);
            this.handleCellClickError(row);
        }
    }

    /**
     * Validates if the cell click is allowed
     */
    private validateGameState(row: number): boolean {
        // Check if game has started
        if (!GlobalState.getGameStarted()) {
            console.warn('🚫 Cell click blocked - game not started');
            return false;
        }

        // Only allow clicks on the current row (green overlay cells)
        const currentRow = GlobalState.getCurrentRow();
        if (row !== currentRow) {
            console.warn(`🚫 Cell click blocked - can only click on current row ${currentRow}, clicked row ${row}`);
            return false;
        }

        return true;
    }

    /**
     * Prepares the game state for cell click processing
     */
    private prepareForCellClick(row: number): void {
        // Disable mines container immediately to prevent further clicks during processing
        if (this.context.container?.disableContainer) {
            this.context.container.disableContainer();
            console.log('🔒 Mines container disabled during cell click processing');
        }

        // Mark animations as starting to hide collect button during animations
        this.context.markAnimationsStarting();

        // Set entire row to pressed state immediately
        const grid = this.context.minesGrid;
        if (grid?.setRowPressed) {
            grid.setRowPressed(row, true);
            console.log(`🔽 Row ${row} set to pressed state`);
        }

        // Switch current row back to static background when clicked
        if (grid?.setRowAnimatedBackground) {
            grid.setRowAnimatedBackground(row, false);
            console.log(`🎬 Row ${row} background switched back to static after click`);
        }
    }

    /**
     * Handles mine hit scenario
     */
    private async handleMineHit(row: number, col: number): Promise<void> {
        const grid = this.context.minesGrid;
        
        SoundManager.playBombExplode();
        this.text.showPressStart();
        
        // Mine hit - show mine overlay and blast animation
        console.log('💥 Mine hit! Showing mine overlay and blast animation');
        
        // Play blast animation
        if (grid?.playBlastAnimation) {
            grid.playBlastAnimation(row, col);
        }
        if (grid?.addMineOverlay) {
            grid.addMineOverlay(row, col);
        }

        try {
            // Send round_end event for mine hit
            console.log('📡 Sending round_end event for mine hit...');
            const roundEndResult = await roundEndEvents('mine_hit');
            console.log('✅ Round end event successful:', roundEndResult);

            // Reveal all remaining mines
            this.revealAllRemainingMines(row);

        } catch (roundEndError) {
            console.error('❌ Round end event failed:', roundEndError);
            // Continue with game over logic even if round end fails
        }

        // Reset game state after mine explosion
        this.resetGameStateAfterMineHit();

        // Mark animations as complete after mine explosion animations are done
        this.context.markAnimationsComplete();

        // Temporarily hide buttons for 1 second after mine explosion
        if (this.context.startButton?.temporarilyHideButtons) {
            this.context.startButton.temporarilyHideButtons();
        }
    }

    /**
     * Reveals all remaining mines after a mine hit
     */
    private revealAllRemainingMines(currentRow: number): void {
        const gameMatrix = GlobalState.game_matrix;
        const grid = this.context.minesGrid;
        
        if (gameMatrix && gameMatrix.length > 0) {
            const totalRows = GlobalState.total_rows;
            const startMatrixRowIndex = totalRows - (currentRow + 1);

            console.log(`💣 Mine exploded! Revealing all mines from matrix row ${startMatrixRowIndex} to end`);

            // Loop through all remaining rows from current row to the end
            for (let matrixRowIndex = startMatrixRowIndex; matrixRowIndex < gameMatrix.length; matrixRowIndex++) {
                const matrixRow = gameMatrix[matrixRowIndex];
                if (matrixRow) {
                    // Calculate the visual row for this matrix row
                    const visualRow = totalRows - (matrixRowIndex + 1);

                    // Check each column in this row for mines
                    for (let colIndex = 0; colIndex < matrixRow.length && colIndex < this.context.currentCols; colIndex++) {
                        const cellValue = matrixRow[colIndex];

                        // If this cell contains a mine, show bomb overlay
                        if (cellValue === 'MINE') {
                            console.log(`💣 Revealing mine at visual position (${visualRow}, ${colIndex})`);
                            if (grid?.addBombOverlay) {
                                grid.addBombOverlay(visualRow, colIndex);
                            }
                        }
                    }
                }
            }
        } else {
            console.warn('⚠️ No revealed matrix available to show remaining mines');
        }
    }

    /**
     * Resets game state after mine hit
     */
    private resetGameStateAfterMineHit(): void {
        const grid = this.context.minesGrid;
        
        console.log('💥 Mine exploded - resetting essential game state');

        // Update row tinting after mine explosion - show progress up to where player reached
        if (grid?.updateRowTinting) {
            const currentRowBeforeReset = GlobalState.getCurrentRow();
            // Keep rows from currentRow down to 0 untinted (accessible/completed)
            // Keep rows above currentRow tinted (inaccessible)
            grid.updateRowTinting(currentRowBeforeReset);
            console.log(`🎨 Row tinting maintained after mine explosion - accessible rows 0-${currentRowBeforeReset} untinted, rows above tinted`);
        }

        // Reset only essential game state variables
        GlobalState.setGameStarted(false);
        GlobalState.setCurrentRow(GlobalState.total_rows - 1); // Reset to bottom row

        console.log('🎮 Game over - start button is now enabled for new game');
    }

    /**
     * Handles safe cell scenario
     */
    private async handleSafeCell(row: number, col: number): Promise<void> {
        const grid = this.context.minesGrid;
        
        SoundManager.playFlagReveal();
        this.text.showYouCanWin(GlobalState.getReward());
        
        // Safe cell - show green flag and reveal mines in current row
        console.log('🟢 Safe cell! Showing green flag and revealing mines in current row');
        if (grid?.addGreenFlag) {
            grid.addGreenFlag(row, col);
        }

        // Show bomb overlays for mines in the current row
        this.revealMinesInCurrentRow(row);

        // Progress to next row or complete game
        await this.progressToNextRowOrComplete(row);
    }

    /**
     * Reveals mines in the current row after safe cell click
     */
    private revealMinesInCurrentRow(row: number): void {
        const gameMatrix = GlobalState.game_matrix;
        const grid = this.context.minesGrid;
        
        if (gameMatrix && gameMatrix.length > 0) {
            // Calculate the matrix row index for the current visual row
            const totalRows = GlobalState.total_rows;
            const matrixRowIndex = totalRows - (row + 1);

            console.log(`🔍 Checking revealed matrix row ${matrixRowIndex} for current visual row ${row}`);

            if (gameMatrix[matrixRowIndex]) {
                const matrixRow = gameMatrix[matrixRowIndex];

                // Check each column in the current row
                for (let colIndex = 0; colIndex < matrixRow.length && colIndex < this.context.currentCols; colIndex++) {
                    const cellValue = matrixRow[colIndex];

                    if (cellValue === 'MINE') {
                        // If this cell contains a mine, show bomb overlay
                        console.log(`💣 Found mine at visual position (${row}, ${colIndex}), showing bomb overlay`);
                        if (grid?.addBombOverlay) {
                            grid.addBombOverlay(row, colIndex);
                        }
                    } else if (cellValue === 'HIDDEN') {
                        // If this cell is hidden, hide green light
                        console.log(`🔵 Found hidden cell at visual position (${row}, ${colIndex}), hiding green light`);
                        if (grid?.hideGreenLight) {
                            grid.hideGreenLight(row, colIndex);
                        }
                    }
                }
            } else {
                console.warn(`⚠️ Matrix row ${matrixRowIndex} not found in revealed matrix`);
            }
        } else {
            console.warn('⚠️ No revealed matrix available to show mine positions');
        }
    }

    /**
     * Progresses to next row or completes the game
     */
    private async progressToNextRowOrComplete(row: number): Promise<void> {
        const newCurrentRow = row - 1;

        if (newCurrentRow >= 0) {
            await this.progressToNextRow(row, newCurrentRow);
        } else {
            await this.completeGame();
        }
    }

    /**
     * Progresses to the next row with animation
     */
    private async progressToNextRow(currentRow: number, newCurrentRow: number): Promise<void> {
        const grid = this.context.minesGrid;

        console.log(`⬆️ Progressing from row ${currentRow} to row ${newCurrentRow} with forward movement animation`);

        // Update the current row in global state first
        GlobalState.setCurrentRow(newCurrentRow);

        // Trigger forward movement animation with callback to update overlays
        this.context.triggerForwardMovementAnimation(() => {
            // Switch the new current row to green overlays after animation
            if (grid?.setRowGreenOverlay) {
                grid.setRowGreenOverlay(newCurrentRow, true);
                console.log(`🟢 Row ${newCurrentRow} overlays switched to green (new current row) after animation`);
            }

            // Switch the new current row to animated background after animation
            if (grid?.setRowAnimatedBackground) {
                grid.setRowAnimatedBackground(newCurrentRow, true);
                console.log(`🎬 Row ${newCurrentRow} background switched to animated (new current row) after animation`);
            }

            // Update row tinting for the new current row
            if (grid?.updateRowTinting) {
                grid.updateRowTinting(newCurrentRow);
                console.log(`🎨 Row tinting updated for new current row ${newCurrentRow} after animation`);
            }

            // Mark animations as complete after all cell click animations are done
            this.context.markAnimationsComplete();
        });
    }

    /**
     * Completes the game when reaching the top row
     */
    private async completeGame(): Promise<void> {
        const grid = this.context.minesGrid;

        console.log('🎉 Game completed! Reached the top row.');
        SoundManager.playGameComplete();

        // Remove all row tinting after game completion - player won, all rows should be untinted
        if (grid?.updateRowTinting) {
            // Set to a row that doesn't exist to remove all tinting (player completed the game)
            grid.updateRowTinting(-1);
            console.log(`🎨 All row tinting removed after game completion`);
        }

        // Reset game state after reaching last row
        GlobalState.setGameStarted(false);
        GlobalState.setCurrentRow(GlobalState.total_rows - 1); // Reset to bottom row
        await roundEndEvents('mine_hit');

        // Show win message with current reward
        this.text.showYouWinCollect(GlobalState.getReward());

        const currentReward = GlobalState.getReward();
        console.log(`🏆 Game won by reaching last row! Reward: ${currentReward}`);

        // Mark animations as complete for game completion
        this.context.markAnimationsComplete();

        // Temporarily hide buttons for 1 second after game completion
        if (this.context.startButton?.temporarilyHideButtons) {
            this.context.startButton.temporarilyHideButtons();
        }
    }

    /**
     * Handles cell click errors
     */
    private handleCellClickError(row: number): void {
        const grid = this.context.minesGrid;

        // Reset row pressed state on error
        if (grid?.setRowPressed) {
            grid.setRowPressed(row, false);
        }

        // Mark animations as complete on error to restore button state
        this.context.markAnimationsComplete();
    }
}
