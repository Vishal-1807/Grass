import { Container, Sprite, Assets } from 'pixi.js';

export default function createBackground(appWidth?: number, appHeight?: number): Container {
  // Layout constants
  const BACKGROUND_PADDING = 20;

  const container = new Container();
  const background = Sprite.from(Assets.get('background'));
  container.addChild(background);

  const updateLayout = (width: number, height: number) => {
    // Make background larger to ensure it covers the entire container
    background.width = width + BACKGROUND_PADDING;
    background.height = height + BACKGROUND_PADDING;

    // Set anchor to center for better positioning
    background.anchor.set(0.5, 0.5);
    background.x = width / 2;
    background.y = height / 2;
  };

  // Use provided app dimensions or fallback to window dimensions
  const width = appWidth || window.innerWidth;
  const height = appHeight || window.innerHeight;

  // Initial layout
  updateLayout(width, height);

  // Expose resize function
  (container as any).resize = updateLayout;

  return container;
}