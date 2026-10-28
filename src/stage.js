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
    this.baseSlotPositions = [];

    // Springs for each product: x, y, scale, opacity, sway
    this.states = [];

    // Interactive 3D tilt parallax in detail view
    this.detailTiltX = 0;
    this.targetDetailTiltX = 0;

    // Impulse physics for natural sway
    this.impulseTime = 0;
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

      el.innerHTML = `
        <div class="product-sway">
          <div class="product-shadow"></div>
          <div class="flip-card">
            <div class="face side">
              <img class="img-side"
                   src="${col.sideRail || col.side}"
                   srcset="${col.sideRail ? `${col.sideRail} 340w, ${col.side} 900w` : `${col.side} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} side"
                   decoding="async"
                   draggable="false" />
            </div>
            <div class="face front">
              <img class="img-front"
                   src="${col.frontRail || col.front}"
                   srcset="${col.frontRail ? `${col.frontRail} 340w, ${col.front} 900w` : `${col.front} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} front"
                   decoding="async"
                   draggable="false" />
            </div>
            <div class="face back">
              <img class="img-back"
                   src="${col.backRail || col.back}"
                   srcset="${col.backRail ? `${col.backRail} 340w, ${col.back} 900w` : `${col.back} 900w`}"
                   sizes="(max-width: 500px) 340px, 900px"
                   alt="${p.name} back"
                   decoding="async"
                   draggable="false" />
            </div>
          </div>
        </div>
      `;

      this.stage.appendChild(el);

      const swayEl = el.querySelector('.product-sway');
      const flipCardEl = el.querySelector('.flip-card');
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
        imgSide,
        imgFront,
        imgBack
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
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    const N = this.products.length;

    const isMobile = W < 600;
    const isDesktop = W >= 1024;

    // Rail rod position anchored at upper-middle portion of hero viewport
    const railY = Math.round(H * (isMobile ? 0.22 : isDesktop ? 0.20 : 0.21));
    this.rail.style.top = `${railY}px`;

    const wrapperW = isDesktop ? 330 : 270;
    const wrapperH = isDesktop ? 440 : 360;

    if (this.mode === 'home') {
      const focusWidth = isMobile ? 190 : isDesktop ? 280 : 240;
      const otherWidth = isMobile ? 66 : isDesktop ? 88 : 78;

      this.baseSlotPositions = [];
      let curX = 0;
      for (let i = 0; i < N; i++) {
        const slot = i === this.focusIndex ? focusWidth : otherWidth;
        this.baseSlotPositions.push(curX + slot * 0.5);
        curX += slot;
      }

      // Center the focused garment in the viewport
      const centerTarget = W * 0.5;
      const focusedBaseX = this.baseSlotPositions[this.focusIndex];
      this.targetRailScrollX = centerTarget - focusedBaseX;

      for (let i = 0; i < N; i++) {
        const state = this.states[i];
        const isFocused = i === this.focusIndex;
        const els = this.productElements[i];

        state.targetX = this.baseSlotPositions[i] + this.targetRailScrollX;
        state.targetY = railY;
        state.targetScale = isFocused ? (isMobile ? 0.94 : isDesktop ? 1.02 : 0.98) : (isMobile ? 0.74 : 0.78);
        state.targetOpacity = 1.0;

        els.wrapper.classList.toggle('focused', isFocused);
        els.wrapper.classList.remove('detail-active', 'view-back');
      }
    } else {
      // Detail View: Centered garment with split composition on desktop, top-half on mobile
      const detailY = Math.round(H * (isMobile ? 0.15 : 0.18));
      const detailX = isMobile ? (W * 0.5) : (W * 0.38);

      for (let i = 0; i < N; i++) {
        const state = this.states[i];
        const offset = ((i - this.selectedIndex + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
        const els = this.productElements[i];

        if (offset === 0) {
          state.targetX = detailX;
          state.targetY = detailY;
          state.targetScale = isMobile ? 0.96 : (isDesktop ? 1.35 : 1.25);
          state.targetOpacity = 1.0;

          els.wrapper.classList.add('detail-active', 'focused');
          els.wrapper.classList.toggle('view-back', this.detailViewSide === 'back');
        } else {
          const ghostGap = isMobile ? 120 : 180;
          state.targetX = detailX + offset * ghostGap;
          state.targetY = detailY + 24;
          state.targetScale = 0.5;
          state.targetOpacity = Math.abs(offset) === 1 ? 0.18 : 0.0;

          els.wrapper.classList.remove('detail-active', 'focused', 'view-back');
        }
      }
    }
  }

  setFocus(idx) {
    if (idx < 0 || idx >= this.products.length || idx === this.focusIndex || this.mode !== 'home') return;
    this.focusIndex = idx;
    this.updateLayout();
  }

  openDetail(idx) {
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

  update(time, delta) {
    const springSpeed = 9.0 * delta;

    if (this.impulseTime > 0.001) {
      this.impulseTime *= Math.exp(-3.5 * delta);
    } else {
      this.impulseTime = 0;
    }

    // Smooth tilt interpolation in detail mode
    this.detailTiltX += (this.targetDetailTiltX - this.detailTiltX) * (12.0 * delta);

    const N = this.products.length;
    const W = this.container.clientWidth;
    const isDesktop = W >= 1024;
    const wrapperW = isDesktop ? 330 : 270;
    const wrapperH = isDesktop ? 440 : 360;

    for (let i = 0; i < N; i++) {
      const state = this.states[i];
      const p = this.products[i];
      const els = this.productElements[i];
      if (!state || !p || !els) continue;

      // Spring physics for position, scale, opacity
      state.x += (state.targetX - state.x) * springSpeed;
      state.y += (state.targetY - state.y) * springSpeed;
      state.scale += (state.targetScale - state.scale) * springSpeed;
      state.opacity += (state.targetOpacity - state.opacity) * springSpeed;

      // Realistic pendulum sway (±1.0 deg) around the hanger hook
      const isFocused = this.mode === 'home' && i === this.focusIndex;
      const isSelected = this.mode === 'detail' && i === this.selectedIndex;
      const swayAmp = (isFocused || isSelected) ? 0.35 : 0.95;
      const naturalSway = Math.sin(time * 1.6 + state.swayPhase) * swayAmp;
      const impulseSway = (isFocused || isSelected) ? Math.sin(time * 4.2) * this.impulseTime * 3.2 : 0;
      state.swayAngle = naturalSway + impulseSway;

      // Hook alignment: hook apex sits firmly on top of the rail rod
      // Because .product-wrapper has transform-origin: 50% 9%, the hook apex is anchored at wrapper top + wrapperH * 0.09
      const topY = state.y - (wrapperH * (p.hook?.y || 0.09));

      els.wrapper.style.transform = `translate3d(${Math.round(state.x - (wrapperW * 0.5))}px, ${Math.round(topY)}px, 0) scale(${state.scale.toFixed(3)})`;
      els.wrapper.style.opacity = Math.max(0, Math.min(1, state.opacity)).toFixed(2);
      els.wrapper.style.zIndex = isFocused || isSelected ? '25' : `${12 - Math.min(10, Math.abs(i - this.focusIndex))}`;

      // Apply sway rotation around hook
      els.sway.style.transform = `rotate(${state.swayAngle.toFixed(2)}deg)`;

      // Apply interactive tilt in detail view
      if (isSelected && this.mode === 'detail') {
        const baseRot = this.detailViewSide === 'back' ? 180 : 0;
        els.flipCard.style.transform = `perspective(900px) rotateY(${(baseRot + this.detailTiltX).toFixed(2)}deg)`;
      }
    }
  }
}
