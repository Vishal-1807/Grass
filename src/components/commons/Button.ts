// Button.ts - Simplified universal button component
import { Graphics, Sprite, Container, Texture, Text, TextStyle } from 'pixi.js'

interface ButtonOptions {
  // Basic button properties
  texture?: Texture | Sprite
  width?: number
  height?: number
  x?: number | string // supports % like "50%"
  y?: number | string
  anchorX?: number // 0 to 1, default 0.5 (center)
  anchorY?: number
  
  // Label properties
  label?: string
  labelStyle?: Partial<TextStyle>
  
  // Interaction
  onClick?: () => void
  
  // Visual effects
  hoverTint?: number // Tint color on hover
  pressedTint?: number // Tint color when pressed
  disabled?: boolean
  
  // Simple overlay support (for basic buttons that need one overlay)
  overlayTexture?: Texture | Sprite
  overlayOffset?: { x: number; y: number }
}

export function createButton(options: ButtonOptions = {}): Container {
  const {
    texture,
    width = 150,
    height = 80,
    x,
    y,
    anchorX = 0.5,
    anchorY = 0.5,
    label,
    labelStyle = {},
    onClick,
    hoverTint = 0xDDDDDD,
    pressedTint = 0xBBBBBB,
    disabled = false,
    overlayTexture,
    overlayOffset = { x: 0, y: 0 }
  } = options

  const button = new Container()
  let bg: Sprite | Graphics
  let overlay: Sprite | null = null
  let text: Text | undefined

  // Create background
  if (texture) {
    bg = new Sprite(texture)
    const scaleX = width / bg.texture.width
    const scaleY = height / bg.texture.height
    bg.scale.set(scaleX, scaleY)
  } else {
    // Default styled button
    const g = new Graphics()
    g.fill(0x007BFF) // Default blue
    g.roundRect(0, 0, width, height, 12)
    g.fill()
    bg = g
  }

  bg.eventMode = 'static'
  if (!disabled) {
    bg.cursor = 'pointer'
  }
  button.addChild(bg)

  // Add overlay if provided
  if (overlayTexture) {
    overlay = new Sprite(overlayTexture)
    overlay.width = width
    overlay.height = height
    overlay.x = overlayOffset.x
    overlay.y = overlayOffset.y
    button.addChild(overlay)
  }

  // Add label if provided
  if (label) {
    const style: Partial<TextStyle> = {
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center' as const,
      ...labelStyle,
    }

    text = new Text(label, style)
    text.anchor.set(0.5)
    text.x = width / 2
    text.y = height / 2
    button.addChild(text)
  }

  // Set up interaction if not disabled
  if (!disabled && onClick) {
    button.eventMode = 'static'
    button.cursor = 'pointer'

    // Hover effects
    button.on('pointerover', () => {
      bg.tint = hoverTint
      if (overlay) overlay.tint = hoverTint
    })

    button.on('pointerout', () => {
      bg.tint = 0xFFFFFF
      if (overlay) overlay.tint = 0xFFFFFF
    })

    // // Press effects
    // button.on('pointerdown', () => {
    //   bg.tint = pressedTint
    //   if (overlay) overlay.tint = pressedTint
    //   button.scale.set(0.95) // Slight scale down effect
    // })

    // button.on('pointerup', () => {
    //   bg.tint = hoverTint
    //   if (overlay) overlay.tint = hoverTint
    //   button.scale.set(1.0) // Restore scale
    // })

    // button.on('pointerupoutside', () => {
    //   bg.tint = 0xFFFFFF
    //   if (overlay) overlay.tint = 0xFFFFFF
    //   button.scale.set(1.0) // Restore scale
    // })

    // Click handler
    button.on('pointertap', onClick)
  }

  // Helper function to resolve position based on number or percentage string
  function resolvePosition(
    coord: number | string | undefined,
    size: number,
    stageSize: number,
    anchor: number
  ): number {
    if (typeof coord === 'string' && coord.endsWith('%')) {
      const percent = parseFloat(coord) / 100
      return stageSize * percent - size * anchor
    } else if (typeof coord === 'number') {
      return coord
    }
    // Default to center
    return (stageSize - size) * anchor
  }

  // Resize handler for responsive positioning
  const resize = () => {
    const stage = button.parent
    if (!stage) return

    const stageW = stage.width
    const stageH = stage.height

    button.x = resolvePosition(x, width, stageW, anchorX)
    button.y = resolvePosition(y, height, stageH, anchorY)

    // Auto-scale text to fit button if no specific fontSize was provided
    if (text && !labelStyle.fontSize) {
      const baseFontSize = 100
      const minFontSize = 6
      const padding = 10

      let fontSize = baseFontSize
      text.style.fontSize = fontSize

      // Reduce font size until text fits within button
      while (fontSize > minFontSize && text.width > width - padding * 2) {
        fontSize -= 1
        text.style.fontSize = fontSize
        // Force PIXI to recalculate text bounds - different methods for different PIXI versions
        if ((text as any).updateText) {
          (text as any).updateText()
        } else if ((text as any)._updateText) {
          (text as any)._updateText()
        } else {
          // Force recalculation by temporarily changing text
          const originalText = text.text
          text.text = originalText + ' '
          text.text = originalText
        }
      }

      // Scale text to fit button height
      const scale = (height * 0.4) / fontSize
      text.scale.set(scale)
      
      // Re-center text
      text.x = width / 2
      text.y = height / 2
    }
  }

  // Set up resize handling
  button.on('added', resize)
  window.addEventListener('resize', resize)

  // Clean up event listener when button is removed
  button.on('removed', () => {
    window.removeEventListener('resize', resize)
  })

  // Public methods for external control
  const buttonAPI = {
    setEnabled: (enabled: boolean) => {
      if (enabled) {
        button.eventMode = 'static'
        button.cursor = 'pointer'
        bg.tint = 0xFFFFFF
        if (overlay) overlay.tint = 0xFFFFFF
      } else {
        button.eventMode = 'none'
        button.cursor = 'default'
        bg.tint = 0x888888
        if (overlay) overlay.tint = 0x888888
      }
    },
    
    setText: (newText: string) => {
      if (text) {
        text.text = newText
        resize() // Recompute sizing
      }
    },
    
    setTexture: (newTexture: Texture | Sprite) => {
      if (bg instanceof Sprite) {
        bg.texture = newTexture instanceof Sprite ? newTexture.texture : newTexture
      }
    }
  }

  // Attach API methods to container
  Object.assign(button, buttonAPI)

  return button
}

export default createButton