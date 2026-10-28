import { loadProductsManifest, preloadCriticalImages } from './products.js';
import { StageManager } from './stage.js';
import { InteractionManager } from './interaction.js';
import { UIManager } from './ui.js';

/**
 * BEYOND — Dark Luxury Streetwear Experience
 * Image-based 3D rail and turn physics with realistic photographic archival pieces.
 */

async function bootstrap() {
  const appEl = document.getElementById('app');
  const stageContainer = document.getElementById('viewportStage') || appEl;
  const stageEl = document.getElementById('stage');
  const railEl = document.getElementById('rail');

  // 1. Initialize Stage & UI Managers
  const stageManager = new StageManager(stageContainer, stageEl, railEl);
  let interactionManager = null;

  const uiManager = new UIManager(appEl, (action, payload) => {
    switch (action) {
      case 'closeDetail':
        interactionManager?.closeDetail();
        break;
      case 'openCurrentFocus':
        interactionManager?.openDetail(stageManager.focusIndex);
        break;
      case 'openDetailByIndex':
        interactionManager?.openDetail(payload);
        break;
      case 'navigate':
        interactionManager?.navigate(payload);
        break;
      case 'flipView':
        stageManager.setDetailViewSide(payload);
        break;
      case 'colorChange':
        stageManager.setColorway(payload.garmentIndex, payload.colorIndex);
        break;
      case 'getCurrentColor':
        return stageManager.currentColorIndices[payload] ?? 0;
      case 'getCurrentSelectedProduct':
        return stageManager.products[stageManager.selectedIndex] ?? stageManager.products[0];
    }
  });

  // 2. Load Product Catalog & Preload Images
  uiManager.setLoaderProgress(0.15, 'INITIALIZING ARCHIVE RUN...');
  const products = await loadProductsManifest((p, status) => {
    uiManager.setLoaderProgress(0.15 + p * 0.45, status.toUpperCase());
  });

  uiManager.setProducts(products);

  uiManager.setLoaderProgress(0.65, 'DECODING ARCHIVAL ASSETS...');
  await preloadCriticalImages(products, (p, status) => {
    uiManager.setLoaderProgress(0.65 + p * 0.35, status.toUpperCase());
  });

  // 3. Initialize Stage with Products
  stageManager.init(products);

  // 4. Initialize Interaction Manager
  interactionManager = new InteractionManager(appEl, stageManager, uiManager, (type, index) => {
    // State change callback
    if (type === 'focus' || type === 'navigate') {
      uiManager.updateCap(index);
    }
  });

  // Expose for testing/automation verification
  window.__stage = stageManager;
  window.__interaction = interactionManager;
  window.__ui = uiManager;

  // 5. Initial UI setup & Layout
  uiManager.updateCap(0);

  function handleResize() {
    stageManager.updateLayout();
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  handleResize();

  // Complete loading screen
  uiManager.setLoaderProgress(1.0, 'ARCHIVE READY');

  // 6. 60 FPS Animation & Spring Physics Loop (Strictly single active loop)
  if (!window.__beyond_loop_active) {
    window.__beyond_loop_active = true;
    let lastTime = performance.now();
    let isPaused = false;
    let rafId = null;

    function renderLoop(currentTime) {
      if (isPaused) return;

      const delta = Math.min((currentTime - lastTime) / 1000.0, 0.05);
      const elapsedTime = currentTime / 1000.0;
      lastTime = currentTime;

      // Update spring physics and stage state
      stageManager.update(elapsedTime, delta);
      interactionManager.update(delta);

      rafId = requestAnimationFrame(renderLoop);
    }

    document.addEventListener('visibilitychange', () => {
      isPaused = document.hidden;
      if (!isPaused) {
        lastTime = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(renderLoop);
      }
    });

    rafId = requestAnimationFrame(renderLoop);
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
