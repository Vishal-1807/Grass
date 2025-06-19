import { Howl, Howler } from 'howler';

let bgVolume = 1;
let sfxVolume = 1;
let isMuted = false;
const ASSET_BASE = 'https://s3.eu-west-2.amazonaws.com/static.inferixai.link/pixi-game-assets/grass-minesweeper/';
// const ASSET_BASE = '';
// Store sound instances
const sounds: Record<string, Howl> = {};

export const SoundManager = {

  load() {
    const soundsToLoad = {
      bgMusic: `${ASSET_BASE}sounds/bgLoop.ogg`,
      uiclick: `${ASSET_BASE}sounds/uiclick.ogg`,
      start: `${ASSET_BASE}sounds/start.ogg`,
      collect: `${ASSET_BASE}sounds/collect.ogg`,
      betIncrease: `${ASSET_BASE}sounds/betIncrease.ogg`,
      betDecrease: `${ASSET_BASE}sounds/betDecrease.ogg`,
      popup: `${ASSET_BASE}sounds/popup.ogg`,
      bombExplode: `${ASSET_BASE}sounds/bombExplode.ogg`,
      bombReveal: `${ASSET_BASE}sounds/bombReveal.ogg`,
      flagReveal: `${ASSET_BASE}sounds/flagReveal.ogg`,
      gameComplete: `${ASSET_BASE}sounds/gameComplete.ogg`
    };

    // Create Howl instances for each sound
    for (const [alias, path] of Object.entries(soundsToLoad)) {
      if (!sounds[alias]) {
        sounds[alias] = new Howl({
          src: [path],
          volume: alias === 'bgMusic' ? bgVolume : sfxVolume,
          loop: alias === 'bgMusic',
          autoplay: false,
          preload: true,
          onend: () => {
            console.log(`Sound ${alias} ended`);
          },
          onloaderror: (id, error) => {
            console.error(`Error loading sound ${alias}:`, error);
          }
        });
      }
    }
  },

  // New method to wait for all sounds to load
  loadAndWaitForCompletion(): Promise<void> {
    this.load();

    return new Promise((resolve) => {
      // Create an array to track loading status of each sound
      const soundsArray = Object.values(sounds);
      const totalSounds = soundsArray.length;
      let loadedCount = 0;

      // Function to check if all sounds are loaded
      const checkAllLoaded = () => {
        loadedCount++;
        console.log(`Sound loaded: ${loadedCount}/${totalSounds}`);
        if (loadedCount >= totalSounds) {
          console.log('All sounds loaded successfully');
          resolve();
        }
      };

      // Check if sounds are already loaded
      for (const sound of soundsArray) {
        if (sound.state() === 'loaded') {
          checkAllLoaded();
        } else {
          // Add load event listener
          sound.once('load', checkAllLoaded);

          // Also handle load errors to prevent hanging
          sound.once('loaderror', (_, error) => {
            console.error('Error loading sound:', error);
            checkAllLoaded(); // Count errors as "loaded" to avoid hanging
          });
        }
      }

      // Safety timeout to prevent hanging if some sounds fail to load
      setTimeout(() => {
        if (loadedCount < totalSounds) {
          console.warn(`Timeout reached. Only ${loadedCount}/${totalSounds} sounds loaded.`);
          resolve();
        }
      }, 30000); // 30 second timeout
    });
  },

  playBackground(loop = true) {
    if (!isMuted && sounds.bgMusic) {
      sounds.bgMusic.loop(loop);
      sounds.bgMusic.volume(bgVolume);
      sounds.bgMusic.play();
    }
  },

  stopBackground() {
    if (sounds.bgMusic) {
      sounds.bgMusic.stop();
    }
  },

  updateBackgroundVolume() {
    if (sounds.bgMusic) {
      sounds.bgMusic.volume(bgVolume);
    }
  },

  setMusicVolume(vol: number) {
    bgVolume = vol;
    SoundManager.updateBackgroundVolume();
  },

  getMusicVolume(): number {
    return bgVolume;
  },

  setSfxVolume(vol: number) {
    sfxVolume = vol;
    // Update volume for all SFX sounds
    for (const [alias, sound] of Object.entries(sounds)) {
      if (alias !== 'bgMusic') {
        sound.volume(sfxVolume);
      }
    }
  },

  getSfxVolume(): number {
    return sfxVolume;
  },

  playUIClick() {
    if (!isMuted && sounds.uiclick) {
      sounds.uiclick.volume(sfxVolume);
      sounds.uiclick.play();
    }
  },

  playStartClick() {
    if (!isMuted && sounds.start) {
      sounds.start.volume(sfxVolume);
      sounds.start.play();
    }
  },

  playCollectClick() {
    if (!isMuted && sounds.collect) {
      sounds.collect.volume(sfxVolume);
      sounds.collect.play();
    }
  },

  playBetIncrease() {
    if (!isMuted && sounds.betIncrease) {
      sounds.betIncrease.volume(sfxVolume);
      sounds.betIncrease.play();
    }
  },

  playBetDecrease() {
    if (!isMuted && sounds.betDecrease) {
      sounds.betDecrease.volume(sfxVolume);
      sounds.betDecrease.play();
    }
  },

  playPopup() {
    if (!isMuted && sounds.popup) {
      sounds.popup.volume(sfxVolume);
      sounds.popup.play();
    }
  },

  playBombExplode() {
    if (!isMuted && sounds.bombExplode) {
      sounds.bombExplode.volume(sfxVolume);
      sounds.bombExplode.play();
    }
  },

  playBombReveal() {
    if (!isMuted && sounds.bombReveal) {
      sounds.bombReveal.volume(sfxVolume);
      sounds.bombReveal.play();
    }
  },

  playFlagReveal() {
    if (!isMuted && sounds.flagReveal) {
      sounds.flagReveal.volume(sfxVolume);
      sounds.flagReveal.play();
    }
  },

  playGameComplete() {
    if (!isMuted && sounds.gameComplete) {
      sounds.gameComplete.volume(sfxVolume);
      sounds.gameComplete.play();
    }
  },

  mute() {
    isMuted = true;
    Howler.mute(true);
  },

  unmute() {
    isMuted = false;
    Howler.mute(false);
  },

  isMuted() {
    return isMuted;
  },

  // Complete cleanup of all sounds and resources
  cleanup() {
    console.log('Cleaning up all sound resources');

    // Stop all currently playing sounds
    Howler.stop();

    // Unload all sound resources to prevent memory leaks
    for (const [alias, sound] of Object.entries(sounds)) {
      sound.unload();
      delete sounds[alias];
    }

    // Additional cleanup
    Howler.unload();
  }
};

// Add event listener for page visibility changes to handle tab switching
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden (user switched tabs or minimized window)
    Howler.mute(true);
  } else {
    // Page is visible again
    if (!isMuted) {
      Howler.mute(false);
    }
  }
});

// Add event listener for page unload to ensure proper cleanup
window.addEventListener('beforeunload', () => {
  SoundManager.cleanup();
});
