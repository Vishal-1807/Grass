export {}; // Important to make this a module

declare global {
  interface Window {
    redirectToHome: () => void;
    setMusicVolume: (volume: number) => void;
    setSoundVolume: (volume: number) => void;
    openLowBalancePopup: () => void;
    openInActivePopup: () => void;
    startPixiGame: (container: HTMLDivElement) => void;
    userActivityDetected: () => void;
    gameToken?: string;
    SendMessageToJS: (message: string) => void;
    ReactNativeWebView?: any;
    isInWebView?: boolean;
    logoutUser: () => void;
    loadingCompleted: () => void;
  }
}
