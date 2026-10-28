/**
 * BEYOND UI Manager:
 * Synchronizes hero campaign overlays, product titles, prices, 3D detail view,
 * shop collection grid, search drawer, wishlist drawer, shopping cart, and bottom nav.
 */

export class UIManager {
  constructor(appEl, onAction) {
    this.app = appEl;
    this.onAction = onAction;

    // Hero Campaign Elements
    this.capEl = document.getElementById('cap');
    this.capSpecEl = document.getElementById('capSpec');
    this.heroPriceEl = document.getElementById('heroPrice');
    this.heroPriceSubEl = document.getElementById('heroPriceSub');
    this.editionTagEl = document.getElementById('editionTag');
    this.heroCounterEl = document.getElementById('heroCounter');
    this.availBtn = document.getElementById('avail');

    // Detail UI Elements
    this.detailUiEl = document.getElementById('detailUi');
    this.dnameEl = document.getElementById('dname');
    this.dpriceEl = document.getElementById('dprice');
    this.dtaglineEl = document.getElementById('dtagline');
    this.ddescEl = document.getElementById('ddesc');
    this.dcategoryEl = document.getElementById('dcategory');
    this.cnameEl = document.getElementById('cname');
    this.btnPriceInline = document.getElementById('btnPriceInline');
    this.segEl = document.getElementById('seg');
    this.segButtons = document.querySelectorAll('#seg button');
    this.closeBtn = document.getElementById('close');
    this.prevBtn = document.getElementById('prev');
    this.nextBtn = document.getElementById('next');
    this.tagsContainer = document.getElementById('tagsContainer');
    this.sizeButtons = document.querySelectorAll('.size-btn');
    this.detailAddToCartBtn = document.getElementById('detailAddToCart');
    this.detailWishlistBtn = document.getElementById('detailWishlist');

    // Shop Grid & Filters
    this.shopSection = document.getElementById('shopSection');
    this.productGrid = document.getElementById('productGrid');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.sortSelect = document.getElementById('sortSelect');

    // Top Navigation & Badges
    this.menuBtn = document.getElementById('menuBtn');
    this.searchBtn = document.getElementById('searchBtn');
    this.savedBtn = document.getElementById('savedBtn');
    this.cartBtn = document.getElementById('cartBtn');
    this.savedBadge = document.getElementById('savedBadge');
    this.cartBadge = document.getElementById('cartBadge');

    // Bottom Navigation
    this.bottomNav = document.getElementById('bottomNav');
    this.bNavItems = document.querySelectorAll('.b-nav-item');
    this.bNavSavedBadge = document.getElementById('bNavSavedBadge');
    this.bNavCartBadge = document.getElementById('bNavCartBadge');

    // Drawers
    this.searchDrawer = document.getElementById('searchDrawer');
    this.savedDrawer = document.getElementById('savedDrawer');
    this.cartDrawer = document.getElementById('cartDrawer');
    this.menuDrawer = document.getElementById('menuDrawer');
    this.toastEl = document.getElementById('toast');

    // Drawer Internals
    this.searchInput = document.getElementById('searchInput');
    this.searchResults = document.getElementById('searchResults');
    this.clearSearchBtn = document.getElementById('clearSearch');
    this.savedItemsList = document.getElementById('savedItemsList');
    this.savedCountHeader = document.getElementById('savedCountHeader');
    this.cartItemsList = document.getElementById('cartItemsList');
    this.cartCountHeader = document.getElementById('cartCountHeader');
    this.cartSubtotal = document.getElementById('cartSubtotal');
    this.btnCheckout = document.getElementById('btnCheckout');

    // Marquee & Loader
    this.marqueeTrack = document.getElementById('track');
    this.loaderEl = document.getElementById('loader');
    this.loaderProgress = document.getElementById('loaderProgress');
    this.loaderStatus = document.getElementById('loaderStatus');

    // Internal State
    this.products = [];
    this.currentSelectedSize = 'M';
    this.currentFilter = 'all';
    this.currentSort = 'featured';
    this.cart = this.loadState('beyond_cart') || [];
    this.saved = this.loadState('beyond_saved') || [];

    this.initMarquee();
    this.initEvents();
    this.updateBadges();
  }

  loadState(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveState(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  setProducts(products) {
    this.products = products;
    this.renderShopGrid();
  }

  initMarquee() {
    const items = [
      'BEYOND',
      'DARK ARCHIVE RUN 01',
      'DISTRESSED CALFSKIN',
      'JAPANESE SELVEDGE',
      '520GSM FRENCH TERRY',
      'WORLDWIDE EXPRESS',
      'BERLIN — TOKYO — NYC'
    ];
    const row = items.map(p => `<span>${p}<b>✦</b></span>`).join('');
    if (this.marqueeTrack) {
      this.marqueeTrack.innerHTML = row + row + row + row;
    }
  }

  setLoaderProgress(progress, statusText) {
    if (this.loaderProgress) {
      this.loaderProgress.style.width = `${Math.round(progress * 100)}%`;
    }
    if (this.loaderStatus && statusText) {
      this.loaderStatus.textContent = statusText;
    }
    if (progress >= 1.0) {
      setTimeout(() => {
        if (this.loaderEl) {
          this.loaderEl.classList.add('hide');
          setTimeout(() => this.loaderEl.remove(), 600);
        }
      }, 350);
    }
  }

  updateCap(focusIndex) {
    const product = this.products[focusIndex];
    if (!product) return;

    if (this.capEl) {
      this.capEl.textContent = product.name;
    }
    if (this.capSpecEl) {
      this.capSpecEl.textContent = (product.tagline || product.name).toUpperCase();
    }
    if (this.heroPriceEl) {
      this.heroPriceEl.textContent = product.price;
    }
    if (this.heroPriceSubEl) {
      this.heroPriceSubEl.style.display = 'none';
    }
    if (this.editionTagEl) {
      this.editionTagEl.textContent = `COLLECTION ${product.edition || `0${focusIndex + 1} / 09`} · DARK ARCHIVE`;
    }
    if (this.heroCounterEl) {
      const idxStr = String(focusIndex + 1).padStart(2, '0');
      const totalStr = String(this.products.length).padStart(2, '0');
      this.heroCounterEl.textContent = `${idxStr} / ${totalStr}`;
    }
  }

  showHome(focusIndex) {
    this.updateCap(focusIndex);
    if (this.tagsContainer) {
      this.tagsContainer.innerHTML = '';
    }
    this.setActiveNav('home');
  }

  showDetail(selectedIndex) {
    const product = this.products[selectedIndex];
    if (!product) return;

    if (this.dnameEl) this.dnameEl.textContent = product.name;
    if (this.dpriceEl) this.dpriceEl.textContent = product.price;
    if (this.dtaglineEl) this.dtaglineEl.textContent = product.tagline || '';
    if (this.ddescEl && product.description) this.ddescEl.textContent = product.description;
    if (this.dcategoryEl) this.dcategoryEl.textContent = (product.category || 'ARCHIVAL PIECE').toUpperCase();
    if (this.btnPriceInline) this.btnPriceInline.textContent = product.price;

    // Check wishlist state
    if (this.detailWishlistBtn) {
      const isSaved = this.saved.some(s => s.slug === product.slug);
      this.detailWishlistBtn.classList.toggle('saved', isSaved);
    }

    this.resetSegmentedView();
    this.renderColorTags(selectedIndex);
  }

  resetSegmentedView() {
    if (this.segEl) this.segEl.dataset.view = 'front';
    this.segButtons.forEach(btn => {
      btn.classList.toggle('on', btn.dataset.v === 'front');
    });
  }

  renderColorTags(garmentIndex) {
    if (!this.tagsContainer) return;
    this.tagsContainer.innerHTML = '';

    const product = this.products[garmentIndex];
    if (!product || !product.colors) return;
    const currentColorIdx = this.onAction('getCurrentColor', garmentIndex) || 0;

    if (this.cnameEl && product.colors[currentColorIdx]) {
      this.cnameEl.textContent = product.colors[currentColorIdx].name;
    }

    product.colors.forEach((col, idx) => {
      const tag = document.createElement('button');
      tag.className = `tag ${idx === currentColorIdx ? 'on' : ''}`;
      tag.setAttribute('aria-label', col.name);
      tag.style.setProperty('--tagBg', col.hex);
      tag.style.animationDelay = `${-idx * 1.2}s`;
      tag.innerHTML = '<span></span>';

      tag.addEventListener('pointerdown', (e) => e.stopPropagation());
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectColor(garmentIndex, idx);
      });

      this.tagsContainer.appendChild(tag);
    });
  }

  selectColor(garmentIndex, colorIndex) {
    const product = this.products[garmentIndex];
    if (product && product.colors && product.colors[colorIndex]) {
      if (this.cnameEl) {
        this.cnameEl.textContent = product.colors[colorIndex].name;
      }
    }

    const tags = this.tagsContainer.querySelectorAll('.tag');
    tags.forEach((t, i) => t.classList.toggle('on', i === colorIndex));

    this.onAction('colorChange', { garmentIndex, colorIndex });
  }

  /* ───────── Shop Collection Grid ───────── */
  renderShopGrid() {
    if (!this.productGrid) return;
    this.productGrid.innerHTML = '';

    let list = [...this.products];

    // Filter
    if (this.currentFilter !== 'all') {
      list = list.filter(p => (p.category || '').toLowerCase() === this.currentFilter.toLowerCase());
    }

    // Sort
    if (this.currentSort === 'price-desc') {
      list.sort((a, b) => this.parsePrice(b.price) - this.parsePrice(a.price));
    } else if (this.currentSort === 'price-asc') {
      list.sort((a, b) => this.parsePrice(a.price) - this.parsePrice(b.price));
    }

    list.forEach((p, index) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const firstCol = p.colors ? p.colors[0] : null;
      const imgSrc = firstCol ? (firstCol.frontRail || firstCol.front) : '/hero_moto_jacket.webp';
      const isSaved = this.saved.some(s => s.slug === p.slug);

      card.innerHTML = `
        <span class="card-badge">${p.badge || 'RUN 01'}</span>
        <button class="card-wishlist ${isSaved ? 'saved' : ''}" data-slug="${p.slug}" aria-label="Save to Wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <div class="card-image-wrap">
          <img class="card-img" src="${imgSrc}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="card-info">
          <span class="card-cat">${(p.category || 'OUTERWEAR').toUpperCase()}</span>
          <h3 class="card-title">${p.name}</h3>
          <p class="card-tagline">${p.tagline || ''}</p>
        </div>
        <div class="card-bottom">
          <span class="card-price">${p.price}</span>
          <div class="card-actions">
            <button class="btn-card-inspect" data-slug="${p.slug}">VIEW PIECE</button>
            <button class="btn-card-add" data-slug="${p.slug}">+ BAG</button>
          </div>
        </div>
      `;

      // Card event listeners
      const inspectBtn = card.querySelector('.btn-card-inspect');
      const addBtn = card.querySelector('.btn-card-add');
      const wishBtn = card.querySelector('.card-wishlist');

      inspectBtn.addEventListener('click', () => {
        const pIdx = this.products.findIndex(pr => pr.slug === p.slug);
        if (pIdx !== -1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.onAction('openDetailByIndex', pIdx);
        }
      });

      addBtn.addEventListener('click', () => {
        this.addToCart(p, 'M');
      });

      wishBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleWishlist(p);
        wishBtn.classList.toggle('saved', this.saved.some(s => s.slug === p.slug));
      });

      this.productGrid.appendChild(card);
    });
  }

  parsePrice(str) {
    if (!str) return 0;
    const num = str.replace(/[^0-9]/g, '');
    return parseInt(num, 10) || 0;
  }

  /* ───────── Wishlist System ───────── */
  toggleWishlist(product) {
    const idx = this.saved.findIndex(s => s.slug === product.slug);
    if (idx !== -1) {
      this.saved.splice(idx, 1);
      this.showToast(`REMOVED ${product.name} FROM SAVED`);
    } else {
      this.saved.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        tagline: product.tagline,
        img: product.colors?.[0]?.frontRail || product.colors?.[0]?.front || '/hero_moto_jacket.webp'
      });
      this.showToast(`SAVED ${product.name} TO ARCHIVE`);
    }
    this.saveState('beyond_saved', this.saved);
    this.updateBadges();
    this.renderSavedList();
  }

  renderSavedList() {
    if (!this.savedItemsList) return;
    if (this.savedCountHeader) this.savedCountHeader.textContent = this.saved.length;

    if (this.saved.length === 0) {
      this.savedItemsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;opacity:0.5;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <p>NO ARCHIVED PIECES SAVED YET</p>
        </div>
      `;
      return;
    }

    this.savedItemsList.innerHTML = '';
    this.saved.forEach(item => {
      const row = document.createElement('div');
      row.className = 'drawer-item';
      row.innerHTML = `
        <img class="drawer-thumb" src="${item.img}" alt="${item.name}" />
        <div class="drawer-item-details">
          <h4 class="drawer-item-title">${item.name}</h4>
          <span class="drawer-item-price">${item.price}</span>
          <button class="btn-card-add move-to-bag-btn" style="align-self:flex-start;margin-top:4px;">MOVE TO BAG</button>
        </div>
        <button class="drawer-remove-btn" aria-label="Remove item">✕</button>
      `;

      row.querySelector('.move-to-bag-btn').addEventListener('click', () => {
        const fullProd = this.products.find(p => p.slug === item.slug) || item;
        this.addToCart(fullProd, 'M');
        this.toggleWishlist(item);
      });

      row.querySelector('.drawer-remove-btn').addEventListener('click', () => {
        this.toggleWishlist(item);
      });

      this.savedItemsList.appendChild(row);
    });
  }

  /* ───────── Shopping Cart System ───────── */
  addToCart(product, size = 'M') {
    const existing = this.cart.find(c => c.slug === product.slug && c.size === size);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        size: size,
        qty: 1,
        img: product.colors?.[0]?.frontRail || product.colors?.[0]?.front || '/hero_moto_jacket.webp'
      });
    }

    this.saveState('beyond_cart', this.cart);
    this.updateBadges();
    this.renderCartList();
    this.showToast(`ADDED ${product.name} [SIZE ${size}] TO BAG`);
    this.openDrawer('cart');
  }

  removeFromCart(slug, size) {
    this.cart = this.cart.filter(c => !(c.slug === slug && c.size === size));
    this.saveState('beyond_cart', this.cart);
    this.updateBadges();
    this.renderCartList();
  }

  updateCartQty(slug, size, delta) {
    const item = this.cart.find(c => c.slug === slug && c.size === size);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        this.removeFromCart(slug, size);
        return;
      }
    }
    this.saveState('beyond_cart', this.cart);
    this.updateBadges();
    this.renderCartList();
  }

  renderCartList() {
    if (!this.cartItemsList) return;
    const totalCount = this.cart.reduce((sum, item) => sum + item.qty, 0);
    if (this.cartCountHeader) this.cartCountHeader.textContent = totalCount;

    if (this.cart.length === 0) {
      this.cartItemsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;opacity:0.5;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>YOUR SHOPPING BAG IS CURRENTLY EMPTY</p>
        </div>
      `;
      if (this.cartSubtotal) this.cartSubtotal.textContent = '₹0';
      return;
    }

    let subtotalVal = 0;
    let currencySymbol = '₹';

    this.cartItemsList.innerHTML = '';
    this.cart.forEach(item => {
      const pVal = this.parsePrice(item.price);
      subtotalVal += pVal * item.qty;
      if (item.price.includes('$')) currencySymbol = '$';

      const row = document.createElement('div');
      row.className = 'drawer-item';
      row.innerHTML = `
        <img class="drawer-thumb" src="${item.img}" alt="${item.name}" />
        <div class="drawer-item-details">
          <h4 class="drawer-item-title">${item.name}</h4>
          <span class="drawer-item-spec">SIZE: ${item.size} · RUN 01</span>
          <span class="drawer-item-price">${item.price}</span>
          <div class="qty-control">
            <button class="qty-btn dec" aria-label="Decrease quantity">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="drawer-remove-btn" aria-label="Remove item">✕</button>
      `;

      row.querySelector('.qty-btn.dec').addEventListener('click', () => {
        this.updateCartQty(item.slug, item.size, -1);
      });

      row.querySelector('.qty-btn.inc').addEventListener('click', () => {
        this.updateCartQty(item.slug, item.size, 1);
      });

      row.querySelector('.drawer-remove-btn').addEventListener('click', () => {
        this.removeFromCart(item.slug, item.size);
      });

      this.cartItemsList.appendChild(row);
    });

    if (this.cartSubtotal) {
      this.cartSubtotal.textContent = `${currencySymbol}${subtotalVal.toLocaleString()}`;
    }
  }

  updateBadges() {
    const sCount = this.saved.length;
    const cCount = this.cart.reduce((sum, item) => sum + item.qty, 0);

    if (this.savedBadge) this.savedBadge.textContent = sCount;
    if (this.bNavSavedBadge) this.bNavSavedBadge.textContent = sCount;
    const menuSavedBadge = document.getElementById('menuSavedBadge');
    if (menuSavedBadge) menuSavedBadge.textContent = sCount;

    if (this.cartBadge) this.cartBadge.textContent = cCount;
    if (this.bNavCartBadge) this.bNavCartBadge.textContent = cCount;
    const menuBagBadge = document.getElementById('menuBagBadge');
    if (menuBagBadge) menuBagBadge.textContent = cCount;
  }

  /* ───────── Search System ───────── */
  handleSearch(query) {
    if (!this.searchResults) return;
    const q = (query || '').trim().toLowerCase();

    if (this.clearSearchBtn) {
      this.clearSearchBtn.style.display = q.length > 0 ? 'block' : 'none';
    }

    if (!q) {
      this.searchResults.innerHTML = '<div class="empty-state"><p>TYPE TO SEARCH ARCHIVE PIECES...</p></div>';
      return;
    }

    const matches = this.products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.tagline || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      this.searchResults.innerHTML = `<div class="empty-state"><p>NO PIECES FOUND MATCHING "${query}"</p></div>`;
      return;
    }

    this.searchResults.innerHTML = '';
    matches.forEach(p => {
      const el = document.createElement('div');
      el.className = 'search-item';
      const imgSrc = p.colors?.[0]?.frontRail || p.colors?.[0]?.front || '/hero_moto_jacket.webp';

      el.innerHTML = `
        <img class="search-thumb" src="${imgSrc}" alt="${p.name}" />
        <div class="search-info">
          <span class="search-cat">${(p.category || 'OUTERWEAR').toUpperCase()}</span>
          <span class="search-name">${p.name}</span>
          <span class="search-price">${p.price}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        this.closeAllDrawers();
        const pIdx = this.products.findIndex(pr => pr.slug === p.slug);
        if (pIdx !== -1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.onAction('openDetailByIndex', pIdx);
        }
      });

      this.searchResults.appendChild(el);
    });
  }

  /* ───────── Drawers Management ───────── */
  openDrawer(name) {
    this.closeAllDrawers();
    let drawer = null;
    if (name === 'search') drawer = this.searchDrawer;
    else if (name === 'saved') { drawer = this.savedDrawer; this.renderSavedList(); }
    else if (name === 'cart') { drawer = this.cartDrawer; this.renderCartList(); }
    else if (name === 'menu') drawer = this.menuDrawer;

    if (drawer) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      if (name === 'search' && this.searchInput) {
        setTimeout(() => this.searchInput.focus(), 150);
      }
    }
  }

  closeAllDrawers() {
    [this.searchDrawer, this.savedDrawer, this.cartDrawer, this.menuDrawer].forEach(d => {
      if (d) {
        d.classList.remove('open');
        d.setAttribute('aria-hidden', 'true');
      }
    });
  }

  setActiveNav(name) {
    this.bNavItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === name);
    });
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2800);
  }

  initEvents() {
    // Hero View Piece Button
    if (this.availBtn) {
      this.availBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onAction('openCurrentFocus');
      });
    }

    // Detail Close Button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAction('closeDetail');
      });
    }

    // Detail Prev / Next
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAction('navigate', -1);
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAction('navigate', 1);
      });
    }

    // Segmented Front / Back Flip
    this.segButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const side = btn.dataset.v;
        if (this.segEl) this.segEl.dataset.view = side;
        this.segButtons.forEach(b => b.classList.toggle('on', b === btn));
        this.onAction('flipView', side);
      });
    });

    // Size Selector
    this.sizeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sizeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSelectedSize = btn.dataset.size;
      });
    });

    // Detail Add to Cart & Wishlist
    if (this.detailAddToCartBtn) {
      this.detailAddToCartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedProd = this.onAction('getCurrentSelectedProduct');
        if (selectedProd) {
          this.addToCart(selectedProd, this.currentSelectedSize);
        }
      });
    }

    if (this.detailWishlistBtn) {
      this.detailWishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedProd = this.onAction('getCurrentSelectedProduct');
        if (selectedProd) {
          this.toggleWishlist(selectedProd);
          const isSaved = this.saved.some(s => s.slug === selectedProd.slug);
          this.detailWishlistBtn.classList.toggle('saved', isSaved);
        }
      });
    }

    // Top Navigation Triggers
    if (this.menuBtn) {
      this.menuBtn.addEventListener('click', () => this.openDrawer('menu'));
    }
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.openDrawer('search'));
    }
    if (this.savedBtn) {
      this.savedBtn.addEventListener('click', () => this.openDrawer('saved'));
    }
    if (this.cartBtn) {
      this.cartBtn.addEventListener('click', () => this.openDrawer('cart'));
    }

    const menuSavedBtn = document.getElementById('menuSavedBtn');
    if (menuSavedBtn) {
      menuSavedBtn.addEventListener('click', () => {
        this.closeAllDrawers();
        this.openDrawer('saved');
      });
    }

    const menuBagBtn = document.getElementById('menuBagBtn');
    if (menuBagBtn) {
      menuBagBtn.addEventListener('click', () => {
        this.closeAllDrawers();
        this.openDrawer('cart');
      });
    }

    // Drawer Closers
    ['search', 'saved', 'cart', 'menu'].forEach(d => {
      const closeBtn = document.getElementById(`${d}Close`);
      const backdrop = document.getElementById(`${d}Backdrop`);
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeAllDrawers());
      if (backdrop) backdrop.addEventListener('click', () => this.closeAllDrawers());
    });

    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
    if (this.clearSearchBtn) {
      this.clearSearchBtn.addEventListener('click', () => {
        if (this.searchInput) this.searchInput.value = '';
        this.handleSearch('');
      });
    }

    // Checkout CTA
    if (this.btnCheckout) {
      this.btnCheckout.addEventListener('click', () => {
        if (this.cart.length === 0) {
          this.showToast('BAG IS EMPTY');
          return;
        }
        this.showToast('PROCEEDING TO SECURE CHECKOUT...');
      });
    }

    // Bottom Navigation
    this.bNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        this.setActiveNav(target);

        if (target === 'home') {
          this.closeAllDrawers();
          this.onAction('closeDetail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (target === 'shop') {
          this.closeAllDrawers();
          this.onAction('closeDetail');
          if (this.shopSection) {
            this.shopSection.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (target === 'search') {
          this.openDrawer('search');
        } else if (target === 'saved') {
          this.openDrawer('saved');
        } else if (target === 'cart') {
          this.openDrawer('cart');
        }
      });
    });

    // Shop Filters
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderShopGrid();
      });
    });

    // Shop Sort
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderShopGrid();
      });
    }

    // Menu Drawer Navigation Links
    document.querySelectorAll('.menu-link[data-dest]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeAllDrawers();
        const dest = link.dataset.dest;
        if (dest === 'home') {
          this.onAction('closeDetail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (dest === 'shop' || dest === 'outerwear' || dest === 'tops' || dest === 'denim') {
          this.onAction('closeDetail');
          if (dest !== 'shop') {
            this.currentFilter = dest;
            this.filterButtons.forEach(b => b.classList.toggle('active', b.dataset.filter === dest));
            this.renderShopGrid();
          }
          if (this.shopSection) {
            this.shopSection.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (dest === 'about') {
          this.showToast('BEYOND STUDIOS — ARCHITECTURAL DARK STREETWEAR');
        }
      });
    });
  }
}
