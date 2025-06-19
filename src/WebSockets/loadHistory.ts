import { GlobalState } from "../globals/gameState";
import { gametoken } from "./token";

let currentHistoryResponse = null;

/**
 * Load history page via HTTP POST - using fetch instead of WebSocket
 */
export const loadHistoryPage = async (page: number = 1, pageSize: number = 10) => {
  console.log(`📊 Loading history page ${page} with pageSize ${pageSize}`);
  
  try {
    const response = await fetch('https://backend.inferixai.link/api/get-minesweeper-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'authorization': `Bearer ${gametoken}`,
        'authorization': `Bearer ${GlobalState.getToken()}`
      },
      body: JSON.stringify({
        page: page,
        pageSize: pageSize,
        tableId: GlobalState.getTableId(),
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Received history response:', data);

    if (data?.status === 'RS_OK' || data?.status === '200 OK' || response.ok) {
      const historyData = {
        status: data.status || 'RS_OK',
        errorDescription: data.errorDescription || '',
        history: data.history || [],
        totalRecords: data.totalRecords || 0,
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        totalPages: data.totalPages || 1,
        hasNextPage: data.hasNextPage || false
      };
      
      // Cache the response
      currentHistoryResponse = historyData;
      
      console.log('📊 History data processed:', historyData);
      return historyData;
    } else {
      const errorMsg = data?.errorDescription || 'Failed to load history';
      console.error('📊 History request failed:', errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('📊 Error loading history:', error);
    throw error;
  }
};

/**
 * Get cached history data
 */
export const getCurrentHistoryData = () => {
  return currentHistoryResponse;
};