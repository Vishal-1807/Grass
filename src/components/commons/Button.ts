// Button.ts - Simplified button (no press effects)
import { Graphics, Sprite, Container, Texture, Text, TextStyle } from 'pixi.js'

interface ButtonOptions {
  texture?: Texture | Sprite
  width?: number
  height?: number
  x?: number | string
  y?: number | string
  anchorX?: number
  anchorY?: number
  label?: string
  labelStyle?: Partial<TextStyle>
  onClick?: () => void
  hoverTint?: number
  disabled?: boolean
  overlayTexture?: Texture | Sprite
  overlayOffset?: { x: number; y: number }
}

export function createButton(options: ButtonOptions = {}): Container {
  const {
    texture,
    width = 150,
    height = 80,
    x, y,
    anchorX = 0.5, anchorY = 0.5,
    label, labelStyle = {},
    onClick,
    hoverTint = 0xDDDDDD,
    disabled = false,
    overlayTexture, overlayOffset = { x: 0, y: 0 },
  } = options

  const button = new Container()
  let bg: Sprite | Graphics
  let overlay: Sprite | null = null
  let text: Text | undefined

  if (texture) {
    bg = new Sprite(texture instanceof Sprite ? texture.texture : texture)
    const scaleX = width / bg.texture.width
    const scaleY = height / bg.texture.height
    bg.scale.set(scaleX, scaleY)
  } else {
    const g = new Graphics()
    g.beginFill(0x007BFF)
    g.drawRoundedRect(0, 0, width, height, 12)
    g.endFill()
    bg = g
  }

  bg.eventMode = disabled ? 'none' : 'static'
  bg.cursor = disabled ? 'default' : 'pointer'
  button.addChild(bg)

  if (overlayTexture) {
    overlay = new Sprite(
      overlayTexture instanceof Sprite ? overlayTexture.texture : overlayTexture
    )
    overlay.width = width
    overlay.height = height
    overlay.x = overlayOffset.x
    overlay.y = overlayOffset.y
    button.addChild(overlay)
  }

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

  const setNormal = () => {
    bg.tint = 0xFFFFFF
    if (overlay) overlay.tint = 0xFFFFFF
  }

  const setHover = () => {
    bg.tint = hoverTint
    if (overlay) overlay.tint = hoverTint
  }

  if (!disabled && onClick) {
    button.eventMode = 'static'
    button.cursor = 'pointer'

    // Track pointer state for proper click detection
    let isPointerDown = false
    let pointerDownPosition: { x: number; y: number } | null = null
    const dragThreshold = 5 // pixels

    button.on('pointerover', () => setHover())
    button.on('pointerout', () => setNormal())

    button.on('pointerdown', (event) => {
      isPointerDown = true
      pointerDownPosition = { x: event.global.x, y: event.global.y }
      setNormal()
    })

    button.on('pointerup', (event) => {
      if (isPointerDown && pointerDownPosition) {
        // Calculate distance moved since pointer down
        const deltaX = event.global.x - pointerDownPosition.x
        const deltaY = event.global.y - pointerDownPosition.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Only trigger click if pointer didn't move significantly (not a drag)
        if (distance <= dragThreshold) {
          onClick()
        }
      }

      // Reset state
      isPointerDown = false
      pointerDownPosition = null
    })

    // Handle case where pointer leaves the button while down
    button.on('pointerupoutside', () => {
      isPointerDown = false
      pointerDownPosition = null
    })
  }

  function resolvePosition(
    coord: number | string | undefined,
    size: number,
    stageSize: number,
    anchor: number
  ): number {
    if (typeof coord === 'string' && coord.endsWith('%')) {
      const pct = parseFloat(coord) / 100
      return stageSize * pct - size * anchor
    } else if (typeof coord === 'number') {
      return coord
    }
    return (stageSize - size) * anchor
  }

  const resize = () => {
    const stage = button.parent
    if (!stage) return
    const sw = 'width' in stage ? (stage as any).width : window.innerWidth
    const sh = 'height' in stage ? (stage as any).height : window.innerHeight
    button.x = resolvePosition(x, width, sw, anchorX)
    button.y = resolvePosition(y, height, sh, anchorY)
  }

  button.on('added', resize)
  window.addEventListener('resize', resize)
  button.on('removed', () => window.removeEventListener('resize', resize))

  const api = {
    setEnabled: (enabled: boolean) => {
      button.eventMode = enabled && onClick ? 'static' : 'none'
      button.cursor = enabled && onClick ? 'pointer' : 'default'
      bg.tint = enabled ? 0xFFFFFF : 0x888888
      if (overlay) overlay.tint = enabled ? 0xFFFFFF : 0x888888
    },
    setText: (newText: string) => {
      if (text) {
        text.text = newText
        resize()
      }
    },
    setTexture: (newTex: Texture | Sprite) => {
      if (bg instanceof Sprite) {
        bg.texture = newTex instanceof Sprite ? newTex.texture : newTex
      }
    },
  }
  Object.assign(button, api)
  return button
}

export default createButton
