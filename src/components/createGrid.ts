// Create grid cell using the new GridCell component
import { Container, Assets, Sprite, Text, TextStyle } from 'pixi.js';
import { createGridCell } from './GridCell';
import { createGreenLight } from './GreenLight';
import { GlobalState } from '../globals/gameState';
import { getGridOffset } from './constants/gridOffsets';

// Interface for basic grid cell click (simplified)
interface CellClickCallback {
  (row: number, col: number): void;
}

type GridOptions = {
  width: number;
  height: number;
  rows: number;
  cols: number;
  gap?: number;
  cellSize?: number;
  offsetX?: number;
  offsetY?: number;
  multipliers?: number[]; // Array of multiplier values for each row
  
  // Callback for when cell is clicked
  onCellClick?: CellClickCallback;
};

export const createGrid = ({
  width,
  height,
  rows,
  cols,
  gap = 0,
  cellSize = 80,
  offsetX = 0,
  offsetY = 0,
  multipliers = [],
  onCellClick,
}: GridOptions): Container => {
    console.log('Creating simplified grid with dimensions:', { rows, cols, cellSize });
    
    const container = new Container();
    
    // Get textures from Assets (declared internally)
    const tex = Assets.get('grassBox');
    const textCardTex = Assets.get('textCard');

    // Use the passed offsets directly instead of modifying them
    const baseX = offsetX + (width * getGridOffset(rows, cols).offsetX);
    const baseY = offsetY - (height * getGridOffset(rows, cols).offsetY);
    const yStep = cellSize * 0.18; // Increased gap between each cell in the same row to prevent overlap
    const xGap = cellSize * -0.63; // Reduced negative gap to prevent horizontal overlap
    
    // Store grid cell references
    const gridCells: Container[][] = Array(rows).fill(0).map(() => Array(cols).fill(null));

    // Store green light references (independent of grid cells)
    const greenLights: Container[][] = Array(rows).fill(0).map(() => Array(cols).fill(null));
    
    // Create grid cells
    for (let row = 0; row < rows; row++) {
        const xRowShift = cellSize * 0.370; // Keep consistent for all rows
        const yRowShift = cellSize * 0.180; // Keep consistent for all rows
        
        const rowOffsetX = baseX - (row * xRowShift);
        const rowOffsetY = baseY + (row * yRowShift);

        for (let col = 0; col < cols; col++) {
            const x = (col * (cellSize + xGap)) + rowOffsetX;
            const y = rowOffsetY + (col * yStep);

            const cellId = `cell-${row}-${col}`;
            
            // Create grid cell using the new GridCell component (no click handler)
            const cellContainer = createGridCell({
                texture: tex,
                width: cellSize,
                height: cellSize,
                x: 0, // Position will be set on container
                y: 0,
                cellId: cellId,
                row: row,
                col: col,
                // No onClick - cells are non-interactive by default
            });

            // Position the cell container
            cellContainer.x = x;
            cellContainer.y = y;
            cellContainer.zIndex = row;

            container.addChild(cellContainer);
            gridCells[row][col] = cellContainer;

            // Create green light for this cell (initially hidden)
            const greenLightContainer = createGreenLight({
                width: cellSize * 0.5,
                height: cellSize * 0.2,
                x: x + cellSize * 0.25,
                y: y + cellSize * 0.15,
                cellId: `green-${cellId}`,
                row: row,
                col: col,
                onClick: onCellClick ? (cellRow: number, cellCol: number) => {
                    console.log(`Green light clicked: ${cellId} (${cellRow}, ${cellCol})`);
                    onCellClick(cellRow, cellCol);
                } : undefined
            });

            greenLightContainer.visible = false; // Hidden by default
            greenLightContainer.zIndex = row + 100; // Above grid cells

            container.addChild(greenLightContainer);
            greenLights[row][col] = greenLightContainer;
        }

        // Create text card for this row if multiplier data is available
        if (multipliers && multipliers.length > row && textCardTex) {
            createTextCard(row, multipliers[row], rowOffsetX, rowOffsetY, cellSize, cols, container, textCardTex);
        }
    }

    // Function to create text cards for multipliers
    function createTextCard(
        rowIndex: number, 
        multiplierValue: number, 
        rowOffsetX: number, 
        rowOffsetY: number, 
        cellSize: number, 
        cols: number, 
        container: Container, 
        textCardTexture: any
    ) {
        // Calculate row center and bottom positions
        const rowCenterX = rowOffsetX + ((cols - 1) * (cellSize + xGap)) + cellSize * 0.8;
        const rowBottomY = rowOffsetY + ((cols - 1) * yStep) + cellSize * 0.7;
        
        // Create text card sprite
        const textCard = new Sprite(textCardTexture);
        const cardWidth = cellSize * 0.4;
        const cardHeight = cellSize * 0.3;
        
        textCard.width = cardWidth;
        textCard.height = cardHeight;
        textCard.x = rowCenterX;
        textCard.y = rowBottomY + (cellSize * 0.15);
        textCard.anchor.set(0.5);
        textCard.zIndex = 40;
        textCard.rotation = 0.15;
        
        // Create multiplier text
        const multiplierText = new Text({
            text: `${multiplierValue}`,
            style: {
                fontSize: cellSize * 0.13,
                fontFamily: 'Arial',
                fill: 0xFFFFFF,
                align: 'center',
            }
        });
        
        multiplierText.anchor.set(0.5);
        multiplierText.x = textCard.x;
        multiplierText.y = textCard.y;
        multiplierText.zIndex = 50;
        multiplierText.rotation = -0.50
        
        container.addChild(textCard);
        container.addChild(multiplierText);
        
        console.log(`Created text card for row ${rowIndex} with multiplier ${multiplierValue}x`);
    }

    // Public API for external control
    const gridAPI = {
        // Get cell at specific position
        getCell: (row: number, col: number): Container | null => {
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
                return gridCells[row][col];
            }
            return null;
        },

        // Get green light at specific position
        getGreenLight: (row: number, col: number): Container | null => {
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
                return greenLights[row][col];
            }
            return null;
        },
        
        // Trigger cell state changes
        setCellPressed: (row: number, col: number, pressed: boolean) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                const offset = pressed ? cellSize * 0.0 : 0;
                cell.emit('setPressedState', offset);
            }
        },
        
        addMineOverlay: (row: number, col: number) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('addMineOverlay');
            }
        },

        addBombOverlay: (row: number, col: number) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('addBombOverlay');
            }
        },

        playBlastAnimation: (row: number, col: number) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('playBlastAnimation');
            }
        },
        
        addGreenFlag: (row: number, col: number) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('addGreenFlag');
            }
        },
        
        // Green light management
        showGreenLight: (row: number, col: number) => {
            const greenLight = gridAPI.getGreenLight(row, col);
            if (greenLight) {
                greenLight.visible = true;
            }
        },

        hideGreenLight: (row: number, col: number) => {
            const greenLight = gridAPI.getGreenLight(row, col);
            if (greenLight) {
                greenLight.visible = false;
            }
        },
        
        resetCell: (row: number, col: number) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('resetToInitialState');
            }
        },
        
        triggerCellAnimation: (row: number, col: number, animationName: string) => {
            const cell = gridAPI.getCell(row, col);
            if (cell) {
                cell.emit('triggerAnimation', animationName);
            }
        },
        
        // Apply state to entire row
        setRowPressed: (row: number, pressed: boolean) => {
            for (let col = 0; col < cols; col++) {
                gridAPI.setCellPressed(row, col, pressed);
            }
        },
        
        setRowGreenOverlay: (row: number, useGreen: boolean) => {
            for (let col = 0; col < cols; col++) {
                if (useGreen) {
                    gridAPI.showGreenLight(row, col);
                } else {
                    gridAPI.hideGreenLight(row, col);
                }
            }
        },

        setRowAnimatedBackground: (row: number, useAnimated: boolean) => {
            for (let col = 0; col < cols; col++) {
                const cell = gridAPI.getCell(row, col);
                if (cell) {
                    if (useAnimated) {
                        cell.emit('switchToAnimatedBackground');
                    } else {
                        cell.emit('switchToStaticBackground');
                    }
                }
            }
        },

        setRowTint: (row: number, useDarkerTint: boolean) => {
            for (let col = 0; col < cols; col++) {
                const cell = gridAPI.getCell(row, col);
                if (cell) {
                    if (useDarkerTint) {
                        cell.emit('setDarkerTint');
                    } else {
                        cell.emit('removeDarkerTint');
                    }
                }
            }
        },

        updateRowTinting: (currentRow: number) => {
            // Apply darker tint to rows above current row (rows > currentRow)
            // Remove tint from current row and below (rows <= currentRow)
            for (let row = 0; row < rows; row++) {
                const shouldHaveDarkerTint = row > currentRow;
                gridAPI.setRowTint(row, shouldHaveDarkerTint);
            }
            console.log(`Row tinting updated - current row: ${currentRow}, rows above tinted: ${rows - currentRow - 1}`);
        },
        
        resetRow: (row: number) => {
            for (let col = 0; col < cols; col++) {
                gridAPI.resetCell(row, col);
            }
        },
        
        // Reset entire grid
        resetGrid: () => {
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    gridAPI.resetCell(row, col);
                }
            }
        },
        
        // Get grid dimensions
        getDimensions: () => ({ rows, cols }),
        
        // Resize grid
        resize: (newWidth: number, newHeight: number, newCellSize?: number) => {
            console.log('Grid resize requested:', { newWidth, newHeight, newCellSize });
            
            if (newCellSize) {
                // Resize all cells to new size
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const cell = gridCells[row][col];
                        if (cell && (cell as any).resize) {
                            (cell as any).resize(newCellSize, newCellSize);
                        }
                    }
                }
                
                // Recalculate positions based on new cell size
                const baseX = (newWidth * getGridOffset(rows, cols).offsetX);
                const baseY = -(newHeight * getGridOffset(rows, cols).offsetY);
                const yStep = newCellSize * 0.22;
                const xGap = newCellSize * -0.41;
                
                // Update cell positions
                for (let row = 0; row < rows; row++) {
                    const xRowShift = newCellSize * 0.405;
                    const yRowShift = newCellSize * 0.202;
                    
                    const rowOffsetX = baseX - (row * xRowShift);
                    const rowOffsetY = baseY + (row * yRowShift);

                    for (let col = 0; col < cols; col++) {
                        const cell = gridCells[row][col];
                        const greenLight = greenLights[row][col];

                        if (cell) {
                            const x = (col * (newCellSize + xGap)) + rowOffsetX;
                            const y = rowOffsetY + (col * yStep);

                            cell.x = x;
                            cell.y = y;

                            // Also update green light position
                            if (greenLight) {
                                greenLight.x = x;
                                greenLight.y = y;
                                // Resize green light if it has a resize method
                                if ((greenLight as any).resize) {
                                    (greenLight as any).resize(newCellSize, newCellSize);
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    // Attach API to container
    Object.assign(container, gridAPI);
    
    container.sortableChildren = true;
    
    console.log(`Grid created successfully - ${cols}x${rows} cells`);
    
    return container;
};