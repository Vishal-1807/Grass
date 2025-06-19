import { Container, Graphics } from 'pixi.js';

function createSlider(width: number, initialValue: number, onChange: (value: number) => void): Container {
  const slider = new Container();

  const height = 10; // Slightly taller track
  const radius = 14; // Slightly larger knob
  const trackColor = 0x3ed1d7; // Reddish-orange color for track
  const knobColor = 0x1d1d1b; // Gold color for knob

  // Track
  const track = new Graphics();
  track.roundRect(0, 0, width, height, height/2);
  track.fill({ color: trackColor });
  slider.addChild(track);

  // Knob with gold border
  const knob = new Graphics();
  knob.circle(0, 0, radius);
  knob.fill({ color: knobColor });
  knob.stroke({ color: 0x00fffa, width: 3 });
  knob.y = height / 2;
  slider.addChild(knob);

  knob.eventMode = 'static';
  knob.cursor = 'pointer';

  // Set initial position
  const setKnobX = (value: number) => {
    knob.x = Math.max(0, Math.min(width, value * width));
  };

  setKnobX(initialValue);

  // Drag logic
  let dragging = false;

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;

    // Get the global position of the slider
    const globalPos = slider.getGlobalPosition();

    // Calculate the local X position relative to the slider
    // Use clientX for better cross-browser compatibility
    const localX = e.clientX - globalPos.x;

    // Constrain the position to the slider width
    const constrainedX = Math.max(0, Math.min(width, localX));

    // Calculate the normalized value (0-1)
    const value = constrainedX / width;

    // Update the knob position
    setKnobX(value);

    // Trigger the onChange callback with the new value
    onChange(value);
  };

  // Function to update knob appearance based on dragging state
  const updateKnobAppearance = (isDragging: boolean) => {
    if (isDragging) {
      // Make the knob slightly larger and brighter when dragging
      knob.clear();
      knob.circle(0, 0, radius * 1.1);
      knob.fill({ color: 0x00fffa }); // Brighter fill
      knob.stroke({ color: 0x00fffa, width: 3 }); // Brighter gold border
    } else {
      // Return to normal appearance
      knob.clear();
      knob.circle(0, 0, radius);
      knob.fill({ color: knobColor });
      knob.stroke({ color: 0x00fffa, width: 3 });
    }
  };

  const stopDrag = () => {
    dragging = false;
    updateKnobAppearance(false);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
  };

  // Allow clicking on the knob to start dragging
  knob.on('pointerdown', () => {
    dragging = true;
    updateKnobAppearance(true); // Update appearance when dragging starts
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
  });

  // Allow clicking directly on the track to set the value
  track.eventMode = 'static';
  track.cursor = 'pointer';
  track.on('pointerdown', (e) => {
    // Get the global position of the slider
    const globalPos = slider.getGlobalPosition();
    // Calculate the local X position relative to the slider
    const localX = e.global.x - globalPos.x;
    // Calculate the value based on the click position
    let value = Math.max(0, Math.min(1, localX / width));
    // Update the knob position
    setKnobX(value);
    // Trigger the onChange callback
    onChange(value);

    // Move the knob to the clicked position
    knob.x = Math.max(0, Math.min(width, localX));

    // Start dragging from this point
    dragging = true;
    updateKnobAppearance(true); // Update appearance when dragging starts
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
  });

  return slider;
}

export default createSlider;