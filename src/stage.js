/**
 * BEYOND Stage & Rail Physics Manager
 * Controls the 9 dark luxury streetwear garments on the dark brushed steel rod,
 * precise hook alignment, clean side->front turning transitions, resting sway,
 * and 3D detail inspection view.
 */

export class StageManager {
  constructor(containerEl, stageEl, railEl) {
    this.container = containerEl;
    this.stage = stageEl;
    this.rail = railEl;

    this.products = [];
    this.productElements = [];
    this.focusIndex = 0;
    this.selectedIndex = 0;
    this.mode = 'home'; // 'home' | 'detail'
    this.detailViewSide = 'front'; // 'front' | 'back'
    this.currentColorIndices = [];

    // Continuous rail dragging coordinates
    this.railScrollX = 0;
    this.targetRailScrollX = 0;
    this.dragStartScrollX = 0;
    this.isDragging = false;
    this.baseSlotPositions = [];

    // Cached layout dimensions to prevent layout thrashing in rAF
    this.cachedW = window.innerWidth;
    this.cachedH = window.innerHeight;
    this.isMobile = false;
    this.isDesktop = true;
    this.wrapperW = 330;
    this.wrapperH = 440;
    this.railY = 200;
    this.hangerSpacing = 120;
    this.partGap = 45;

    // Springs for each product: x, y, scale, opacity, sway
    this.states = [];

    // Interactive 3D tilt parallax in detail view
    this.detailTiltX = 0;
    this.targetDetailTiltX = 0;

    // Impulse physics for natural sway
    this.impulseTime = 0;

    // Callback when focused piece changes during drag
    this.onFocusChange = null;
  }

  init(products) {
    this.products = products;
    this.stage.innerHTML = '';
    this.productElements = [];
    this.states = [];
    this.currentColorIndices = products.map(() => 0);

    const N = products.length;

    for (let i = 0; i < N; i++) {
      const p = products[i];
      const col = p.colors[0];

      const el = document.createElement('div');
      el.className = 'product-wrapper';
      el.dataset.slug = p.slug;
      el.dataset.idx = i;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Inspect ${p.name} - ${p.price}`);

      el.innerHTML = `
        <a href="#/piece/${p.slug}" class="garment-hit-target" data-idx="${i}" data-slug="${p.slug}" aria-label="${p.name}"></a>
        <div class="product-sway">
          <div class="product-shadow"></div>
          <div class="flip-card">
            <div class="face side">
              <img class="img-side"
                   src="${col.sideRail || col.side}"
                   srcset="${col.sideRail ? `${col.sideRail} 340w, ${col.side} 900w` : `${col.side} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} side profile on hanger"
                   decoding="async"
                   draggable="false" />
            </div>
            <div class="face front">
              <img class="img-front"
                   src="${col.frontRail || col.front}"
                   srcset="${col.frontRail ? `${col.frontRail} 340w, ${col.front} 900w` : `${col.front} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} front presentation"
                   decoding="async"
                   draggable="false" />
            </div>
            <div class="face back">
              <img class="img-back"
                   src="${col.backRail || col.back}"
                   srcset="${col.backRail ? `${col.backRail} 340w, ${col.back} 900w` : `${col.back} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} back view"
                   decoding="async"
                   draggable="false" />
            </div>
          </div>
        </div>
      `;

      this.stage.appendChild(el);

      const swayEl = el.querySelector('.product-sway');
      const flipCardEl = el.querySelector('.flip-card');
      const hitTargetEl = el.querySelector('.garment-hit-target');
      const imgSide = el.querySelector('.img-side');
      const imgFront = el.querySelector('.img-front');
      const imgBack = el.querySelector('.img-back');

      // Hook apex transform origin
      const hookPercentY = ((p.hook?.y || 0.09) * 100).toFixed(1);
      swayEl.style.transformOrigin = `50% ${hookPercentY}%`;

      this.productElements.push({
        wrapper: el,
        sway: swayEl,
        flipCard: flipCardEl,
        hitTarget: hitTargetEl,
        imgSide,
        imgFront,
        imgBack,
        // DOM state caching to avoid redundant style writes
        lastTransformStr: '',
        lastOpacityStr: '',
        lastZIndex: -1,
        lastSwayStr: '',
        lastFlipStr: ''
      });

      this.states.push({
        x: 0,
        y: 0,
        scale: 0.88,
        targetX: 0,
        targetY: 0,
        targetScale: 0.88,
        opacity: 1.0,
        targetOpacity: 1.0,
        swayPhase: i * 0.85,
        swayAngle: 0
      });
    }

    this.updateLayout();
  }

  updateLayout() {
    if (!this.products.length) return;
    const W = this.container.clientWidth || window.innerWidth;
    const H = this.container.clientHeight || window.innerHeight;
    this.cachedW = W;
    this.cachedH = H;

    const N = this.products.length;
    this.isMobile = W < 600;
    this.isDesktop = W >= 1024;

    this.wrapperW = this.isDesktop ? 330 : 270;
    this.wrapperH = this.isDesktop ? 440 : 360;

    this.hangerSpacing = this.isDesktop ? 120 : this.isMobile ? 80 : 100;
    this.partGap = this.isDesktop ? 50 : this.isMobile ? 32 : 42;

    // Rail rod position anchored at upper-middle portion of hero viewport
    this.railY = Math.round(H * (this.isMobile ? 0.22 : this.isDesktop ? 0.20 : 0.21));
    this.rail.style.top = `${this.railY}px`;

    const centerTarget = W * 0.5;

    if (this.mode === 'home') {
      this.recalculateBaseSlots();

      const focusedBaseX = this.baseSlotPositions[this.focusIndex];
      this.targetRailScrollX = centerTarget - focusedBaseX;
      if (!this.isDragging) {
        this.railScrollX = this.targetRailScrollX;
      }

      for (let i = 0; i < N; i++) {
        const state = this.states[i];
        const isFocused = i === this.focusIndex;
        const els = this.productElements[i];

        state.targetX = this.baseSlotPositions[i] + this.targetRailScrollX;
        state.targetY = this.railY;
        state.targetScale = isFocused ? (this.isMobile ? 0.94 : this.isDesktop ? 1.02 : 0.98) : (this.isMobile ? 0.74 : 0.78);
        state.targetOpacity = 1.0;

        els.wrapper.classList.toggle('focused', isFocused);
        els.wrapper.classList.remove('detail-active', 'view-back');
      }
    } else {
      // Detail View: Centered garment with split composition on desktop, top-half on mobile
      const detailY = Math.round(H * (this.isMobile ? 0.15 : 0.18));
      const detailX = this.isMobile ? (W * 0.5) : (W * 0.38);

      for (let i = 0; i < N; i++) {
        const state = this.states[i];
        const offset = ((i - this.selectedIndex + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
        const els = this.productElements[i];

        if (offset === 0) {
          state.targetX = detailX;
          state.targetY = detailY;
          state.targetScale = this.isMobile ? 0.96 : (this.isDesktop ? 1.35 : 1.25);
          state.targetOpacity = 1.0;

          els.wrapper.classList.add('detail-active', 'focused');
          els.wrapper.classList.toggle('view-back', this.detailViewSide === 'back');
        } else {
          const ghostGap = this.isMobile ? 120 : 180;
          state.targetX = detailX + offset * ghostGap;
          state.targetY = detailY + 24;
          state.targetScale = 0.5;
          state.targetOpacity = Math.abs(offset) === 1 ? 0.18 : 0.0;

          els.wrapper.classList.remove('detail-active', 'focused', 'view-back');
        }
      }
    }
  }

  recalculateBaseSlots() {
    const N = this.products.length;
    this.baseSlotPositions = [];
    for (let i = 0; i < N; i++) {
      const anchor = i * this.hangerSpacing;
      let slotPos = anchor;
      if (i < this.focusIndex) {
        slotPos -= this.partGap;
      } else if (i > this.focusIndex) {
        slotPos += this.partGap;
      }
      this.baseSlotPositions.push(slotPos);
    }
  }

  /* ──────── Continuous Rail Dragging Physics ──────── */

  startDrag() {
    if (this.mode !== 'home') return;
    this.isDragging = true;
    this.dragStartScrollX = this.railScrollX;
  }

  dragRail(deltaX) {
    if (this.mode !== 'home') return;
    const N = this.products.length;
    if (N === 0) return;

    const centerTarget = this.cachedW * 0.5;
    const maxScroll = centerTarget - this.baseSlotPositions[0];
    const minScroll = centerTarget - this.baseSlotPositions[N - 1];

    let newScroll = this.dragStartScrollX + deltaX;

    // Soft elastic resistance beyond boundaries
    if (newScroll > maxScroll) {
      newScroll = maxScroll + (newScroll - maxScroll) * 0.28;
    } else if (newScroll < minScroll) {
      newScroll = minScroll + (newScroll - minScroll) * 0.28;
    }

    this.targetRailScrollX = newScroll;
    this.railScrollX = newScroll; // Responsive 1:1 instant movement without drag latency

    // Determine which garment is currently closest to center
    let closestIdx = this.focusIndex;
    let minDiff = Infinity;
    for (let i = 0; i < N; i++) {
      const currentScreenX = this.baseSlotPositions[i] + this.railScrollX;
      const diff = Math.abs(currentScreenX - centerTarget);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    if (closestIdx !== this.focusIndex) {
      this.focusIndex = closestIdx;
      this.recalculateBaseSlots();

      for (let i = 0; i < N; i++) {
        const isFocused = i === this.focusIndex;
        const els = this.productElements[i];
        const state = this.states[i];
        if (els) els.wrapper.classList.toggle('focused', isFocused);
        if (state) {
          state.targetScale = isFocused ? (this.isMobile ? 0.94 : this.isDesktop ? 1.02 : 0.98) : (this.isMobile ? 0.74 : 0.78);
        }
      }

      if (this.onFocusChange) {
        this.onFocusChange(closestIdx);
      }
    }
  }

  endDrag(velocity = 0) {
    if (this.mode !== 'home') return;
    this.isDragging = false;
    const N = this.products.length;
    if (N === 0) return;

    const centerTarget = this.cachedW * 0.5;
    let snapIdx = this.focusIndex;

    // Inertia swipe advance
    if (velocity < -0.35) {
      snapIdx = Math.min(N - 1, this.focusIndex + (velocity < -1.1 ? 2 : 1));
    } else if (velocity > 0.35) {
      snapIdx = Math.max(0, this.focusIndex - (velocity > 1.1 ? 2 : 1));
    }

    this.focusIndex = snapIdx;
    this.recalculateBaseSlots();

    const maxScroll = centerTarget - this.baseSlotPositions[0];
    const minScroll = centerTarget - this.baseSlotPositions[N - 1];
    const targetScroll = centerTarget - this.baseSlotPositions[snapIdx];

    this.targetRailScrollX = Math.max(minScroll, Math.min(maxScroll, targetScroll));

    for (let i = 0; i < N; i++) {
      const isFocused = i === this.focusIndex;
      const els = this.productElements[i];
      const state = this.states[i];
      if (els) els.wrapper.classList.toggle('focused', isFocused);
      if (state) {
        state.targetScale = isFocused ? (this.isMobile ? 0.94 : this.isDesktop ? 1.02 : 0.98) : (this.isMobile ? 0.74 : 0.78);
      }
    }

    if (this.onFocusChange) {
      this.onFocusChange(snapIdx);
    }
  }

  setFocus(idx) {
    if (idx < 0 || idx >= this.products.length || idx === this.focusIndex || this.mode !== 'home') return;
    this.focusIndex = idx;
    this.updateLayout();
  }

  openDetail(idx) {
    if (idx < 0 || idx >= this.products.length) return;
    this.isDragging = false;
    this.mode = 'detail';
    this.selectedIndex = idx;
    this.focusIndex = idx;
    this.detailViewSide = 'front';
    this.detailTiltX = 0;
    this.targetDetailTiltX = 0;
    this.updateLayout();
  }

  closeDetail() {
    this.mode = 'home';
    this.detailViewSide = 'front';
    this.detailTiltX = 0;
    this.targetDetailTiltX = 0;
    this.updateLayout();
  }

  navigate(dir) {
    const N = this.products.length;
    this.selectedIndex = (this.selectedIndex + dir + N) % N;
    this.focusIndex = this.selectedIndex;
    this.detailViewSide = 'front';
    this.detailTiltX = 0;
    this.targetDetailTiltX = 0;
    this.updateLayout();
  }

  setDetailViewSide(side) {
    this.detailViewSide = side;
    const selEl = this.productElements[this.selectedIndex];
    if (selEl) {
      selEl.wrapper.classList.toggle('view-back', side === 'back');
    }
  }

  setColorway(productIndex, colorIndex) {
    this.currentColorIndices[productIndex] = colorIndex;
    const p = this.products[productIndex];
    if (!p || !p.colors) return;
    const col = p.colors[colorIndex];
    const els = this.productElements[productIndex];

    if (els && col) {
      if (col.sideRail || col.side) {
        els.imgSide.src = col.sideRail || col.side;
        els.imgSide.srcset = `${col.sideRail || col.side} 340w, ${col.side} 900w`;
      }
      if (col.frontRail || col.front) {
        els.imgFront.src = col.frontRail || col.front;
        els.imgFront.srcset = `${col.frontRail || col.front} 340w, ${col.front} 900w`;
      }
      if (col.backRail || col.back) {
        els.imgBack.src = col.backRail || col.back;
        els.imgBack.srcset = `${col.backRail || col.back} 340w, ${col.back} 900w`;
      }
    }
  }

  setDetailTilt(tiltDeg) {
    this.targetDetailTiltX = Math.max(-18, Math.min(18, tiltDeg));
  }

  triggerImpulse(intensity = 1.0) {
    this.impulseTime = 1.0 * intensity;
  }

  /**
   * Geometrically resolves which garment was tapped based on coordinate proximity.
   * Completely avoids wrong-product hits or neighboring garment mismatches.
   */
  getGarmentAt(clientX, clientY) {
    if (this.mode !== 'home') {
      return this.selectedIndex;
    }
    const N = this.products.length;
    if (N === 0) return null;

    // Check vertical bounds relative to the rail rod
    const topMin = this.railY - 60;
    const bottomMax = this.railY + this.wrapperH + 60;
    if (clientY < topMin || clientY > bottomMax) {
      return null;
    }

    // 1. Check if user clicked within the front-facing focused garment
    const focusedState = this.states[this.focusIndex];
    if (focusedState) {
      const halfW = (this.isDesktop ? 120 : 90) * (focusedState.scale || 1.0);
      if (Math.abs(clientX - focusedState.x) <= halfW) {
        return this.focusIndex;
      }
    }

    // 2. Otherwise find the closest hanging garment along the rail rod
    let bestIdx = null;
    let bestDist = Infinity;
    for (let i = 0; i < N; i++) {
      const s = this.states[i];
      if (!s) continue;
      const dist = Math.abs(clientX - s.x);
      const maxSideDist = (this.isDesktop ? 70 : 50) * (s.scale || 0.8);
      if (dist <= maxSideDist && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  update(time, delta) {
    const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const springSpeed = Math.min(1.0, 9.5 * delta);

    if (this.impulseTime > 0.001) {
      this.impulseTime *= Math.exp(-3.5 * delta);
    } else {
      this.impulseTime = 0;
    }

    // Continuous rail spring interpolation
    if (this.mode === 'home' && !this.isDragging) {
      this.railScrollX += (this.targetRailScrollX - this.railScrollX) * springSpeed;
    }

    // Smooth tilt interpolation in detail mode
    if (this.mode === 'detail') {
      this.detailTiltX += (this.targetDetailTiltX - this.detailTiltX) * Math.min(1.0, 14.0 * delta);
    }

    const N = this.products.length;
    const wrapperW = this.wrapperW;
    const wrapperH = this.wrapperH;
    const halfWrapperW = wrapperW * 0.5;

    for (let i = 0; i < N; i++) {
      const state = this.states[i];
      const p = this.products[i];
      const els = this.productElements[i];
      if (!state || !p || !els) continue;

      if (this.mode === 'home') {
        state.targetX = this.baseSlotPositions[i] + this.railScrollX;
        state.targetY = this.railY;
      }

      // Spring physics for position, scale, opacity
      state.x += (state.targetX - state.x) * (this.isDragging ? 1.0 : springSpeed);
      state.y += (state.targetY - state.y) * springSpeed;
      state.scale += (state.targetScale - state.scale) * springSpeed;
      state.opacity += (state.targetOpacity - state.opacity) * springSpeed;

      // Realistic pendulum sway (±0.85 deg) around hanger hook (disabled in reduced-motion)
      if (!isReducedMotion) {
        const isFocused = this.mode === 'home' && i === this.focusIndex;
        const isSelected = this.mode === 'detail' && i === this.selectedIndex;
        const swayAmp = (isFocused || isSelected) ? 0.35 : 0.85;
        const naturalSway = Math.sin(time * 1.6 + state.swayPhase) * swayAmp;
        const impulseSway = (isFocused || isSelected) ? Math.sin(time * 4.2) * this.impulseTime * 3.0 : 0;
        state.swayAngle = naturalSway + impulseSway;
      } else {
        state.swayAngle = 0;
      }

      const topY = state.y - (wrapperH * (p.hook?.y || 0.09));

      // DOM Optimization: Only write styles when values meaningfully change
      const tx = Math.round(state.x - halfWrapperW);
      const ty = Math.round(topY);
      const sc = Number(state.scale.toFixed(3));
      const transformStr = `translate3d(${tx}px, ${ty}px, 0) scale(${sc})`;
      if (els.lastTransformStr !== transformStr) {
        els.wrapper.style.transform = transformStr;
        els.lastTransformStr = transformStr;
      }

      const opStr = Math.max(0, Math.min(1, state.opacity)).toFixed(2);
      if (els.lastOpacityStr !== opStr) {
        els.wrapper.style.opacity = opStr;
        els.lastOpacityStr = opStr;
      }

      const isFocused = this.mode === 'home' && i === this.focusIndex;
      const isSelected = this.mode === 'detail' && i === this.selectedIndex;
      const zVal = isFocused || isSelected ? 25 : (12 - Math.min(10, Math.abs(i - this.focusIndex)));
      if (els.lastZIndex !== zVal) {
        els.wrapper.style.zIndex = zVal;
        els.lastZIndex = zVal;
      }

      // Sway transform
      if (!isReducedMotion) {
        const swayStr = `rotate(${state.swayAngle.toFixed(2)}deg)`;
        if (els.lastSwayStr !== swayStr) {
          els.sway.style.transform = swayStr;
          els.lastSwayStr = swayStr;
        }
      } else if (els.lastSwayStr !== 'none') {
        els.sway.style.transform = 'none';
        els.lastSwayStr = 'none';
      }

      // Detail interactive 3D tilt
      if (isSelected && this.mode === 'detail') {
        const baseRot = this.detailViewSide === 'back' ? 180 : 0;
        const tiltStr = `perspective(900px) rotateY(${(baseRot + this.detailTiltX).toFixed(2)}deg)`;
        if (els.lastFlipStr !== tiltStr) {
          els.flipCard.style.transform = tiltStr;
          els.lastFlipStr = tiltStr;
        }
      }
    }
  }
}
