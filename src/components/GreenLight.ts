// GreenLight.ts - Independent green light component for clickable grid cells
import { Container, Sprite, Assets, Texture } from 'pixi.js';

interface GreenLightOptions {
  width: number;
  height: number;
  x: number;
  y: number;
  cellId: string;
  row: number;
  col: number;
  onClick?: (row: number, col: number) => void;
}

export class GreenLight {
  public container: Container;
  private greenSprite: Sprite;
  private cellId: string;
  private row: number;
  private col: number;
  private currentWidth: number;
  private currentHeight: number;
  
  constructor(options: GreenLightOptions) {
    this.container = new Container();
    this.cellId = options.cellId;
    this.row = options.row;
    this.col = options.col;
    this.currentWidth = options.width;
    this.currentHeight = options.height;
    
    this.initializeGreenLight(options);
    this.setupEventListeners(options.onClick);
  }
  
  private initializeGreenLight(options: GreenLightOptions) {
    // Get green light texture from Assets
    const greenTexture = Assets.get('tronBoxGreenLight');
    
    // Create green light sprite
    this.greenSprite = new Sprite(greenTexture);
    this.greenSprite.alpha = 0; // Make it slightly transparent for better visual effect
    
    // Size and position the green light to match the cell
    this.greenSprite.width = options.width;
    this.greenSprite.height = options.height;
    this.greenSprite.x = options.width * -0.001; // Match GridCell overlay positioning
    this.greenSprite.y = -options.width * 0.001; // Match GridCell overlay positioning
    
    this.container.addChild(this.greenSprite);
    
    // Set container position
    this.container.x = options.x;
    this.container.y = options.y;
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.sortableChildren = true;
    this.container.zIndex = 100; // High z-index to appear above grid cells
  }
  
  private setupEventListeners(onClick?: (row: number, col: number) => void) {
    // Click handler - only triggers when green light is clicked
    if (onClick) {
      this.container.on('pointertap', () => {
        console.log(`Green light clicked: ${this.cellId} (${this.row}, ${this.col})`);
        onClick(this.row, this.col);
      });
    }
    
    // Hover effects for better UX
    this.container.on('pointerover', () => {
      this.greenSprite.alpha = 0; // Full opacity on hover
    });
    
    this.container.on('pointerout', () => {
      this.greenSprite.alpha = 0; // Back to semi-transparent
    });
  }
  
  // Public methods
  public getCellId(): string {
    return this.cellId;
  }
  
  public getPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }
  
  public resize(width: number, height: number) {
    this.currentWidth = width;
    this.currentHeight = height;
    
    // Resize green light sprite
    this.greenSprite.width = width;
    this.greenSprite.height = height;
    this.greenSprite.x = width * -0.001;
    this.greenSprite.y = -width * 0.001;
  }
  
  public setPosition(x: number, y: number) {
    this.container.x = x;
    this.container.y = y;
  }
  
  public show() {
    this.container.visible = true;
  }
  
  public hide() {
    this.container.visible = false;
  }
  
  public destroy() {
    this.container.destroy();
  }
}

export function createGreenLight(options: GreenLightOptions): Container {
  const greenLight = new GreenLight(options);
  return greenLight.container;
}
