import { createBottomTextDisplay } from '../components/bottomTextDisplay';

let textDisplayAPI: any = null;

export const initializeTextDisplay = (width: number, height: number) => {
    const textDisplay = createBottomTextDisplay({ width, height });
    textDisplayAPI = (textDisplay as any).api; // Cast to any if publicAPI is not typed
    return textDisplay; // Return container to add to stage
};

export const getTextAPI = () => {
    console.log('getting text api');
    if (!textDisplayAPI) {
        throw new Error('Text display not initialized. Call initializeTextDisplay first.');
    }
    return textDisplayAPI;
};