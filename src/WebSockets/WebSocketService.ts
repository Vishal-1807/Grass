import { GlobalState } from "../globals/gameState";
import { gametoken } from './token';

type WSMessage = { event: string; data: any };

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private listeners = new Map<string, (data: any) => void>();
  private queue: WSMessage[] = [];
  private reconnectDelay = 1000;
  private isConnected = false;

  // Get the URL with the current token from GlobalState
  private getWebSocketUrl(): string {
    const token = GlobalState.getToken();
    // const token = gametoken;
    return `wss://backend.inferixai.link/user/auth?authorization=Bearer ${token}`;
  }

  private constructor() {
    this.connect();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
  
  private connect() {
    // Get the WebSocket URL with the current token
    const url = this.getWebSocketUrl();
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.isConnected = true;
      console.log("WebSocket connected successfully");
      while (this.queue.length > 0) {
        const msg = this.queue.shift();
        if (msg) this.send(msg.event, msg.data);
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        // Check for session expiry in the data object
        if (msg.data && msg.data.status === "401 Session Expired") {
          console.log("Session expired, logging out user");
          if (typeof window !== 'undefined' && (window as any).logoutUser) {
            (window as any).logoutUser();
          }
          return; // Don't process the message further
        }

        // Special handling for "info" operation to set bet steps
        if (msg.operation === "info" && msg.mineSweeperAmounts && Array.isArray(msg.mineSweeperAmounts)) {
          GlobalState.setBetSteps(msg.mineSweeperAmounts);
          console.log('Bet steps updated', GlobalState.getBetSteps());
        }

        const eventKey = msg.event || msg.operation;
        if (eventKey && this.listeners.has(eventKey)) {
          this.listeners.get(eventKey)?.(msg.data || msg); // Pass data or full message if data is not available
        }
      } catch (e) {
        console.error('Invalid message:', event.data);
      }
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      setTimeout(() => this.connect(), this.reconnectDelay);
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      // if (typeof window !== 'undefined' && (window as any).logoutUser) {
      //   (window as any).logoutUser();
      // }
      this.socket?.close();
    };
  }

  public send(event: string, data: any) {
    const msg = JSON.stringify(data);
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(msg);
    } else {
      this.queue.push({ event, data });
    }
  }

  public on(event: string, callback: (data: any) => void) {
    this.listeners.set(event, callback);
  }

  public off(event: string) {
    this.listeners.delete(event);
  }

  public once(event: string, callback: (data: any) => void) {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event);
    };
    this.on(event, onceCallback);
  }
}