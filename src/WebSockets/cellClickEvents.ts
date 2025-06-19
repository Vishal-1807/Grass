import { WebSocketService } from "./WebSocketService";
import { GlobalState } from "../globals/gameState";

/**
 * Handle minesweeper cell click via WebSocket
 * This function is called by the grid when a cell is clicked
 * @param matrixRow - The matrix row index (backend coordinate system)
 * @param col - The column index (same in both visual and matrix)
 * @returns Promise<{hitMine: boolean, response: any}> - The processed response for the UI
 */
export const cellClickEvents = async (matrixRow: number, col: number) => {
  // Check if game has been started
  if (!GlobalState.getGameStarted?.()) {
    console.warn('Cell click attempted before game started - blocking request');
    throw new Error('Game not started. Please click the start button first.');
  }

  matrixRow = GlobalState.total_rows - 1 - matrixRow;

  console.log(`cellClickEvents - Clicking matrix cell at row ${matrixRow}, col ${col}`);

  const ws = WebSocketService.getInstance();

  //Step 3: minesweeper_select
  return new Promise((resolve, reject) => {
        // Use ONCE instead of ON to prevent multiple handlers
        const handleResponse = (res: any) => {

            if (res?.status === '200 OK') {
                console.log("Minesweeper select response received successfully:", res);

                // Update global state
                if (res.revealedMatrix) {
                    GlobalState.setGameMatrix(res.revealedMatrix);
                }
                if (res.reward !== undefined) {
                    GlobalState.setReward(res.reward);
                }

                //If mine is hit
                if(res.hitMine){
                    console.log("💥 MINE HIT - Game Over");
                } else {
                    console.log("✅ Safe cell clicked");
                }

                // Return response with hitMine flag
                resolve({
                    hitMine: !!res.hitMine,
                    response: res
                });
            } else {
                console.error("Minesweeper select failed:", res);
                reject(new Error(`API error: ${res?.status || 'Unknown status'}`));
            }
        };

        // Use ONCE to ensure handler only fires once
        ws.once('minesweeper_select', handleResponse);

        ws.send('minesweeper_select', {
            operation: 'minesweeper_select',
            data: {
                tableId: GlobalState.getTableId(),
                roundId: GlobalState.getRoundId(),
                row: matrixRow,
                col: col,
            },
        });
  });
};

/**
 * Handle round end event via WebSocket
 * This function is called when a mine is hit or when collect is clicked
 * @param eventType - The type of round end ('mine_hit' or 'collect')
 * @returns Promise<{success: boolean, response: any}> - The processed response for the UI
 */
export const roundEndEvents = async (eventType: 'mine_hit' | 'collect' | 'last_row') => {
  console.log(`🏁 Sending round_end event with type: ${eventType}`);

  const ws = WebSocketService.getInstance();

  // Check WebSocket connection before proceeding
  if (!ws.isSocketConnected()) {
    throw new Error('WebSocket not connected. Please check your connection.');
  }

  return new Promise((resolve, reject) => {
    const handleResponse = (res: any) => {
      if (res?.status === '200 OK') {
        console.log("✅ Round end response received successfully:", res);

        // Update global state with any returned data
        if (res.revealedMatrix) {
          GlobalState.setGameMatrix(res.revealedMatrix);
          console.log("🎯 Revealed matrix updated from round end response");
        }
        if (res.reward !== undefined) {
          GlobalState.setReward(res.reward);
          console.log("💰 Reward updated from round end response:", res.reward);
        }
        if (res.balance !== undefined) {
          GlobalState.setBalance(res.balance);
          console.log("💳 Balance updated from round end response:", res.balance);
        }

        // Return success response
        resolve({
          success: true,
          response: res
        });
      } else {
        console.error("❌ Round end failed:", res);
        reject(new Error(`Round end API error: ${res?.status || 'Unknown status'}`));
      }
    };

    // Use ONCE to ensure handler only fires once
    ws.once('round_events', handleResponse);

    // Send round_end event
    ws.send('round_events', {
      operation: 'round_events',
      data: {
        eventType: 'round_end',
        roundId: GlobalState.getRoundId(),
        tableId: GlobalState.getTableId()
      },
    });
  });
};