/**
 * BEYOND Interaction & Gesture Manager
 * Handles rail finger slide, pointer drag physics, detail view 3D tilt parallax,
 * swipe transitions, keyboard shortcuts, hash routing, and click/drag conflict resolution.
 */

export class InteractionManager {
  constructor(appEl, stageManager, uiManager, onStateChange) {
    this.app = appEl;
    this.stage = stageManager;
    this.ui = uiManager;
    this.onStateChange = onStateChange;

    // Pointer gesture state machine
    this.isPointerDown = false;
    this.isDragging = false;
    this.hasMoved = false;
    this.isVerticalScroll = false;
    this.activePointerId = null;

    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.downTime = 0;
    this.dragTargetIdx = null;

    // Velocity tracker for inertia swipe
    this.pointerVelocity = 0;
    this.pointerHistory = [];

    // Click suppression after an actual drag
    this.clickSuppressedUntil = 0;

    // Multi-touch tracking
    this.lastTapTime = 0;

    // Auto-demo
    this.isDemoActive = true;
    this.demoTimer = null;

    // Connect StageManager callback for real-time caption updates during drag
    this.stage.onFocusChange = (newIdx) => {
      this.ui.updateCap(newIdx);
      this.onStateChange('focus', newIdx);
    };

    this.initEvents();
    this.initRouting();
    this.startAutoDemo();
  }

  startAutoDemo() {
    this.demoTimer = setInterval(() => {
      if (!this.isDemoActive || this.stage.mode !== 'home' || this.isPointerDown) return;
      const nextIdx = (this.stage.focusIndex + 1) % this.stage.products.length;
      this.setFocus(nextIdx, true);
    }, 3400);
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
    if (idx < 0 || idx >= this.stage.products.length) return;
    this.stopAutoDemo();
    this.isDragging = false;

    this.stage.openDetail(idx);
    this.app.classList.add('detail');
    this.ui.showDetail(idx);

    // Synchronize hash route for deep-linking and browser navigation
    const p = this.stage.products[idx];
    if (p && p.slug) {
      const targetHash = `#/piece/${p.slug}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }

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

    // Clear product piece hash route
    if (window.location.hash.startsWith('#/piece/')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) {}
    }
    this.onStateChange('home', this.stage.focusIndex);
  }

  navigate(dir) {
    if (this.stage.mode !== 'detail') return;
    this.stage.navigate(dir);
    this.ui.showDetail(this.stage.selectedIndex);

    const p = this.stage.products[this.stage.selectedIndex];
    if (p && p.slug) {
      window.location.hash = `#/piece/${p.slug}`;
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) {}
    }
    this.onStateChange('navigate', this.stage.selectedIndex);
  }

  /* ──────── Hash-Based Storefront Routing ──────── */
  initRouting() {
    window.addEventListener('hashchange', () => {
      this.handleHashRoute();
    });

    // Check initial hash on load
    setTimeout(() => {
      this.handleHashRoute();
    }, 100);
  }

  handleHashRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#/piece/')) {
      const param = hash.replace('#/piece/', '').trim();
      const pIdx = this.stage.products.findIndex(p => p.slug === param || String(p.slug).toLowerCase() === param.toLowerCase());
      if (pIdx !== -1) {
        if (this.stage.mode !== 'detail' || this.stage.selectedIndex !== pIdx) {
          this.openDetail(pIdx);
        }
      } else {
        const numIdx = parseInt(param, 10);
        if (!isNaN(numIdx) && numIdx >= 0 && numIdx < this.stage.products.length) {
          this.openDetail(numIdx);
        }
      }
    } else if (this.stage.mode === 'detail' && (!hash || hash === '#' || hash === '#/' || hash === '#campaign')) {
      this.closeDetail();
    }
  }

  resolveGarmentIndex(e) {
    // 1. Direct hit on data-idx attribute in DOM
    const wrapper = e.target.closest('[data-idx]');
    if (wrapper && wrapper.dataset.idx !== undefined) {
      const idx = parseInt(wrapper.dataset.idx, 10);
      if (!isNaN(idx) && idx >= 0 && idx < this.stage.products.length) {
        return idx;
      }
    }

    // 2. Direct hit on data-slug attribute in DOM
    const slugEl = e.target.closest('[data-slug]');
    if (slugEl && slugEl.dataset.slug) {
      const slugIdx = this.stage.products.findIndex(p => p.slug === slugEl.dataset.slug);
      if (slugIdx !== -1) return slugIdx;
    }

    // 3. Fallback to coordinate-based geometric resolution
    return this.stage.getGarmentAt(e.clientX, e.clientY);
  }

  initEvents() {
    const stageContainer = document.getElementById('viewportStage') || this.app;

    stageContainer.addEventListener('pointerdown', (e) => {
      // Don't intercept clicks on navigation buttons, links, or drawers
      if (e.target.closest('button, input, select, .drawer, .seg, .shop-section, .bottom-nav, .top, .hero-actions, .hero-info-left, .hero-info-right')) {
        return;
      }

      this.stopAutoDemo();

      this.isPointerDown = true;
      this.isDragging = false;
      this.hasMoved = false;
      this.isVerticalScroll = false;
      this.activePointerId = e.pointerId;

      this.startX = e.clientX;
      this.startY = e.clientY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.downTime = performance.now();

      this.pointerVelocity = 0;
      this.pointerHistory = [{ x: e.clientX, time: this.downTime }];

      // Determine which garment was targeted on down
      this.dragTargetIdx = this.resolveGarmentIndex(e);

      if (this.stage.mode === 'home') {
        this.stage.startDrag();
      }

      // Double-tap reset in detail view
      const now = performance.now();
      if (this.stage.mode === 'detail' && now - this.lastTapTime < 280) {
        this.stage.setDetailTilt(0);
        this.stage.setDetailViewSide('front');
        this.ui.resetSegmentedView();
      }
      this.lastTapTime = now;

      this.stage.triggerImpulse(0.8);
    });

    stageContainer.addEventListener('pointermove', (e) => {
      // Desktop hover across rail in home mode: only switch focus when mouse hovers over a garment
      if (!this.isPointerDown) {
        if (this.stage.mode === 'home' && e.pointerType === 'mouse') {
          const hoveredIdx = this.resolveGarmentIndex(e);
          if (hoveredIdx !== null && hoveredIdx !== this.stage.focusIndex) {
            this.setFocus(hoveredIdx);
          }
        }
        return;
      }

      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) {
        return;
      }

      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      const stepDx = e.clientX - this.lastX;
      const now = performance.now();

      // Velocity tracking
      this.pointerHistory.push({ x: e.clientX, time: now });
      if (this.pointerHistory.length > 5) this.pointerHistory.shift();

      if (this.pointerHistory.length >= 2) {
        const oldest = this.pointerHistory[0];
        const dt = (now - oldest.time) / 1000.0;
        if (dt > 0.001) {
          this.pointerVelocity = (e.clientX - oldest.x) / dt / 1000.0;
        }
      }

      // Gesture decision threshold: 7px
      if (!this.isDragging && !this.isVerticalScroll) {
        if (Math.hypot(dx, dy) > 7) {
          // If predominantly vertical gesture on mobile touch, allow natural page scrolling
          if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.3) {
            this.isVerticalScroll = true;
            return;
          }

          // User is dragging the clothing rail horizontally
          this.isDragging = true;
          this.hasMoved = true;
          try {
            stageContainer.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      }

      if (this.isVerticalScroll) {
        return;
      }

      if (this.isDragging) {
        if (this.stage.mode === 'home') {
          this.stage.dragRail(dx);
        } else if (this.stage.mode === 'detail') {
          // Drag tilt parallax in detail view
          const tiltStep = stepDx * 0.45;
          this.stage.setDetailTilt(this.stage.detailTiltX + tiltStep);
        }
      }

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    const onPointerEnd = (e) => {
      if (!this.isPointerDown) return;
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

      const wasDragging = this.isDragging;
      const hadMoved = this.hasMoved;
      const totalDx = e.clientX - this.startX;
      const totalDy = e.clientY - this.startY;

      try {
        if (stageContainer.hasPointerCapture(e.pointerId)) {
          stageContainer.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      this.isPointerDown = false;
      this.isDragging = false;
      this.isVerticalScroll = false;
      this.activePointerId = null;

      if (wasDragging) {
        // Drag gesture finished: suppress accidental click
        this.clickSuppressedUntil = performance.now() + 250;

        if (this.stage.mode === 'home') {
          this.stage.endDrag(this.pointerVelocity);
        } else if (this.stage.mode === 'detail') {
          // Horizontal swipe in detail view to change piece
          if (Math.abs(totalDx) > 55 && Math.abs(totalDx) > Math.abs(totalDy) * 1.4) {
            this.navigate(totalDx < 0 ? 1 : -1);
            return;
          }

          // Vertical swipe down in detail view to return to rail
          if (totalDy > 70 && Math.abs(totalDy) > Math.abs(totalDx) * 1.3) {
            this.closeDetail();
            return;
          }

          // Smoothly return detail tilt to 0
          this.stage.setDetailTilt(0);
        }
      } else if (!hadMoved) {
        // Genuine TAP / CLICK without movement
        if (performance.now() < this.clickSuppressedUntil) return;

        if (this.stage.mode === 'home') {
          // Resolve garment clicked
          let clickedIdx = this.dragTargetIdx;
          if (clickedIdx === null || clickedIdx === undefined || isNaN(clickedIdx)) {
            clickedIdx = this.resolveGarmentIndex(e);
          }

          if (clickedIdx !== null && clickedIdx !== undefined && clickedIdx >= 0 && clickedIdx < this.stage.products.length) {
            // Every garment represents a real product and directly opens its detail page
            this.openDetail(clickedIdx);
          }
        }
      }
    };

    stageContainer.addEventListener('pointerup', onPointerEnd);
    stageContainer.addEventListener('pointercancel', (e) => {
      try {
        if (stageContainer.hasPointerCapture(e.pointerId)) {
          stageContainer.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      this.isPointerDown = false;
      this.isDragging = false;
      this.isVerticalScroll = false;
      this.activePointerId = null;
      this.clickSuppressedUntil = performance.now() + 250;
      if (this.stage.mode === 'home') {
        this.stage.endDrag(0);
      }
    });

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

    // Gyro device orientation tilt (subtle parallax in detail view)
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
