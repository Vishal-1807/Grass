import { WebSocketService } from "./WebSocketService";
import { GlobalState } from "../globals/gameState";

function createWebSocketRequest<T>(
  operation: string,
  payload: any,
  responseHandler: (res: any) => T,
  timeoutMs: number = 8000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const ws = WebSocketService.getInstance();
    let isResolved = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ws.off(operation); // Clean up listener
        reject(new Error(`${operation} request timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    // Set up one-time response handler that auto-cleans up
    const handleResponse = (res: any) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        try {
          const result = responseHandler(res);
          resolve(result);
        } catch (error) {
          reject(new Error(error));
        }
      }
    };

    // Use 'once' for automatic cleanup after first response
    ws.once(operation, handleResponse);
    ws.send(operation, payload);
  });
}

export const startButtonEvents = async (): Promise<boolean> => {
  console.log("🚀 Starting game initialization...");

  // Early validation - check balance before making any WebSocket calls
  if (GlobalState.getStakeAmount() > GlobalState.getBalance()) {
    if (typeof window.openLowBalancePopup === 'function') {
      window.openLowBalancePopup();
    }
    console.log('Low balance popup triggered - stopping game initialization');
    return false; // Return false to indicate failure
  }

  const ws = WebSocketService.getInstance();

  // Check WebSocket connection before proceeding
  if (!ws.isSocketConnected()) {
    console.error('WebSocket not connected. Please check your connection.');
    return false; // Return false instead of throwing error
  }

  try {
    console.log("Step 1: Generating round ID...");
    // // Step 1: Generate ID with faster timeout
    // const roundId = await createWebSocketRequest<string>('generateid', {
    //   operation: 'generateid',
    //   data: { tableId: GlobalState.getTableId() },
    // }, (res) => {
    //   if (res?.status === '200 OK' && res.roundId) {
    //     console.log("✅ Step 1 complete - Round ID:", res.roundId);
    //     GlobalState.setRoundId(res.roundId);
    //     return res.roundId;
    //   }
    //   throw new Error(`Generate ID failed: ${res?.status || 'Unknown error'}`);
    // }, 5000); // Faster 5s timeout

    console.log("Step 1: Starting round...");
    // Step 2: Start round with the generated ID
    await createWebSocketRequest<any>('mines_round_start', {
      operation: 'mines_round_start',
      data: {
        eventType: 'round_start',
        tableId: GlobalState.getTableId(),
      },
    }, (res) => {
      if (res?.status === '200 OK') {
        console.log("✅ Step 2 complete - Round started");
        // Update state with round start data
        if (res.roundId) GlobalState.setRoundId(res.roundId);
        if (res.revealedMatrix) GlobalState.setGameMatrix(res.revealedMatrix);
        return res;
      }

      // Handle specific error cases
      if (res?.status === '400') {
        console.warn('⚠️ Round start failed ');
        return;
      }

      throw new Error(`Round start failed: ${res?.status || 'Unknown error'}`);
    }, 5000); // Faster 5s timeout

    console.log("Step 2: Placing bet...");
    // Step 3: Place bet
    await createWebSocketRequest<void>('mines_placebet', {
      operation: 'mines_placebet',
      data: {
        tableId: GlobalState.getTableId(),
        roundId: GlobalState.getRoundId(),
        stakeAmount: GlobalState.getStakeAmount().toString(),
        gridOption: GlobalState.getGridOption(),
      },
    }, (res) => {
      if (res?.status === '200 OK') {
        console.log("✅ Step 3 complete - Bet placed");
        if (res.balance !== undefined) {
          GlobalState.setBalance(res.balance);
        }
        return;
      }
      throw new Error(`Place bet failed: ${res?.status || 'Unknown error'}`);
    }, 5000); // Faster 5s timeout

    return true; // Return true on successful completion
  } catch (error) {
    console.error("❌ Game initialization failed:", error);
    // Clean up any partial state on failure
    GlobalState.setGameStarted(false);
    GlobalState.setRoundId(null);
    return false; // Return false on error instead of throwing
  }
};