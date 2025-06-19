import { AnimatedSprite, Texture, Spritesheet, Application } from "pixi.js";
import { Assets } from "pixi.js";

// Define the SpriteOptions type
type SpriteOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  animationSpeed?: number;
  loop?: boolean;
  autoplay?: boolean;
  anchor?: number;
  animationName?: string;
  center?: boolean;
};

export const createSpriteFromLoadedAssets = async (
  jsonName: string,
  options: SpriteOptions = {},
  app?: Application       // Optional PIXI Application instance (for centering)
): Promise<AnimatedSprite> => {
  const {
    x,
    y,
    width,
    height,
    scale = 1,
    animationSpeed = 0.5,
    loop = true,
    autoplay = true,
    anchor = 0.5,
    animationName,
    center = false,
  } = options;

  const sheet = Assets.get<Spritesheet>(jsonName);

  return new Promise((resolve) => {
   
      let textures: Texture[];

      if (animationName && sheet.animations[animationName]) {
        textures = sheet.animations[animationName];
      } else {
        textures = Object.values(sheet.textures);
      }

      const anim = new AnimatedSprite(textures);
      anim.anchor.set(anchor);
      anim.animationSpeed = animationSpeed;
      anim.loop = loop;

      if (autoplay) {
        anim.play();
      }

      // Resize using width/height if given
      if (width && height) {
        const originalWidth = anim.width;
        const originalHeight = anim.height;
        anim.scale.set(width / originalWidth, height / originalHeight);
      } else {
        anim.scale.set(scale);
      }

      // Center or position
      if (center && app) {
        anim.x = app.screen.width / 2;
        anim.y = app.screen.height / 2;
      } else {
        anim.x = x ?? 0;
        anim.y = y ?? 0;
      }

      resolve(anim);
    });

};

export default createSpriteFromLoadedAssets;
