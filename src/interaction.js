/**
 * BEYOND Interaction & Gesture Manager
 * Handles rail finger slide, pointer drag physics, detail view 3D tilt parallax,
 * swipe transitions, keyboard shortcuts, and auto-demo.
 */

export class InteractionManager {
  constructor(appEl, stageManager, uiManager, onStateChange) {
    this.app = appEl;
    this.stage = stageManager;
    this.ui = uiManager;
    this.onStateChange = onStateChange;

    this.isPointerDown = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.hasMoved = false;
    this.lastFocusAtDown = 0;

    // Tilt in detail view
    this.tiltVelocity = 0;

    // Multi-touch tracking
    this.activePointers = new Map();
    this.lastTapTime = 0;

    // Auto-demo
    this.isDemoActive = true;
    this.demoTimer = null;

    this.initEvents();
    this.startAutoDemo();
  }

  startAutoDemo() {
    this.demoTimer = setInterval(() => {
      if (!this.isDemoActive || this.stage.mode !== 'home') return;
      const nextIdx = (this.stage.focusIndex + 1) % this.stage.products.length;
      this.setFocus(nextIdx, true);
    }, 3200);
  }

  stopAutoDemo() {
    if (this.isDemoActive) {
      this.isDemoActive = false;
      if (this.demoTimer) {
        clearInterval(this.demoTimer);
        this.demoTimer = null;
      }
      this.app.classList.add('touched');
    }
  }

  setFocus(idx, fromDemo = false) {
    if (idx < 0 || idx >= this.stage.products.length) return;
    if (idx === this.stage.focusIndex && !fromDemo) return;
    
    this.stage.setFocus(idx);
    this.ui.updateCap(idx);

    if (!fromDemo && navigator.vibrate) {
      try { navigator.vibrate(6); } catch (e) {}
    }
    this.onStateChange('focus', idx);
  }

  openDetail(idx) {
    this.stopAutoDemo();
    if (this.stage.mode === 'detail') return;

    this.stage.openDetail(idx);
    this.app.classList.add('detail');
    this.ui.showDetail(idx);

    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }
    this.onStateChange('detail', idx);
  }

  closeDetail() {
    if (this.stage.mode !== 'detail') return;

    this.stage.closeDetail();
    this.app.classList.remove('detail');
    this.ui.showHome(this.stage.focusIndex);

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) {}
    }
    this.onStateChange('home', this.stage.focusIndex);
  }

  navigate(dir) {
    if (this.stage.mode !== 'detail') return;
    this.stage.navigate(dir);
    this.ui.showDetail(this.stage.selectedIndex);

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) {}
    }
    this.onStateChange('navigate', this.stage.selectedIndex);
  }

  calcRailZone(clientX) {
    const stageContainer = document.getElementById('viewportStage') || this.app;
    const rect = stageContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    const padding = 24;
    const span = Math.max(10, rect.width - padding * 2);
    const ratio = Math.max(0, Math.min(0.999, (x - padding) / span));
    const N = this.stage.products.length;
    return Math.floor(ratio * N);
  }

  initEvents() {
    const stageEl = document.getElementById('viewportStage') || this.app;

    stageEl.addEventListener('pointerdown', (e) => {
      // Don't intercept clicks on buttons, links, or controls
      if (e.target.closest('button, a, input, select, .drawer, .seg, .tag, .shop-section, .bottom-nav, .top')) {
        return;
      }

      this.stopAutoDemo();
      this.isPointerDown = true;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      this.startX = e.clientX;
      this.startY = e.clientY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.hasMoved = false;
      this.lastFocusAtDown = this.stage.focusIndex;

      // Double tap reset in detail mode
      const now = performance.now();
      if (this.stage.mode === 'detail' && now - this.lastTapTime < 280) {
        this.stage.setDetailTilt(0);
        this.stage.setDetailViewSide('front');
        this.ui.resetSegmentedView();
      }
      this.lastTapTime = now;

      this.stage.triggerImpulse(1.0);

      // In home mode, if clicked directly on an item wrapper, find its index
      const clickedWrapper = e.target.closest('.product-wrapper');
      if (clickedWrapper && clickedWrapper.dataset.idx !== undefined) {
        const itemIdx = parseInt(clickedWrapper.dataset.idx, 10);
        this.setFocus(itemIdx);
      } else if (this.stage.mode === 'home') {
        const zone = this.calcRailZone(e.clientX);
        this.setFocus(zone);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Desktop hover across rail in home mode: only switch focus when mouse hovers directly over a garment
      if (!this.isPointerDown) {
        if (this.stage.mode === 'home' && e.pointerType === 'mouse') {
          const hoveredWrapper = e.target.closest('.product-wrapper');
          if (hoveredWrapper && hoveredWrapper.dataset.idx !== undefined) {
            const idx = parseInt(hoveredWrapper.dataset.idx, 10);
            this.setFocus(idx);
          }
        }
        return;
      }

      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      const totalDx = e.clientX - this.startX;
      const totalDy = e.clientY - this.startY;

      if (Math.abs(totalDx) > 8 || Math.abs(totalDy) > 8) {
        this.hasMoved = true;
      }

      if (this.stage.mode === 'home') {
        if (this.hasMoved && Math.abs(totalDx) >= Math.abs(totalDy)) {
          const zone = this.calcRailZone(e.clientX);
          this.setFocus(zone);
        }
      } else if (this.stage.mode === 'detail') {
        // Drag tilt parallax in detail view
        this.tiltVelocity = dx * 0.45;
        this.stage.setDetailTilt(this.stage.detailTiltX + this.tiltVelocity);
      }

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    const onPointerEnd = (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.delete(e.pointerId);
      }

      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      const totalDx = e.clientX - this.startX;
      const totalDy = e.clientY - this.startY;

      if (this.stage.mode === 'detail') {
        // Horizontal swipe gesture to switch garment
        if (Math.abs(totalDx) > 55 && Math.abs(totalDx) > Math.abs(totalDy) * 1.5) {
          this.navigate(totalDx < 0 ? 1 : -1);
          return;
        }

        // Swipe down gesture to return to rail
        if (totalDy > 75 && Math.abs(totalDy) > Math.abs(totalDx) * 1.4) {
          this.closeDetail();
          return;
        }

        // Return tilt smoothly to 0
        this.stage.setDetailTilt(0);
      } else if (this.stage.mode === 'home') {
        if (!this.hasMoved) {
          const zone = this.calcRailZone(e.clientX);
          if (zone === this.lastFocusAtDown) {
            this.openDetail(zone);
          } else {
            this.setFocus(zone);
          }
        }
      }
    };

    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const N = this.stage.products.length;
      if (e.key === 'ArrowRight') {
        this.stopAutoDemo();
        this.stage.mode === 'detail' ? this.navigate(1) : this.setFocus((this.stage.focusIndex + 1) % N);
      } else if (e.key === 'ArrowLeft') {
        this.stopAutoDemo();
        this.stage.mode === 'detail' ? this.navigate(-1) : this.setFocus((this.stage.focusIndex + N - 1) % N);
      } else if (e.key === 'Enter' && this.stage.mode === 'home') {
        this.openDetail(this.stage.focusIndex);
      } else if (e.key === 'Escape') {
        if (this.stage.mode === 'detail') {
          this.closeDetail();
        } else {
          this.ui.closeAllDrawers();
        }
      }
    });

    // Gyro device orientation tilt
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && this.stage.mode === 'detail' && !this.isPointerDown) {
          const tilt = Math.max(-14, Math.min(14, (e.gamma / 45) * 14));
          this.stage.setDetailTilt(tilt);
        }
      }, true);
    }
  }

  update(delta) {
    if (this.stage.mode === 'detail' && !this.isPointerDown) {
      this.stage.setDetailTilt(0);
    }
  }
}
