// Create listeners arrays outside the exported object to keep them private
let gridDimensionChangeListeners: Array<(cols: number, rows: number) => void> = [];

// Global state variables
let gameStarted: boolean = false;
let gameStartedListeners: (() => void)[] = [];
let gameEndedListeners: (() => void)[] = [];
let balanceChangeListeners: ((newBalance: number) => void)[] = [];
let betStepsChangeListeners: ((newBetSteps: number[]) => void)[] = [];
let stakeAmountChangeListeners: ((newStakeAmount: number) => void)[] = [];
// let rewardChangeListeners: ((newReward: number) => void)[] = [];



let betSteps: number[] = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2, 3, 4, 5, 6, 7, 8, 9, 10000,
];

const MULTIPLIERS = {
    "2x3": [7.85, 3.92, 1.96],
    "3x6": [11.17, 7.45, 4.97, 3.31, 2.21, 1.47],
    "4x9": [13.07, 9.80, 7.35, 5.51, 4.13, 3.10, 2.33, 1.74, 1.31],
    "5x12": [14.28, 11.42, 9.14, 7.31, 5.85, 4.68, 3.74, 2.99, 2.40, 1.92, 1.53, 1.23],
    "6x15": [15.11, 12.60, 10.50, 8.75, 7.29, 6.07, 5.06, 4.22, 3.52, 2.93, 2.44, 2.03, 1.70, 1.41, 1.18]
} as const;

// Layout constants
const DEFAULT_ROWS = 6;
const DEFAULT_COLS = 3;
const DEFAULT_BALANCE = 1000000;
const DEFAULT_STAKE = 1.00;
const DEFAULT_TABLE_ID = "STGMS102";

const setGameStarted = (started: boolean) => {
    const wasStarted = gameStarted;
    gameStarted = started;
    console.log(`Game started state changed to: ${started}`);
    
    // Emit event when game becomes started (not when it becomes false)
    if (started && !wasStarted) {
        console.log(`Triggering ${gameStartedListeners.length} game started listeners`);
        gameStartedListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in game started listener:', error);
            }
        });
    }
    
    // Emit event when game ends (becomes false from true)
    if (!started && wasStarted) {
        console.log(`Triggering ${gameEndedListeners.length} game ended listeners`);
        gameEndedListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in game ended listener:', error);
            }
        });
    }
}

const getGameStarted = () => {
    return gameStarted;
}

const addGameStartedListener = (callback: () => void) => {
    gameStartedListeners.push(callback);
    console.log(`Added game started listener. Total listeners: ${gameStartedListeners.length}`);
    
    // Return unsubscribe function
    return () => {
        const index = gameStartedListeners.indexOf(callback);
        if (index > -1) {
            gameStartedListeners.splice(index, 1);
            console.log(`Removed game started listener. Remaining listeners: ${gameStartedListeners.length}`);
        }
    };
}

const addGameEndedListener = (callback: () => void) => {
    gameEndedListeners.push(callback);
    console.log(`Added game ended listener. Total listeners: ${gameEndedListeners.length}`);
    
    // Return unsubscribe function
    return () => {
        const index = gameEndedListeners.indexOf(callback);
        if (index > -1) {
            gameEndedListeners.splice(index, 1);
            console.log(`Removed game ended listener. Remaining listeners: ${gameEndedListeners.length}`);
        }
    };
}

const setBetSteps = (steps: number[]) => {
    if (steps && steps.length > 0) {
        betSteps = steps;

        // Ensure current index is valid with new bet steps
        if (GlobalState.currentBetIndex >= betSteps.length) {
            GlobalState.currentBetIndex = 0;
        }

        // IMPORTANT FIX: Update the stake amount to match the current bet index
        const newStakeAmount = betSteps[GlobalState.currentBetIndex];
        GlobalState.stakeAmount = newStakeAmount;
        console.log(`💰 Updated stake amount to: ${newStakeAmount} (from bet steps)`);

        // Notify all bet steps change listeners
        betStepsChangeListeners.forEach(listener => listener(betSteps));
    }
};

const getBetSteps = () :number[] => {
    return betSteps;
}

const addBetStepsChangeListener = (listener: (newBetSteps: number[]) => void) => {
    betStepsChangeListeners.push(listener);
};

const addStakeAmountChangeListener = (callback: (newStakeAmount: number) => void) => {
    stakeAmountChangeListeners.push(callback);
    console.log(`💰 Added stake amount change listener. Total listeners: ${stakeAmountChangeListeners.length}`);

    // Return unsubscribe function
    return () => {
        const index = stakeAmountChangeListeners.indexOf(callback);
        if (index > -1) {
            stakeAmountChangeListeners.splice(index, 1);
            console.log(`💰 Removed stake amount change listener. Remaining listeners: ${stakeAmountChangeListeners.length}`);
        }
    };
};

const getMultipliers = (cols: number, rows: number): number[] => {
    const configKey = `${cols}x${rows}`;

    if (MULTIPLIERS[configKey]) {
        return [...MULTIPLIERS[configKey]]; // Return a copy of the array
    }

    // Fallback: generate simple multipliers if configuration not found
    console.warn(`No multipliers found for ${configKey}, using fallback calculation`);
    const fallbackMultipliers: number[] = [];
    for (let i = 0; i < rows; i++) {
        fallbackMultipliers.push(1.2 + (i * 0.3)); // Simple linear increase
    }
    return fallbackMultipliers;
};

const setBalance = (balance: number) => {
    const previousBalance = GlobalState.balance;
    GlobalState.balance = balance;
    console.log(`💳 Balance updated from ${previousBalance} to ${balance}`);
    
    // Trigger balance change listeners when balance changes
    if (previousBalance !== balance) {
        triggerBalanceChange(balance);
    }
};

const getBalance = () => {
    return GlobalState.balance;
};

const triggerBalanceChange = (newBalance: number) => {
    console.log(`💳 Triggering ${balanceChangeListeners.length} balance change listeners with balance: ${newBalance}`);
    balanceChangeListeners.forEach(listener => {
        try {
            listener(newBalance);
        } catch (error) {
            console.error('💳 Error in balance change listener:', error);
        }
    });
}

const addBalanceChangeListener = (callback: (newBalance: number) => void) => {
    balanceChangeListeners.push(callback);
    console.log(`💳 Added balance change listener. Total listeners: ${balanceChangeListeners.length}`);
    
    // Return unsubscribe function
    return () => {
        const index = balanceChangeListeners.indexOf(callback);
        if (index > -1) {
            balanceChangeListeners.splice(index, 1);
            console.log(`💳 Removed balance change listener. Remaining listeners: ${balanceChangeListeners.length}`);
        }
    };
}

const getTableId = () => {
    return GlobalState.table_id;
};

const setGridDimensions = (cols: number, rows: number) => {
    const prevCols = GlobalState.total_cols;
    const prevRows = GlobalState.total_rows;
    const prevCurrentRow = GlobalState.current_row;

    GlobalState.total_cols = cols;
    GlobalState.total_rows = rows;
    GlobalState.current_row = rows - 1; // Set current row to bottom row of new grid

    console.log(`Grid dimensions updated: ${cols}x${rows} (previous: ${prevCols}x${prevRows})`);
    console.log(`Current row updated: ${GlobalState.current_row} (previous: ${prevCurrentRow})`);

    // Trigger listeners only if dimensions actually changed
    if (prevCols !== cols || prevRows !== rows) {
        console.log(`Triggering ${gridDimensionChangeListeners.length} grid dimension change listeners`);
        gridDimensionChangeListeners.forEach(listener => {
            try {
                listener(cols, rows);
            } catch (error) {
                console.error('Error in grid dimension change listener:', error);
            }
        });
    }
};

const addGridDimensionChangeListener = (callback: (cols: number, rows: number) => void) => {
    gridDimensionChangeListeners.push(callback);
    console.log(`Added grid dimension change listener. Total listeners: ${gridDimensionChangeListeners.length}`);
    
    // Return unsubscribe function
    return () => {
        const index = gridDimensionChangeListeners.indexOf(callback);
        if (index > -1) {
            gridDimensionChangeListeners.splice(index, 1);
            console.log(`Removed grid dimension change listener. Remaining listeners: ${gridDimensionChangeListeners.length}`);
        }
    };
};

const setStakeAmount = (amount: number) => {
    const previousAmount = GlobalState.stakeAmount;
    GlobalState.stakeAmount = amount;
    console.log(`Stake amount set to: ${amount}`);

    // Try to find and update the current bet index to match the new amount
    const betIndex = betSteps.indexOf(amount);
    if (betIndex !== -1) {
        GlobalState.currentBetIndex = betIndex;
        console.log(`💰 Updated currentBetIndex to: ${betIndex} for amount: ${amount}`);
    } else {
        console.log(`💰 Amount ${amount} not found in betSteps, keeping currentBetIndex: ${GlobalState.currentBetIndex}`);
    }

    // Notify stake amount change listeners
    if (previousAmount !== amount) {
        stakeAmountChangeListeners.forEach(listener => {
            try {
                listener(amount);
            } catch (error) {
                console.error('💰 Error in stake amount change listener:', error);
            }
        });
    }
};

const getStakeAmount = () => {
    return GlobalState.stakeAmount;
};

const getGridOption = () => {
    return `${GlobalState.total_cols}x${GlobalState.total_rows}`;
};

const setRoundId = (roundId: string) => {
    GlobalState.roundId = roundId;
    console.log('Round ID set:', roundId);
};

const getRoundId = () => {
    return GlobalState.roundId;
};

// Current row change listeners
let currentRowChangeListeners: Array<(newRow: number) => void> = [];

const addCurrentRowChangeListener = (listener: (newRow: number) => void) => {
    currentRowChangeListeners.push(listener);
    console.log(`Added current row change listener. Total listeners: ${currentRowChangeListeners.length}`);

    // Return unsubscribe function
    return () => {
        const index = currentRowChangeListeners.indexOf(listener);
        if (index > -1) {
            currentRowChangeListeners.splice(index, 1);
            console.log(`Removed current row change listener. Total listeners: ${currentRowChangeListeners.length}`);
        }
    };
};

const setCurrentRow = (row: number) => {
    const oldRow = GlobalState.current_row;
    console.log(`Setting current row from ${oldRow} to: ${row}`);
    GlobalState.current_row = row;

    // Notify all listeners of the row change
    currentRowChangeListeners.forEach(listener => {
        try {
            listener(row);
        } catch (error) {
            console.error('Error in current row change listener:', error);
        }
    });
};

const getCurrentRow = () => {
    return GlobalState.current_row;
};

const setGameMatrix = (matrix: string[][]) => {
    GlobalState.game_matrix = matrix;
    console.log('Game matrix updated');
};

const setReward = (newReward: number) => {
    const previousReward = GlobalState.reward;
    GlobalState.reward = newReward;
    console.log(`💰 Reward updated from ${previousReward} to ${newReward}`);

    // Trigger reward change listeners when reward changes
    // if (previousReward !== newReward) {
    //     triggerRewardChange(newReward);
    // }
}

const getReward = () => {
    return GlobalState.reward;
}

// const triggerRewardChange = (newReward: number) => {
//     console.log(`💰 Triggering ${rewardChangeListeners.length} reward change listeners with reward: ${newReward}`);
//     rewardChangeListeners.forEach(listener => {
//         try {
//             listener(newReward);
//         } catch (error) {
//             console.error('💰 Error in reward change listener:', error);
//         }
//     });
// }

// const addRewardChangeListener = (callback: (newReward: number) => void) => {
//     rewardChangeListeners.push(callback);
//     console.log(`💰 Added reward change listener. Total listeners: ${rewardChangeListeners.length}`);

//     // Return unsubscribe function
//     return () => {
//         const index = rewardChangeListeners.indexOf(callback);
//         if (index > -1) {
//             rewardChangeListeners.splice(index, 1);
//             console.log(`💰 Removed reward change listener. Remaining listeners: ${rewardChangeListeners.length}`);
//         }
//     };
// }

const setToken = (token: string) => {
    console.log('Setting token for React integration:', token);
    GlobalState.token = token;
}

const getToken = () => {
    return GlobalState.token;
}

// Pending game restoration listeners
let pendingGameRestoreListeners: Array<() => void> = [];
let pendingGameRestoreCompleteListeners: Array<() => void> = [];

// Function to add pending game restore listener
const addPendingGameRestoreListener = (listener: () => void) => {
    pendingGameRestoreListeners.push(listener);
    console.log(`Added pending game restore listener. Total listeners: ${pendingGameRestoreListeners.length}`);

    // Return unsubscribe function
    return () => {
        const index = pendingGameRestoreListeners.indexOf(listener);
        if (index > -1) {
            pendingGameRestoreListeners.splice(index, 1);
            console.log(`Removed pending game restore listener. Remaining listeners: ${pendingGameRestoreListeners.length}`);
        }
    };
};

// Function to trigger pending game restore
const triggerPendingGameRestore = () => {
    console.log('🎨 Triggering pending game restore...');
    console.log(`🎨 Notifying ${pendingGameRestoreListeners.length} pending game restore listeners`);

    pendingGameRestoreListeners.forEach((listener, index) => {
        try {
            console.log(`🎨 Calling pending game restore listener ${index + 1}`);
            listener();
        } catch (error) {
            console.error(`🎨 Error in pending game restore listener ${index + 1}:`, error);
        }
    });

    console.log('🎨 Pending game restore notification completed');
};

// Function to add pending game restore completion listener
const addPendingGameRestoreCompleteListener = (listener: () => void) => {
    pendingGameRestoreCompleteListeners.push(listener);
    console.log(`Added pending game restore complete listener. Total listeners: ${pendingGameRestoreCompleteListeners.length}`);

    // Return unsubscribe function
    return () => {
        const index = pendingGameRestoreCompleteListeners.indexOf(listener);
        if (index > -1) {
            pendingGameRestoreCompleteListeners.splice(index, 1);
            console.log(`Removed pending game restore complete listener. Remaining listeners: ${pendingGameRestoreCompleteListeners.length}`);
        }
    };
};

// Function to trigger pending game restore completion
const triggerPendingGameRestoreComplete = () => {
    console.log('🎨 Triggering pending game restore completion...');
    console.log(`🎨 Notifying ${pendingGameRestoreCompleteListeners.length} pending game restore complete listeners`);

    pendingGameRestoreCompleteListeners.forEach((listener, index) => {
        try {
            console.log(`🎨 Calling pending game restore complete listener ${index + 1}`);
            listener();
        } catch (error) {
            console.error(`🎨 Error in pending game restore complete listener ${index + 1}:`, error);
        }
    });

    console.log('🎨 Pending game restore completion notification completed');
};

export const GlobalState = {
    // Core state
    token: null as string | null,
    total_rows: DEFAULT_ROWS,
    total_cols: DEFAULT_COLS,
    current_row: DEFAULT_ROWS - 1, // Start at bottom row
    game_matrix: [] as string[][],
    
    // Game state
    balance: DEFAULT_BALANCE,
    stakeAmount: DEFAULT_STAKE,
    roundId: null as string | null,
    reward: 0,
    
    // Table data
    table_id: DEFAULT_TABLE_ID,
    
    // Token functions
    getToken,
    setToken,
    
    // Game state functions
    setGameStarted,
    getGameStarted,
    addGameStartedListener,
    addGameEndedListener,

    // Multipliers
    getMultipliers,

    // Grid
    getGridOption,
    
    // Balance functions
    setBalance,
    getBalance,
    addBalanceChangeListener,
    
    // Grid functions
    setGridDimensions,
    addGridDimensionChangeListener,

    // Bet functions
    currentBetIndex: 0,
    setBetSteps,
    getBetSteps,
    addBetStepsChangeListener,
    addStakeAmountChangeListener,
    
    // Game data functions
    getTableId,
    setStakeAmount,
    getStakeAmount,
    setRoundId,
    getRoundId,
    setCurrentRow,
    getCurrentRow,
    addCurrentRowChangeListener,
    setGameMatrix,
    setReward,
    getReward,
    // addRewardChangeListener,

    // Extensibility placeholders
    triggerPendingGameRestore,
    addPendingGameRestoreListener,
    triggerPendingGameRestoreComplete,
    addPendingGameRestoreCompleteListener,
};