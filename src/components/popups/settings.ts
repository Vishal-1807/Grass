// Enhanced settings.ts with pagination support - FIXED VERSION
import { Container, Text, Graphics, Assets, Rectangle, Sprite } from 'pixi.js';
import createPopup, { SidebarButton, ContentSection, PopupDimensions } from '../commons/Popup';
import { loadHistoryPage } from '../../WebSockets/loadHistory';
import { recordUserActivity, ActivityTypes } from '../../utils/gameActivityManager';
import { SoundManager } from '../../utils/SoundManager';
import { createSlider } from '../commons';

interface SoundSettings {
  musicVolume: number;
  sfxVolume: number;
  masterVolume: number;
}

interface HistoryItem {
  roundId: string;
  endTime: number;
  betAmount: number;
  won: number;
  profit: number;
  currency: string;
  revealedMatrix: string[][];
}

interface PaginationInfo {
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface HistoryResponse {
  status: string;
  errorDescription: string;
  history: HistoryItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface SettingsPopupOptions {
  width: number;
  height: number;
  onClose: () => void;
  buttonTextures?: {
    music?: string;
    rules?: string;
    history?: string;
  };
  historyData?: HistoryResponse;
  initialSoundSettings?: SoundSettings;
  onSoundSettingsChange?: (settings: SoundSettings) => void;
  onPageChange?: (page: number) => Promise<HistoryResponse>;
}

// Demo history data with pagination info
const demoHistoryResponse = {
  // Demo data commented out for brevity
};

// Helper function to convert timestamp to human readable date
const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Create pagination controls - FIXED VERSION
const createPaginationControls = (
  pagination: PaginationInfo,
  onPageChange: (page: number) => void,
  dimensions: { width: number; height: number }
): Container => {
  const paginationContainer = new Container();

  const controlHeight = dimensions.height * 1.3;
  const buttonSize = dimensions.height * 0.9;
  const spacing = 8;
  
  // Background for pagination controls
  const bg = new Graphics();
  bg.rect(0, dimensions.height - dimensions.height * 0.4, dimensions.width, controlHeight);
  bg.fill({ color: 0x2C3E50, alpha: 0.8 });
  paginationContainer.addChild(bg);
  
  // Calculate button positions
  const totalButtonsWidth = (buttonSize * 4) + (spacing * 3);
  const startX = (dimensions.width - totalButtonsWidth) / 2;
  
  // Page info text
  const pageInfo = new Text(
    `Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalRecords} total)`,
    {
      fontFamily: 'Roboto',
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'center'
    }
  );
  pageInfo.anchor.set(0.5, 0);
  pageInfo.x = dimensions.width * 0.2;
  pageInfo.y = dimensions.height - dimensions.height * 0.1;
  paginationContainer.addChild(pageInfo);
  
  // Helper function to create pagination button - FIXED
  const createPaginationButton = (
    text: string,
    x: number,
    enabled: boolean,
    onClick: () => void
  ): Container => {
    const buttonContainer = new Container();
    buttonContainer.x = x;
    buttonContainer.y = dimensions.height - dimensions.height * 0.2;
    
    const button = new Graphics();
    button.roundRect(0, 0, buttonSize, buttonSize, 5);
    
    if (enabled) {
      button.fill({ color: 0x4A90E2, alpha: 0.8 });
      button.stroke({ color: 0xFFFFFF, width: 1 });
      button.eventMode = 'static';
      button.cursor = 'pointer';
      
      // FIXED: Proper event handling with immediate execution
      button.on('pointerdown', (event: any) => {
        event.stopPropagation();
        console.log(`🔘 Pagination button clicked: ${text}`);
        onClick();
      });
      
      // Hover effects
      button.on('pointerover', () => {
        button.clear();
        button.roundRect(0, 0, buttonSize, buttonSize, 5);
        button.fill({ color: 0x5BA0F2, alpha: 1 });
        button.stroke({ color: 0xFFFFFF, width: 2 });
      });
      
      button.on('pointerout', () => {
        button.clear();
        button.roundRect(0, 0, buttonSize, buttonSize, 5);
        button.fill({ color: 0x4A90E2, alpha: 0.8 });
        button.stroke({ color: 0xFFFFFF, width: 1 });
      });
    } else {
      button.fill({ color: 0x7F8C8D, alpha: 0.5 });
      button.stroke({ color: 0xBDC3C7, width: 1 });
    }
    
    buttonContainer.addChild(button);
    
    // Button text
    const buttonText = new Text(text, {
      fontFamily: 'Roboto',
      fontSize: 12,
      fill: enabled ? 0xFFFFFF : 0x95A5A6,
      align: 'center',
      fontWeight: 'bold'
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonSize / 2;
    buttonText.y = buttonSize / 2;
    buttonContainer.addChild(buttonText);
    
    return buttonContainer;
  };
  
  // Create buttons with proper callbacks - FIXED
  const firstButton = createPaginationButton(
    '⏮',
    startX,
    pagination.page > 1,
    () => {
      console.log(`🔘 First page clicked - going to page 1`);
      onPageChange(1);
    }
  );
  paginationContainer.addChild(firstButton);
  
  const prevButton = createPaginationButton(
    '◀',
    startX + buttonSize + spacing,
    pagination.page > 1,
    () => {
      console.log(`🔘 Previous page clicked - going to page ${pagination.page - 1}`);
      onPageChange(pagination.page - 1);
    }
  );
  paginationContainer.addChild(prevButton);
  
  const nextButton = createPaginationButton(
    '▶',
    startX + (buttonSize + spacing) * 2,
    pagination.hasNextPage,
    () => {
      console.log(`🔘 Next page clicked - going to page ${pagination.page + 1}`);
      onPageChange(pagination.page + 1);
    }
  );
  paginationContainer.addChild(nextButton);
  
  const lastButton = createPaginationButton(
    '⏭',
    startX + (buttonSize + spacing) * 3,
    pagination.hasNextPage,
    () => {
      console.log(`🔘 Last page clicked - going to page ${pagination.totalPages}`);
      onPageChange(pagination.totalPages);
    }
  );
  paginationContainer.addChild(lastButton);
  
  return paginationContainer;
};

// Enhanced history table with pagination - FIXED VERSION
const createEnhancedHistoryTableWithPagination = (options: any) => {
  const {
    width,
    height,
    historyResponse,
    onViewMatrix,
    onPageChange,
    columns,
    rowHeight,
    headerHeight,
    fontSize,
    headerFontSize,
    alternateRowColors,
    scrollBarWidth
  } = options;

  console.log(`📊 Creating table with pagination. Current page: ${historyResponse?.page}, Total pages: ${historyResponse?.totalPages}`);

  const mainContainer = new Container();
  
  // Reserve space for pagination controls
  const paginationHeight = height * 0.2;
  const tableHeight = height - paginationHeight;
  
  // Transform data for table display
  const transformedData = [
    { datetime: 'Date/Time', bet: 'Bet', profit: 'Profit', won: 'Won', view: '' }, // Header
    ...(historyResponse.history || []).map((item: HistoryItem) => ({
      datetime: formatDateTime(item.endTime),
      bet: `${item.betAmount}`,
      profit: `${item.profit >= 0 ? '+' : ''}${item.profit.toFixed(2)}`,
      won: `${item.won.toFixed(2)}`,
      view: '👁️'
    }))
  ];
  
  // Create table container
  const tableContainer = new Container();
  const contentContainer = new Container();
  
  // Create mask for table content
  const maskWidth = width - 20;
  const mask = new Graphics();
  mask.rect(0, 0, maskWidth, tableHeight);
  mask.fill(0xFFFFFF);
  tableContainer.addChild(mask);
  contentContainer.mask = mask;
  
  // Draw table header
  const headerContainer = new Container();
  let headerX = 0;
  
  // Header background
  const headerBg = new Graphics();
  headerBg.rect(0, 0, maskWidth, headerHeight);
  headerBg.fill({ color: 0x34495E, alpha: 0.9 });
  headerContainer.addChild(headerBg);
  
  // Header texts
  const headerRow = transformedData[0];
  Object.values(headerRow).forEach((cellValue: any, colIndex: number) => {
    const colWidth = maskWidth * columns[colIndex].width;
    
    const headerText = new Text(String(cellValue), {
      fontFamily: 'Roboto',
      fontSize: headerFontSize,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      align: columns[colIndex].align
    });
    
    // Position text based on alignment
    if (columns[colIndex].align === 'center') {
      headerText.anchor.set(0.5, 0.5);
      headerText.x = headerX + colWidth / 2;
    } else if (columns[colIndex].align === 'right') {
      headerText.anchor.set(1, 0.5);
      headerText.x = headerX + colWidth - 10;
    } else {
      headerText.anchor.set(0, 0.5);
      headerText.x = headerX + 10;
    }
    
    headerText.y = headerHeight / 2;
    headerContainer.addChild(headerText);
    
    headerX += colWidth;
  });
  
  // Draw table rows
  const rowsContainer = new Container();
  rowsContainer.y = headerHeight;
  
  transformedData.slice(1).forEach((row: any, rowIndex: number) => {
    const rowContainer = new Container();
    rowContainer.y = rowIndex * rowHeight;
    
    // Row background with alternating colors
    const rowBg = new Graphics();
    rowBg.rect(0, 0, maskWidth, rowHeight);
    rowBg.fill({ 
      color: alternateRowColors && rowIndex % 2 === 1 ? 0x2C3E50 : 0x34495E, 
      alpha: 0.3 
    });
    rowContainer.addChild(rowBg);
    
    // Row cells
    let cellX = 0;
    Object.entries(row).forEach(([key, cellValue]: [string, any], colIndex: number) => {
      const colWidth = maskWidth * columns[colIndex].width;
      
      if (key === 'view') {
        // Create eye button for view column
        const eyeButton = new Container();
        eyeButton.eventMode = 'static';
        eyeButton.cursor = 'pointer';
        
        // Button background
        const buttonBg = new Graphics();
        buttonBg.circle(0, 0, height * 0.03);
        buttonBg.fill({ color: 0x4A90E2, alpha: 0.8 });
        buttonBg.stroke({ color: 0xFFFFFF, width: 2 });
        eyeButton.addChild(buttonBg);
        
        // Eye emoji
        const eyeText = new Text('👁️', {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xFFFFFF
        });
        eyeText.anchor.set(0.5);
        eyeButton.addChild(eyeText);
        
        // Position button
        eyeButton.x = cellX + colWidth / 2;
        eyeButton.y = rowHeight / 2;
        
        // Click handler
        eyeButton.on('pointerdown', (event: any) => {
          event.stopPropagation();
          if (historyResponse.history && historyResponse.history[rowIndex]) {
            onViewMatrix(historyResponse.history[rowIndex]);
          }
        });
        
        // Hover effects
        eyeButton.on('pointerover', () => {
          buttonBg.clear();
          buttonBg.circle(0, 0, height * 0.03);
          buttonBg.fill({ color: 0x5BA0F2, alpha: 1 });
          buttonBg.stroke({ color: 0xFFFFFF, width: 2 });
        });
        
        eyeButton.on('pointerout', () => {
          buttonBg.clear();
          buttonBg.circle(0, 0, height * 0.03);
          buttonBg.fill({ color: 0x4A90E2, alpha: 0.8 });
          buttonBg.stroke({ color: 0xFFFFFF, width: 2 });
        });
        
        rowContainer.addChild(eyeButton);
      } else {
        // Regular text cell
        let textColor = 0xFFFFFF;
        if (key === 'profit') {
          // Color-code profit
          const profitValue = parseFloat(String(cellValue).replace(/[^\d.-]/g, ''));
          textColor = profitValue >= 0 ? 0x2ECC71 : 0xE74C3C;
        }
        
        const cellText = new Text(String(cellValue), {
          fontFamily: 'Roboto',
          fontSize: fontSize,
          fill: textColor,
          align: columns[colIndex].align
        });
        
        // Position text based on alignment
        if (columns[colIndex].align === 'center') {
          cellText.anchor.set(0.5, 0.5);
          cellText.x = cellX + colWidth / 2;
        } else if (columns[colIndex].align === 'right') {
          cellText.anchor.set(1, 0.5);
          cellText.x = cellX + colWidth - 10;
        } else {
          cellText.anchor.set(0, 0.5);
          cellText.x = cellX + 10;
        }
        
        cellText.y = rowHeight / 2;
        rowContainer.addChild(cellText);
      }
      
      cellX += colWidth;
    });
    
    rowsContainer.addChild(rowContainer);
  });
  
  contentContainer.addChild(headerContainer);
  contentContainer.addChild(rowsContainer);
  tableContainer.addChild(contentContainer);
  
  // Add touch scrolling if needed
  const totalTableHeight = headerHeight + (transformedData.length - 1) * rowHeight;
  if (totalTableHeight > tableHeight) {
    // Use the same touch scrolling functionality as the rules section
    createTouchScrollableContent(
      tableContainer,
      contentContainer,
      { width: maskWidth, height: tableHeight },
      totalTableHeight
    );
  }
  
  mainContainer.addChild(tableContainer);
  
  // FIXED: Add pagination controls with proper callback
  const paginationControls = createPaginationControls(
    {
      totalRecords: historyResponse?.totalRecords || 0,
      page: historyResponse?.page || 1,
      pageSize: historyResponse?.pageSize || 10,
      totalPages: historyResponse?.totalPages || 1,
      hasNextPage: historyResponse?.hasNextPage || false
    },
    (page: number) => {
      console.log(`📊 Pagination callback triggered for page: ${page}`);
      if (onPageChange) {
        onPageChange(page);
      } else {
        console.error('📊 No onPageChange callback provided!');
      }
    },
    { width: width, height: paginationHeight * 0.5 }
  );
  paginationControls.y = tableHeight;
  mainContainer.addChild(paginationControls);
  
  return mainContainer;
};

// Helper function to create matrix popup
const createMatrixPopup = (historyItem: HistoryItem, onClose: () => void, screenWidth = 1200, screenHeight = 800): Container => {
  const popupContainer = new Container();
  
  // Semi-transparent background overlay
  const overlay = new Graphics();
  overlay.rect(0, 0, screenWidth, screenHeight);
  overlay.fill({ color: 0x000000, alpha: 0.7 });
  overlay.eventMode = 'static';
  popupContainer.addChild(overlay);
  
  // Popup background
  const popupWidth = screenWidth * 0.6;
  const popupHeight = screenHeight * 0.7;
  const popupBg = new Graphics();
  popupBg.rect(0, 0, popupWidth, popupHeight);
  popupBg.fill({ color: 0x2C3E50, alpha: 0.95 });
  popupBg.stroke({ color: 0x4A90E2, width: 3 });
  
  // Center positioning
  popupBg.x = -screenWidth * 0.1;
  popupBg.y = -screenHeight * 0.1;
  
  popupContainer.addChild(popupBg);
  
  // Title
  const title = new Text('Game Matrix', {
    fontFamily: 'Roboto',
    fontSize: 20,
    fill: 0xFFFFFF,
    fontWeight: 'bold'
  });
  title.anchor.set(0.5, 0);
  title.x = popupBg.x + popupWidth / 2;
  title.y = popupBg.y + 20;
  popupContainer.addChild(title);
  
  // Game info
  const gameInfo = new Text(
    `Bet: ${historyItem.betAmount}  | ` +
    `Profit: ${historyItem.profit >= 0 ? '+' : ''}${historyItem.profit.toFixed(2)} | `,
    {
      fontFamily: 'Roboto',
      fontSize: 16,
      fill: 0xBDC3C7
    }
  );
  gameInfo.anchor.set(0.5, 0);
  gameInfo.x = popupBg.x + popupWidth / 2;
  gameInfo.y = popupBg.y + popupHeight * 0.15;
  popupContainer.addChild(gameInfo);

  const roundInfo = new Text(
    `Round ID: ${historyItem.roundId}`,
    {
      fontFamily: 'Roboto',
      fontSize: 16,
      fill: 0xBDC3C7
    }
  );
  roundInfo.anchor.set(0.5, 0);
  roundInfo.x = popupBg.x + popupWidth / 2;
  roundInfo.y = popupBg.y + popupHeight * 0.23;
  popupContainer.addChild(roundInfo);
  
  // Matrix visualization
  const matrix = historyItem.revealedMatrix;
  const originalRows = matrix.length;
  const originalCols = matrix[0].length;
  
  // Transpose matrix for better mobile visibility if rows > cols
  let displayMatrix: string[][];
  let rows: number;
  let cols: number;
  
  if (originalRows > originalCols) {
    displayMatrix = [];
    for (let col = 0; col < originalCols; col++) {
      displayMatrix[col] = [];
      for (let row = 0; row < originalRows; row++) {
        displayMatrix[col][row] = matrix[row][col];
      }
    }
    rows = originalCols;
    cols = originalRows;
  } else {
    displayMatrix = matrix;
    rows = originalRows;
    cols = originalCols;
  }
  
  const cellSize = popupHeight * 0.02;
  const spacing = matrix.length > 10 ? cellSize * 0.55 : cellSize * 0.6;

  const matrixStartX = popupBg.x + (popupWidth * 0.2);
  const matrixStartY = popupBg.y + (popupHeight * 0.35);
  
  displayMatrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellX = matrixStartX + colIndex * (cellSize * spacing);
      const cellY = matrixStartY + rowIndex * (cellSize * spacing);
      
      // Cell background circle
      const cellCircle = new Graphics();
      cellCircle.circle(cellSize / 2, cellSize / 2, cellSize * 1.2);
      
      // Color based on cell type
      switch (cell) {
        case 'SAFE':
          cellCircle.fill({ color: 0x2ECC71, alpha: 0.8 });
          break;
        case 'MINE':
        case 'MINE_HIT':
          cellCircle.fill({ color: 0xE74C3C, alpha: 0.8 });
          break;
        case 'HIDDEN':
        default:
          cellCircle.fill({ color: 0x7F8C8D, alpha: 0.3 });
          break;
      }
      
      cellCircle.stroke({ color: 0xFFFFFF, width: 1 });
      cellCircle.x = cellX;
      cellCircle.y = cellY;
      popupContainer.addChild(cellCircle);
      
      // Add symbols
      if (cell === 'MINE_HIT') {
        // Show X emoji for the mine that was actually hit (caused game over)
        const mineHitText = new Text('❌', {
          fontFamily: 'Arial',
          fontSize: 18,
          fill: 0xFFFFFF
        });
        mineHitText.anchor.set(0.5);
        mineHitText.x = cellX + cellSize / 2;
        mineHitText.y = cellY + cellSize / 2;
        popupContainer.addChild(mineHitText);
      } else if (cell === 'MINE') {
        // Show bomb emoji for other mines that weren't hit
        const mineText = new Text('💣', {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0xFFFFFF
        });
        mineText.anchor.set(0.5);
        mineText.x = cellX + cellSize / 2;
        mineText.y = cellY + cellSize / 2;
        popupContainer.addChild(mineText);
      } else if (cell === 'SAFE') {
        // Show checkmark for safe cells
        const safeText = new Text('✓', {
          fontFamily: 'Roboto',
          fontSize: 18,
          fill: 0xFFFFFF,
          fontWeight: 'bold'
        });
        safeText.anchor.set(0.5);
        safeText.x = cellX + cellSize / 2;
        safeText.y = cellY + cellSize / 2;
        popupContainer.addChild(safeText);
      }
    });
  });
  
  // Close button
  const closeButton = new Graphics();
  closeButton.circle(0, 0, 15);
  closeButton.fill({ color: 0xE74C3C, alpha: 0.8 });
  closeButton.stroke({ color: 0xFFFFFF, width: 2 });
  closeButton.x = popupBg.x + popupWidth - 25;
  closeButton.y = popupBg.y + 25;
  closeButton.eventMode = 'static';
  closeButton.cursor = 'pointer';
  popupContainer.addChild(closeButton);
  
  // Close button X
  const closeX = new Text('×', {
    fontFamily: 'Roboto',
    fontSize: 20,
    fill: 0xFFFFFF,
    fontWeight: 'bold'
  });
  closeX.anchor.set(0.5);
  closeX.x = closeButton.x;
  closeX.y = closeButton.y;
  popupContainer.addChild(closeX);
  
  // Close button events
  closeButton.on('pointerdown', () => {
    onClose();
  });
  
  overlay.on('pointerdown', () => {
    onClose();
  });
  
  return popupContainer;
};

// Helper function to create touch-scrollable content
const createTouchScrollableContent = (
  container: Container,
  contentContainer: Container,
  dimensions: { width: number; height: number },
  contentHeight: number
) => {
  // Only add scrolling if content is taller than container
  if (contentHeight <= dimensions.height) {
    return;
  }

  const maxScrollY = contentHeight - dimensions.height;
  let currentScrollY = 0;
  
  // Touch/drag scrolling variables
  let isDragging = false;
  let lastPointerY = 0;
  let dragStartY = 0;
  let dragStartScrollY = 0;
  let velocity = 0;
  let lastMoveTime = 0;
  let inertiaAnimationId: number | null = null;

  // Create scrollbar
  const scrollBarWidth = 8;
  const thumbHeight = Math.max(30, (dimensions.height / contentHeight) * dimensions.height);
  
  // Scroll track
  const scrollTrack = new Graphics();
  scrollTrack.rect(dimensions.width - scrollBarWidth, 0, scrollBarWidth, dimensions.height);
  scrollTrack.fill({ color: 0x2C3E50, alpha: 0.5 });
  container.addChild(scrollTrack);
  
  // Scroll thumb
  const scrollThumb = new Graphics();
  scrollThumb.rect(0, 0, scrollBarWidth - 4, thumbHeight);
  scrollThumb.fill({ color: 0x4A90E2, alpha: 0.8 });
  scrollThumb.x = dimensions.width - scrollBarWidth + 2;
  scrollThumb.y = 0;
  scrollThumb.eventMode = 'static';
  scrollThumb.cursor = 'pointer';
  container.addChild(scrollThumb);

  // Update scroll position function
  const updateScrollPosition = (newScrollY: number, updateThumb = true) => {
    currentScrollY = Math.max(0, Math.min(maxScrollY, newScrollY));
    contentContainer.y = -currentScrollY;
    
    if (updateThumb) {
      const maxThumbY = dimensions.height - thumbHeight;
      const progress = maxScrollY > 0 ? currentScrollY / maxScrollY : 0;
      scrollThumb.y = progress * maxThumbY;
    }
  };

  // Inertia scrolling
  const applyInertia = () => {
    if (Math.abs(velocity) < 0.5) {
      velocity = 0;
      inertiaAnimationId = null;
      return;
    }
    
    currentScrollY += velocity;
    velocity *= 0.95;
    
    if (currentScrollY < 0) {
      currentScrollY = 0;
      velocity = 0;
    } else if (currentScrollY > maxScrollY) {
      currentScrollY = maxScrollY;
      velocity = 0;
    }
    
    updateScrollPosition(currentScrollY);
    inertiaAnimationId = requestAnimationFrame(applyInertia);
  };

  // Touch/mouse events for content area
  container.eventMode = 'static';
  container.hitArea = new Rectangle(0, 0, dimensions.width - scrollBarWidth, dimensions.height);

  // Event handlers with improved touch/mouse support
  const handlePointerDown = (event: any) => {
    if (inertiaAnimationId) {
      cancelAnimationFrame(inertiaAnimationId);
      inertiaAnimationId = null;
    }

    isDragging = true;
    lastPointerY = event.global.y;
    dragStartY = event.global.y;
    dragStartScrollY = currentScrollY;
    velocity = 0;
    lastMoveTime = Date.now();

    // Store pointer ID for tracking
    (event as any).capturedPointerId = event.pointerId;

    event.preventDefault?.();
    event.stopPropagation?.();
  };

  const handlePointerMove = (event: any) => {
    if (!isDragging) return;

    const currentTime = Date.now();
    const deltaY = lastPointerY - event.global.y;
    const timeDelta = currentTime - lastMoveTime;

    if (timeDelta > 0) {
      velocity = deltaY / timeDelta * 16;
    }

    updateScrollPosition(currentScrollY + deltaY);

    lastPointerY = event.global.y;
    lastMoveTime = currentTime;

    event.preventDefault?.();
    event.stopPropagation?.();
  };

  const handlePointerUp = (event: any) => {
    if (!isDragging) return;

    isDragging = false;

    // Clear pointer tracking
    delete (event as any).capturedPointerId;

    if (Math.abs(velocity) > 1) {
      inertiaAnimationId = requestAnimationFrame(applyInertia);
    }

    event.preventDefault?.();
    event.stopPropagation?.();
  };

  // Add event listeners
  container.on('pointerdown', handlePointerDown);
  container.on('pointermove', handlePointerMove);
  container.on('pointerup', handlePointerUp);
  container.on('pointercancel', handlePointerUp); // Handle pointer cancel events

  // Also listen for global events as fallback
  container.on('globalpointermove', (event: any) => {
    if (isDragging) {
      handlePointerMove(event);
    }
  });

  container.on('globalpointerup', (event: any) => {
    if (isDragging) {
      handlePointerUp(event);
    }
  });

  container.on('wheel', (event: any) => {
    if (inertiaAnimationId) {
      cancelAnimationFrame(inertiaAnimationId);
      inertiaAnimationId = null;
    }
    
    const delta = event.deltaY || 0;
    updateScrollPosition(currentScrollY + delta * 0.5);
    event.preventDefault();
  });

  // Scrollbar events with improved handling
  let thumbDragging = false;
  let thumbStartY = 0;
  let thumbStartScrollY = 0;

  const handleThumbPointerDown = (event: any) => {
    if (inertiaAnimationId) {
      cancelAnimationFrame(inertiaAnimationId);
      inertiaAnimationId = null;
    }

    thumbDragging = true;
    thumbStartY = event.global.y;
    thumbStartScrollY = currentScrollY;
    scrollThumb.cursor = 'grabbing';

    // Prevent content scrolling while dragging thumb
    isDragging = false;

    event.stopPropagation();
    event.preventDefault?.();
  };

  const handleThumbPointerMove = (event: any) => {
    if (!thumbDragging) return;

    const deltaY = event.global.y - thumbStartY;
    const maxThumbY = dimensions.height - thumbHeight;
    const scrollRatio = maxThumbY > 0 ? deltaY / maxThumbY : 0;
    const newScrollY = thumbStartScrollY + (scrollRatio * maxScrollY);

    updateScrollPosition(newScrollY, false);

    // Update thumb position manually since we set updateThumb to false
    const progress = maxScrollY > 0 ? currentScrollY / maxScrollY : 0;
    scrollThumb.y = progress * (dimensions.height - thumbHeight);

    event.stopPropagation();
    event.preventDefault?.();
  };

  const handleThumbPointerUp = (event: any) => {
    if (thumbDragging) {
      thumbDragging = false;
      scrollThumb.cursor = 'pointer';

      event.stopPropagation();
      event.preventDefault?.();
    }
  };

  // Add thumb event listeners
  scrollThumb.on('pointerdown', handleThumbPointerDown);

  // Use global events for thumb dragging to ensure we catch moves/ups outside the thumb
  const globalThumbMoveHandler = (event: any) => {
    if (thumbDragging) {
      handleThumbPointerMove(event);
    }
  };

  const globalThumbUpHandler = (event: any) => {
    if (thumbDragging) {
      handleThumbPointerUp(event);
    }
  };

  // Add global listeners for thumb dragging
  container.on('globalpointermove', globalThumbMoveHandler);
  container.on('globalpointerup', globalThumbUpHandler);
  container.on('globalpointercancel', globalThumbUpHandler);

  // Click on track to jump to position
  scrollTrack.on('pointerdown', (event: any) => {
    if (thumbDragging) return;

    const localY = event.global.y - scrollTrack.getGlobalPosition().y;
    const clickProgress = localY / dimensions.height;
    const newScrollY = clickProgress * maxScrollY;

    updateScrollPosition(newScrollY);
    event.stopPropagation();
  });

  // Cleanup function to remove global listeners (call this when container is destroyed)
  (container as any).cleanupScrollListeners = () => {
    container.off('globalpointermove', globalThumbMoveHandler);
    container.off('globalpointerup', globalThumbUpHandler);
    container.off('globalpointercancel', globalThumbUpHandler);

    if (inertiaAnimationId) {
      cancelAnimationFrame(inertiaAnimationId);
      inertiaAnimationId = null;
    }
  };
};

const createSettingsPopup = ({ 
  width, 
  height, 
  onClose,
  buttonTextures = {},
  historyData,
  initialSoundSettings = { musicVolume: 0.7, sfxVolume: 0.8, masterVolume: 0.75 },
  onSoundSettingsChange,
  onPageChange
}: SettingsPopupOptions) => {
  
  // Sound settings state
  let soundSettings: SoundSettings = { ...initialSoundSettings };
  
  // Matrix popup state
  let currentMatrixPopup: Container | null = null;
  
  // History state
  let currentHistoryData = historyData || demoHistoryResponse;
  
  // Helper function to notify about sound changes
  const notifySoundChange = () => {
    if (onSoundSettingsChange) {
      onSoundSettingsChange({ ...soundSettings });
    }
  };
  
  // Store reference to active content rendering function for re-rendering
  let renderActiveContent: () => void = () => {};
  
  // FIXED: Improved page change handler with better error handling
  const handlePageChange = async (page: number) => {
    recordUserActivity(ActivityTypes.HISTORY_PAGE_CHANGE);
    console.log(`📊 Page change requested: ${page}`);
    
    try {
      // Show loading state if needed
      console.log(`📊 Loading page ${page}...`);
      
      const newHistoryData = await loadHistoryPage(page, 10);
      console.log(`📊 Received new history data:`, {
        page: newHistoryData.page,
        totalPages: newHistoryData.totalPages,
        recordCount: newHistoryData.history?.length || 0
      });
      
      // Update the current data
      currentHistoryData = newHistoryData;
      
      // Force re-render of the active content
      console.log(`📊 Triggering re-render...`);
      renderActiveContent();
      
      console.log(`📊 Successfully loaded and rendered page ${page}`);
    } catch (error) {
      console.error(`📊 Failed to load history page ${page}:`, error);
      // You could add user-visible error handling here
    }
  };
  
  let shouldRefreshHistory = true;

  // Define sidebar buttons
  const sidebarButtons: SidebarButton[] = [
    {
      id: 'music',
      label: 'Music',
      texture: buttonTextures.music || 'music_sound',
      onClick: (buttonId) => {
        SoundManager.playUIClick();
        recordUserActivity(ActivityTypes.SETTINGS_MUSIC);
        console.log(`Switched to ${buttonId}`)
      }
    },
    {
      id: 'rules',
      label: 'Rules',
      texture: buttonTextures.rules || 'rules',
      onClick: (buttonId) => {
        SoundManager.playUIClick();
        recordUserActivity(ActivityTypes.SETTINGS_RULES);
        console.log(`Switched to ${buttonId}`)
      }
    },
    {
      id: 'history',
      label: 'History',
      texture: buttonTextures.history || 'history',
      onClick: (buttonId) => {
        SoundManager.playUIClick();
        recordUserActivity(ActivityTypes.SETTINGS_HISTORY)
        console.log(`Switched to ${buttonId}`)
        shouldRefreshHistory = true;
      }
    }
  ];

  // Music content section with sliders
  const musicContent: ContentSection = {
    id: 'music',
    title: 'Audio Settings',
    render: (container: Container, dimensions: PopupDimensions) => {
      const centerX = dimensions.contentWidth / 2;
      const centerY = dimensions.contentHeight / 2;
      const sliderWidth = dimensions.contentWidth * 0.6;
      const textSize = dimensions.contentWidth * 0.18;

      // Music controls - horizontal layout with icon on left
      const musicContainer = new Container();
      musicContainer.x = centerX;
      musicContainer.y = centerY - dimensions.contentHeight * 0.15; // Position above center

      const musicText = new Text({text:'Music', style:{
          fontFamily: 'GameFont',
          fontSize: 14,
          fill: 0xFFFFFF,
          align: 'right',
        }
      });
      musicText.anchor.set(0.5);
      musicText.width = textSize * 0.8;
      musicText.height = textSize * 0.2;
      musicText.x = -sliderWidth / 2 - textSize / 2; // Position on the left side of slider
      musicContainer.addChild(musicText);

      const musicSlider = createSlider(sliderWidth, SoundManager.getMusicVolume(), (value) => {
        SoundManager.setMusicVolume(value);
      });
      // Position slider to the right of the icon
      musicSlider.x = -sliderWidth / 2 + textSize / 2;
      musicSlider.y = -10; // Align vertically with icon
      musicContainer.addChild(musicSlider);

      container.addChild(musicContainer);

      // Sound effects controls - horizontal layout with icon on left
      const sfxContainer = new Container();
      sfxContainer.x = centerX;
      sfxContainer.y = centerY + dimensions.contentHeight * 0.15; // Position below center

      const soundText = new Text({text:'Sound', style:{
          fontFamily: 'GameFont',
          fontSize: 14,
          fill: 0xFFFFFF,
          align: 'right',
        }
      });
      soundText.anchor.set(0.5);
      soundText.width = textSize * 0.8;
      soundText.height = textSize * 0.2;
      soundText.x = -sliderWidth / 2 - textSize / 2; // Position on the left side of slider
      sfxContainer.addChild(soundText);

      const sfxSlider = createSlider(sliderWidth, SoundManager.getSfxVolume(), (value) => {
        SoundManager.setSfxVolume(value);
      });
      // Position slider to the right of the icon
      sfxSlider.x = -sliderWidth / 2 + textSize / 2;
      sfxSlider.y = -10; // Align vertically with icon
      sfxContainer.addChild(sfxSlider);

      container.addChild(sfxContainer);
    }
  };

  // Rules content section with scrolling
  const rulesContent: ContentSection = {
    id: 'rules',
    title: 'Game Rules',
    render: (container: Container, dimensions: PopupDimensions) => {
      
      const rulesText = `MINESWEEPER GAME RULES

OBJECTIVE:
Navigate through the minefield by selecting safe cells while avoiding mines. Progress through multiple rows to increase your winnings.

HOW TO PLAY:

1. STARTING THE GAME
   • Click the "Start" button to begin a new round
   • Choose your bet amount using the + and - buttons
   • Select your preferred grid size (2×3, 3×6, 4×9, 5×12, 6×15)

2. GAMEPLAY
   • Click on green cells in the current row(Green lights) to reveal them.
   • Each cell you click must be safe; if you hit a mine (Red light), the game ends
   • You must find the safe path through each row to progress

3. WINNING CONDITIONS
   • Successfully navigate through all rows without hitting a mine
   • Each completed row increases your potential winnings
   • You can collect your winnings at any time by clicking "Collect"
   • Reaching the final row gives you the maximum payout

4. BETTING SYSTEM
   • Different bet amounts are available
   • Higher bets result in higher potential payouts
   • Your potential winnings are shown at the bottom of the screen

5. GRID SIZES
   • Smaller grids (2×3): Higher risk, higher reward
   • Larger grids (6×15): Lower risk, more gradual progression
   • Each grid size has its own payout multipliers

6. GAME FEATURES
   • Auto-save: Your progress is saved automatically
   • Resume: Interrupted games can be resumed
   • Statistics: Track your wins, losses, and earnings
   • Sound: Audio feedback for all game actions

GOOD LUCK AND PLAY RESPONSIBLY!`;

      // Create scrollable container with mask
      const scrollContainer = new Container();
      const textContainer = new Container();
      
      // Create mask for content area (leaving space for scrollbar)
      const maskWidth = dimensions.contentWidth - 25;
      const mask = new Graphics();
      mask.rect(0, 0, maskWidth, dimensions.contentHeight);
      mask.fill(0xFFFFFF);
      scrollContainer.addChild(mask);
      textContainer.mask = mask;
      
      // Add text
      const rulesTextDisplay = new Text(rulesText, {
        fontFamily: 'Roboto',
        fontSize: height * 0.04,
        fill: 0xFFFFFF,
        lineHeight: height * 0.05,
        wordWrap: true,
        wordWrapWidth: maskWidth - 20,
        align: 'left'
      });
      rulesTextDisplay.x = 10;
      rulesTextDisplay.y = 10;
      textContainer.addChild(rulesTextDisplay);
      
      scrollContainer.addChild(textContainer);
      container.addChild(scrollContainer);
      
      // Add touch scrolling functionality
      const textHeight = rulesTextDisplay.height + 20;
      createTouchScrollableContent(
        scrollContainer,
        textContainer,
        { width: dimensions.contentWidth, height: dimensions.contentHeight },
        textHeight
      );
    }
  };

  // FIXED: Enhanced history content section with proper pagination
  const historyContent: ContentSection = {
    id: 'history',
    title: 'Game History',
    render: (container: Container, dimensions: PopupDimensions) => {
      
      // Store reference to this render function for re-rendering
      renderActiveContent = () => {
        console.log(`📊 Re-rendering history content with data:`, {
          page: (currentHistoryData as HistoryResponse)?.page,
          totalPages: (currentHistoryData as HistoryResponse)?.totalPages,
          recordCount: (currentHistoryData as HistoryResponse)?.history?.length || 0
        });
        historyContent.render(container, dimensions);
      };
      
      // Show loading indicator while fetching
      const showLoadingIndicator = () => {
        container.removeChildren();
        
        const loadingText = new Text('Loading history...', {
          fontFamily: 'Roboto',
          fontSize: 18,
          fill: 0xFFFFFF,
          align: 'center'
        });
        loadingText.anchor.set(0.5);
        loadingText.x = dimensions.contentWidth / 2;
        loadingText.y = dimensions.contentHeight / 2;
        container.addChild(loadingText);
      };

      // Show error message if loading fails
      const showErrorMessage = (error: any) => {
        container.removeChildren();
        
        const errorText = new Text(`Failed to load history: ${error.message || 'Unknown error'}`, {
          fontFamily: 'Roboto',
          fontSize: 16,
          fill: 0xFF6B6B,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: dimensions.contentWidth - 40
        });
        errorText.anchor.set(0.5);
        errorText.x = dimensions.contentWidth / 2;
        errorText.y = dimensions.contentHeight / 2 - 20;
        container.addChild(errorText);

        // Add retry button
        const retryButton = new Graphics();
        retryButton.rect(0, 0, 100, 35);
        retryButton.fill({ color: 0x4A90E2, alpha: 0.8 });
        retryButton.stroke({ color: 0xFFFFFF, width: 2 });
        retryButton.x = (dimensions.contentWidth - 100) / 2;
        retryButton.y = dimensions.contentHeight / 2 + 20;
        retryButton.eventMode = 'static';
        retryButton.cursor = 'pointer';
        
        const retryText = new Text('Retry', {
          fontFamily: 'Roboto',
          fontSize: 14,
          fill: 0xFFFFFF,
          align: 'center'
        });
        retryText.anchor.set(0.5);
        retryText.x = retryButton.x + 50;
        retryText.y = retryButton.y + 17.5;
        
        retryButton.on('pointerdown', () => {
          shouldRefreshHistory = true;
          renderActiveContent();
        });
        
        container.addChild(retryButton);
        container.addChild(retryText);
      };

      // Main render function that creates the table
      const renderHistoryTable = (historyData: any) => {
        container.removeChildren();
        
        console.log(`📊 Creating table with history data:`, {
          page: historyData?.page,
          totalPages: historyData?.totalPages,
          hasNextPage: historyData?.hasNextPage,
          recordCount: historyData?.history?.length || 0
        });
        
        const table = createEnhancedHistoryTableWithPagination({
          width: dimensions.contentWidth,
          height: dimensions.contentHeight,
          historyResponse: historyData,
          onViewMatrix: (historyItem: HistoryItem) => {
            SoundManager.playPopup();
            recordUserActivity(ActivityTypes.MATRIX_VIEW)
            // Close existing popup if any
            if (currentMatrixPopup) {
              container.parent.removeChild(currentMatrixPopup);
              currentMatrixPopup = null;
            }
            
            // Create new matrix popup
            currentMatrixPopup = createMatrixPopup(historyItem, () => {
              if (currentMatrixPopup) {
                container.parent.removeChild(currentMatrixPopup);
                currentMatrixPopup = null;
              }
            }, width, height);
            
            // Add to parent container (popup container)
            container.parent.addChild(currentMatrixPopup);
          },
          onPageChange: handlePageChange, // FIXED: Use the proper handler
          columns: [
            { width: 0.25, align: 'left' },
            { width: 0.25, align: 'right' },
            { width: 0.25, align: 'right' },
            { width: 0.20, align: 'right' },
            { width: 0.03, align: 'center' }
          ],
          rowHeight: height * 0.05,
          headerHeight: height * 0.05,
          fontSize: 13,
          headerFontSize: 14,
          alternateRowColors: true,
          scrollBarWidth: 18
        });
        
        container.addChild(table);
      };

      // Check if we need to refresh history data
      if (shouldRefreshHistory) {
        console.log('📊 Refreshing history data...');
        shouldRefreshHistory = false;
        
        showLoadingIndicator();
        
        loadHistoryPage(1, 10)
          .then((data) => {
            console.log('📊 Fresh history data loaded:', data);
            currentHistoryData = data;
            renderHistoryTable(currentHistoryData);
          })
          .catch((error) => {
            console.error('📊 Failed to load fresh history:', error);
            showErrorMessage(error);
          });
      } else {
        console.log('📊 Using cached history data');
        renderHistoryTable(currentHistoryData);
      }
    }
  };

  // Create popup with all sections
  const popup = createPopup({
    width,
    height,
    onClose: () => {
      SoundManager.playPopup();
      // Clean up matrix popup if open
      if (currentMatrixPopup) {
        try {
          currentMatrixPopup.parent?.removeChild(currentMatrixPopup);
        } catch (e) {
          // Ignore if already removed
        }
        currentMatrixPopup = null;
      }
      onClose();
    },
    closeButtonTexture: 'backButton',
    sidebarButtons,
    contentSections: [musicContent, rulesContent, historyContent],
    defaultActiveSection: 'music'
  });

  const popupAPI = (popup as any).api;
  if (popupAPI && popupAPI.setActiveSection) {
    setTimeout(() => {
      popupAPI.setActiveSection('music');
      console.log('📱 Settings popup forced to music section');
    }, 0);
  }

  // Add API to access sound settings and pagination
  (popup as any).getSoundSettings = () => ({ ...soundSettings });
  (popup as any).setSoundSettings = (newSettings: Partial<SoundSettings>) => {
    soundSettings = { ...soundSettings, ...newSettings };
    notifySoundChange();
  };
  (popup as any).updateHistoryData = (newHistoryData: HistoryResponse) => {
    currentHistoryData = newHistoryData;
    renderActiveContent();
  };

  return popup;
};

export default createSettingsPopup;
export type { SoundSettings, HistoryItem, HistoryResponse, PaginationInfo };