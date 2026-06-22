const PROVISIONED_ITEMS_URL = '/provisioned/items.json';
const PROVISIONED_PAGE_URL = '/provisioned';
const CAROUSEL_SPIN_SPEED = 18;
const CAROUSEL_DRAG_SENSITIVITY = 0.62;
const CAROUSEL_TOUCH_DRAG_SENSITIVITY = 1;
const CAROUSEL_TAP_THRESHOLD_PX = 10;
const CAROUSEL_DRAG_THRESHOLD_PX = 6;
const CAROUSEL_MOMENTUM_FRICTION = 0.94;
const CAROUSEL_MOMENTUM_MULTIPLIER = 1.45;
const CAROUSEL_MOMENTUM_MIN_VELOCITY = 0.018;
const FLASHCARD_TRANSITION_MS = 240;
const FILTER_TRANSITION_MS = 280;
const FILTER_SCROLL_FADE_MS = 680;
const FILTER_SCROLL_ANIMATION_MS = 780;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeProvisionedId(id) {
  if (!id || typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) {
    return null;
  }

  return id;
}

function resolveProvisionedAssetUrl(path) {
  if (!path) {
    return '';
  }

  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
}

function sanitizeImagePath(path) {
  if (typeof path !== 'string' || !path.startsWith('assets/provisioned/')) {
    return null;
  }

  if (path.includes('..')) {
    return null;
  }

  return path;
}

function sanitizeExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchProvisionedItems() {
  const response = await fetch(PROVISIONED_ITEMS_URL);
  if (!response.ok) {
    throw new Error('Could not load provisioned items.');
  }

  return response.json();
}

function sanitizeCategoryId(id) {
  if (!id || typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) {
    return null;
  }

  return id;
}

function normalizeProvisionedCategories(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  return categories
    .map((category) => {
      const id = sanitizeCategoryId(category?.id);
      if (!id) {
        return null;
      }

      return {
        id,
        title: typeof category.title === 'string' && category.title.trim()
          ? category.title.trim()
          : id,
      };
    })
    .filter(Boolean);
}

function normalizeProvisionedItems(data, categories) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const validCategoryIds = new Set(categories.map((category) => category.id));

  return items
    .map((item, index) => {
      const id = sanitizeProvisionedId(item?.id);
      const image = sanitizeImagePath(item?.image);

      if (!id || !image) {
        return null;
      }

      const category = sanitizeCategoryId(item?.category);
      const resolvedCategory = category && validCategoryIds.has(category) ? category : categories[0]?.id || '';

      return {
        id,
        title: typeof item.title === 'string' ? item.title.trim() : '',
        description: typeof item.description === 'string' ? item.description.trim() : '',
        info: typeof item.info === 'string' ? item.info.trim() : '',
        image,
        link: sanitizeExternalUrl(item?.link),
        category: resolvedCategory,
        sortIndex: index,
      };
    })
    .filter(Boolean);
}

function sortItemsByCategory(items, categories) {
  const rank = new Map(categories.map((category, index) => [category.id, index]));

  return [...items].sort((a, b) => {
    const categoryRankA = rank.get(a.category) ?? Number.MAX_SAFE_INTEGER;
    const categoryRankB = rank.get(b.category) ?? Number.MAX_SAFE_INTEGER;

    if (categoryRankA !== categoryRankB) {
      return categoryRankA - categoryRankB;
    }

    return a.sortIndex - b.sortIndex;
  });
}

function groupItemsByCategory(items, categories) {
  const groups = categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  }));

  const groupedIds = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
  const ungrouped = items.filter((item) => !groupedIds.has(item.id));

  if (ungrouped.length > 0) {
    groups.push({
      id: 'uncategorized',
      title: 'Patrimony',
      items: ungrouped,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

function renderProvisionedEmpty(container) {
  container.innerHTML = `
    <p class="provisioned-empty">No items yet. Add wishlist images to get started.</p>
  `;
}

function renderProvisionedCarousel(container, items) {
  if (items.length === 0) {
    renderProvisionedEmpty(container);
    return;
  }

  const cardsMarkup = items
    .map((item, index) => {
      const title = item.title ? escapeHtml(item.title) : '';
      const alt = title || `Provisioned item ${index + 1}`;

      return `
        <div class="coverflow-card" data-index="${index}" aria-hidden="true">
          <div class="coverflow-card-inner">
            <div class="coverflow-card-image">
              <img src="${escapeHtml(resolveProvisionedAssetUrl(item.image))}" alt="${alt}" loading="lazy" decoding="async">
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const showControls = items.length > 1;

  container.innerHTML = `
    <div class="coverflow" data-coverflow tabindex="0" aria-roledescription="carousel" aria-label="Provisioned wishlist">
      <button type="button" class="carousel-btn coverflow-btn coverflow-btn-prev" aria-label="Rotate carousel counter-clockwise" ${showControls ? '' : 'hidden'}>&lsaquo;</button>
      <div class="coverflow-viewport" data-carousel-viewport tabindex="0" aria-label="Open Provisioned wishlist">
        <div class="coverflow-stage">
          <div class="coverflow-ring" data-carousel-ring>
            ${cardsMarkup}
          </div>
        </div>
      </div>
      <button type="button" class="carousel-btn coverflow-btn coverflow-btn-next" aria-label="Rotate carousel clockwise" ${showControls ? '' : 'hidden'}>&rsaquo;</button>
    </div>
  `;

  initCarousel3D(container.querySelector('[data-coverflow]'), items);
}

function renderProvisionedGridItem(item) {
  const title = item.title ? `<span class="provisioned-item-title">${escapeHtml(item.title)}</span>` : '';
  const alt = item.title || 'Provisioned item';

  const imageMarkup = `
    <button type="button" class="provisioned-grid-image-btn" data-provisioned-id="${escapeHtml(item.id)}" aria-label="View details for ${escapeHtml(alt)}">
      <div class="provisioned-grid-image">
        <img src="${escapeHtml(resolveProvisionedAssetUrl(item.image))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
      </div>
    </button>
  `;

  if (item.link) {
    return `
      <a href="${escapeHtml(item.link)}" class="provisioned-grid-item provisioned-grid-item-link" target="_blank" rel="noopener noreferrer">
        ${imageMarkup}
        ${title}
      </a>
    `;
  }

  return `
    <article class="provisioned-grid-item">
      ${imageMarkup}
      ${title}
    </article>
  `;
}

function renderProvisionedFilters(categories) {
  const buttons = [
    '<button type="button" class="provisioned-filter is-active" data-filter="all" role="tab" aria-selected="true">All</button>',
    ...categories.map((category) => `
      <button
        type="button"
        class="provisioned-filter"
        data-filter="${escapeHtml(category.id)}"
        role="tab"
        aria-selected="false"
      >${escapeHtml(category.title)}</button>
    `),
  ].join('');

  return `
    <div class="provisioned-filters" data-provisioned-filters role="tablist" aria-label="Filter by category">
      ${buttons}
    </div>
  `;
}

function easeOutQuart(progress) {
  return 1 - (1 - progress) ** 4;
}

function initProvisionedCategoryFilter(container, categories) {
  const filterRoot = container.querySelector('[data-provisioned-filters]');
  const catalog = container.querySelector('[data-provisioned-catalog]');
  const sections = Array.from(container.querySelectorAll('[data-category-id]'));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!filterRoot || !catalog) {
    return;
  }

  let currentFilter = 'all';
  let filterTimer = null;
  let scrollAnimationFrame = null;

  const cancelScrollAnimation = () => {
    if (scrollAnimationFrame !== null) {
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = null;
    }
  };

  const lockPageHeight = () => {
    const lockedHeight = document.documentElement.scrollHeight;
    document.documentElement.classList.add('is-filter-scroll-locked');
    document.documentElement.style.setProperty('--filter-locked-height', `${lockedHeight}px`);
  };

  const unlockPageHeight = () => {
    document.documentElement.classList.remove('is-filter-scroll-locked');
    document.documentElement.style.removeProperty('--filter-locked-height');
  };

  const animateScrollTo = (targetY, duration, onComplete) => {
    cancelScrollAnimation();

    const startY = window.scrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) {
      onComplete();
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, startY + distance * easeOutQuart(progress));

      if (progress < 1) {
        scrollAnimationFrame = requestAnimationFrame(step);
      } else {
        scrollAnimationFrame = null;
        onComplete();
      }
    };

    scrollAnimationFrame = requestAnimationFrame(step);
  };

  const sectionHeights = new Map(
    sections.map((section) => [section.getAttribute('data-category-id'), section.offsetHeight])
  );

  const estimateMaxScroll = (activeFilter) => {
    const pageTailOffset = 120;
    let catalogHeight = 0;

    if (activeFilter === 'all') {
      catalogHeight = sections.reduce((total, section, index) => {
        const height = sectionHeights.get(section.getAttribute('data-category-id')) || 0;
        return total + height + (index > 0 ? 56 : 0);
      }, 0);
    } else {
      catalogHeight = sectionHeights.get(activeFilter) || 0;
    }

    const docHeight = filterRoot.offsetHeight + 36 + catalogHeight + pageTailOffset;
    return Math.max(0, docHeight - window.innerHeight);
  };

  const willNeedScrollAdjust = (activeFilter, scrollY) => scrollY > estimateMaxScroll(activeFilter) + 2;

  const updateFilterButtons = (activeFilter) => {
    filterRoot.querySelectorAll('.provisioned-filter').forEach((button) => {
      const isActive = button.getAttribute('data-filter') === activeFilter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  };

  const syncFilterUrl = (activeFilter) => {
    const url = new URL(window.location.href);
    if (activeFilter === 'all') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', activeFilter);
    }
    window.history.replaceState({}, '', url);
  };

  const applyFilterState = (activeFilter) => {
    sections.forEach((section) => {
      const show = activeFilter === 'all' || section.getAttribute('data-category-id') === activeFilter;
      section.hidden = !show;
      section.classList.toggle('provisioned-category--solo', activeFilter !== 'all' && show);
    });

    catalog.classList.toggle('provisioned-catalog--filtered', activeFilter !== 'all');
    currentFilter = activeFilter;
  };

  const runScrollAfterFilter = (previousScrollY, onComplete, { slow = false, activeFilter = null } = {}) => {
    requestAnimationFrame(() => {
      const maxScroll = slow && activeFilter
        ? estimateMaxScroll(activeFilter)
        : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const targetScroll = Math.min(previousScrollY, maxScroll);

      if (Math.abs(window.scrollY - targetScroll) < 2) {
        onComplete();
        return;
      }

      if (!slow || prefersReducedMotion) {
        window.scrollTo(0, targetScroll);
        onComplete();
        return;
      }

      animateScrollTo(targetScroll, FILTER_SCROLL_ANIMATION_MS, onComplete);
    });
  };

  const revealCatalog = ({ slow = false } = {}) => {
    requestAnimationFrame(() => {
      catalog.classList.remove('is-filter-fading');

      if (slow) {
        window.setTimeout(() => {
          catalog.classList.remove('is-filter-scroll-adjust');
        }, FILTER_SCROLL_FADE_MS + 40);
      } else {
        catalog.classList.remove('is-filter-scroll-adjust');
      }
    });
  };

  const setActiveFilter = (filterId, { updateUrl = true } = {}) => {
    const isValid = filterId === 'all' || categories.some((category) => category.id === filterId);
    const activeFilter = isValid ? filterId : 'all';

    if (activeFilter === currentFilter || catalog.classList.contains('is-filter-fading')) {
      return;
    }

    cancelScrollAnimation();
    updateFilterButtons(activeFilter);

    const previousScrollY = window.scrollY;
    const slowScrollFade = willNeedScrollAdjust(activeFilter, previousScrollY);
    const fadeOutMs = slowScrollFade ? FILTER_SCROLL_FADE_MS : FILTER_TRANSITION_MS;

    const finish = () => {
      const needsScrollAdjust = willNeedScrollAdjust(activeFilter, previousScrollY);

      if (needsScrollAdjust) {
        catalog.classList.add('is-filter-scroll-adjust');
        lockPageHeight();
      }

      applyFilterState(activeFilter);

      if (needsScrollAdjust) {
        window.scrollTo(0, previousScrollY);
      }

      if (updateUrl) {
        syncFilterUrl(activeFilter);
      }

      runScrollAfterFilter(previousScrollY, () => {
        if (needsScrollAdjust) {
          unlockPageHeight();
        }
        revealCatalog({ slow: needsScrollAdjust });
      }, { slow: needsScrollAdjust, activeFilter });
    };

    if (prefersReducedMotion) {
      finish();
      return;
    }

    if (slowScrollFade) {
      catalog.classList.add('is-filter-scroll-adjust');
    }

    catalog.classList.add('is-filter-fading');
    clearTimeout(filterTimer);
    filterTimer = window.setTimeout(finish, fadeOutMs);
  };

  filterRoot.addEventListener('click', (event) => {
    const button = event.target.closest('.provisioned-filter');
    if (!button) {
      return;
    }

    setActiveFilter(button.getAttribute('data-filter') || 'all');
  });

  const initialFilter = new URLSearchParams(window.location.search).get('category') || 'all';
  const isValidInitial = initialFilter === 'all' || categories.some((category) => category.id === initialFilter);
  const resolvedInitial = isValidInitial ? initialFilter : 'all';

  applyFilterState(resolvedInitial);
  updateFilterButtons(resolvedInitial);

  requestAnimationFrame(() => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(window.scrollY, maxScroll));
  });
}

function renderProvisionedGrid(container, items, categories) {
  if (items.length === 0) {
    renderProvisionedEmpty(container);
    return;
  }

  const groups = groupItemsByCategory(items, categories);
  const catalogMarkup = groups
    .map((group) => {
      const gridMarkup = group.items.map((item) => renderProvisionedGridItem(item)).join('');

      return `
        <section class="provisioned-category" data-category-id="${escapeHtml(group.id)}" aria-labelledby="provisioned-category-${escapeHtml(group.id)}">
          <h2 class="provisioned-category-title" id="provisioned-category-${escapeHtml(group.id)}">${escapeHtml(group.title)}</h2>
          <div class="provisioned-grid">${gridMarkup}</div>
        </section>
      `;
    })
    .join('');

  container.innerHTML = `
    ${renderProvisionedFilters(categories)}
    <div class="provisioned-catalog" data-provisioned-catalog>${catalogMarkup}</div>
  `;
  initProvisionedFlashcards(container, items);
  initProvisionedCategoryFilter(container, categories);
}

let provisionedFlashcardRoot = null;

function ensureProvisionedFlashcardRoot() {
  if (provisionedFlashcardRoot) {
    return provisionedFlashcardRoot;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'provisioned-flashcard-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="provisioned-flashcard" role="dialog" aria-modal="true" aria-labelledby="provisioned-flashcard-title" tabindex="-1">
      <button type="button" class="provisioned-flashcard-close" aria-label="Close">&times;</button>
      <h2 class="provisioned-flashcard-title" id="provisioned-flashcard-title"></h2>
      <p class="provisioned-flashcard-body"></p>
    </div>
  `;

  document.body.append(backdrop);
  provisionedFlashcardRoot = backdrop;
  return backdrop;
}

function closeProvisionedFlashcard() {
  if (!provisionedFlashcardRoot || provisionedFlashcardRoot.hidden) {
    return;
  }

  if (provisionedFlashcardRoot.classList.contains('is-closing')) {
    return;
  }

  const backdrop = provisionedFlashcardRoot;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finishClose = () => {
    backdrop.classList.remove('is-open', 'is-closing');
    backdrop.hidden = true;
    document.body.classList.remove('provisioned-flashcard-open');
    backdrop.querySelector('.provisioned-flashcard-close')?.blur();
  };

  if (prefersReducedMotion) {
    finishClose();
    return;
  }

  backdrop.classList.remove('is-open');
  backdrop.classList.add('is-closing');

  let finished = false;
  const complete = () => {
    if (finished) {
      return;
    }
    finished = true;
    backdrop.removeEventListener('transitionend', onTransitionEnd);
    clearTimeout(fallbackTimer);
    finishClose();
  };

  const onTransitionEnd = (event) => {
    if (event.target === backdrop && event.propertyName === 'opacity') {
      complete();
    }
  };

  backdrop.addEventListener('transitionend', onTransitionEnd);
  const fallbackTimer = window.setTimeout(complete, FLASHCARD_TRANSITION_MS + 60);
}

function openProvisionedFlashcard(item) {
  const backdrop = ensureProvisionedFlashcardRoot();
  const dialog = backdrop.querySelector('.provisioned-flashcard');
  const titleEl = backdrop.querySelector('.provisioned-flashcard-title');
  const bodyEl = backdrop.querySelector('.provisioned-flashcard-body');

  if (!dialog || !titleEl || !bodyEl) {
    return;
  }

  titleEl.textContent = item.title || 'Provisioned item';
  bodyEl.textContent = item.info || 'No details available yet.';

  backdrop.classList.remove('is-closing');
  backdrop.hidden = false;
  document.body.classList.add('provisioned-flashcard-open');

  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    dialog.focus();
  });
}

function initProvisionedFlashcards(container, items) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const backdrop = ensureProvisionedFlashcardRoot();
  const closeBtn = backdrop.querySelector('.provisioned-flashcard-close');

  container.querySelectorAll('[data-provisioned-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = itemsById.get(button.getAttribute('data-provisioned-id'));
      if (item) {
        openProvisionedFlashcard(item);
      }
    });
  });

  closeBtn?.addEventListener('click', closeProvisionedFlashcard);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeProvisionedFlashcard();
    }
  });

  if (!backdrop.dataset.bound) {
    backdrop.dataset.bound = 'true';
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeProvisionedFlashcard();
      }
    });
  }
}

function getCarouselLayout(root, count) {
  const cardSize = parseFloat(getComputedStyle(root).getPropertyValue('--coverflow-card-size')) || 112;
  const slotFactor = parseFloat(getComputedStyle(root).getPropertyValue('--coverflow-slot-factor')) || 0.98;
  const rotateFactor = parseFloat(getComputedStyle(root).getPropertyValue('--coverflow-rotate-factor')) || 58;
  const viewport = root.querySelector('.coverflow-viewport');
  const viewportWidth = viewport?.clientWidth || root.clientWidth || 640;
  const isCompact = viewportWidth < 640;
  const visibleSlots = 2.15;
  const preferredSpacing = cardSize * slotFactor;
  const maxSpacing = (viewportWidth - cardSize * 0.5) / (visibleSlots * 2 + 0.35);
  const slotSpacing = Math.max(cardSize * 0.9, Math.min(preferredSpacing, maxSpacing));

  return {
    cardSize,
    angleStep: 360 / count,
    visibleSlots,
    slotSpacing,
    rotateFactor,
    count,
    isCompact,
  };
}

function getItemSlotOffset(index, rotationDeg, angleStep, count) {
  const frontIndex = rotationDeg / angleStep;
  let slotOffset = index - frontIndex;
  slotOffset = ((slotOffset % count) + count) % count;
  if (slotOffset > count / 2) {
    slotOffset -= count;
  }
  return slotOffset;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function layoutCarouselCard(card, slotOffset, layout, isActive, { animate = true } = {}) {
  const abs = Math.abs(slotOffset);
  const visible = abs <= layout.visibleSlots + 0.2;

  card.style.transition = animate ? '' : 'none';

  if (!visible) {
    card.classList.remove('is-active', 'is-visible');
    card.style.opacity = '0';
    card.style.visibility = 'hidden';
    card.style.zIndex = '0';
    card.style.transform = 'translateX(0px) translateZ(-120px) rotateY(0deg) scale(0.72)';
    card.setAttribute('aria-hidden', 'true');
    return;
  }

  const x = slotOffset * layout.slotSpacing;
  const rotateY = clamp(-slotOffset * layout.rotateFactor, -72, 72);
  const depth = -(abs * 34 + abs * abs * 14);
  const scale = clamp(1 - abs * 0.13, 0.72, 1);
  const opacity = clamp(1 - Math.max(0, abs - 0.12) * 0.24, 0.55, 1);

  card.classList.toggle('is-active', isActive);
  card.classList.toggle('is-visible', opacity > 0.04);
  card.style.opacity = String(opacity);
  card.style.visibility = opacity > 0.04 ? 'visible' : 'hidden';
  card.style.zIndex = String(Math.round(1000 - abs * 100));
  card.style.transform = `translateX(${x.toFixed(2)}px) translateZ(${depth.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
}

function initCarousel3D(root, items) {
  const ring = root.querySelector('[data-carousel-ring]');
  const viewport = root.querySelector('[data-carousel-viewport]');
  const prevBtn = root.querySelector('.coverflow-btn-prev');
  const nextBtn = root.querySelector('.coverflow-btn-next');
  const cards = Array.from(ring?.querySelectorAll('.coverflow-card') ?? []);
  const count = cards.length;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!ring || !viewport || count === 0) {
    return;
  }

  let rotation = 0;
  let spinDirection = 0;
  let animationId = null;
  let inertiaId = null;
  let lastTimestamp = null;
  let dragState = null;
  let isTouchCarousel = false;

  root.dataset.carouselCount = String(count);
  root.classList.add('coverflow--navigable');

  const getDragSensitivity = (layout) => (
    isTouchCarousel || layout.isCompact ? CAROUSEL_TOUCH_DRAG_SENSITIVITY : CAROUSEL_DRAG_SENSITIVITY
  );

  const cancelInertia = () => {
    if (inertiaId !== null) {
      cancelAnimationFrame(inertiaId);
      inertiaId = null;
    }
  };

  const applyRotation = ({ animate = true } = {}) => {
    const layout = getCarouselLayout(root, count);
    const activeIndex = ((Math.round(rotation / layout.angleStep) % count) + count) % count;
    const shouldAnimate = animate && !dragState && spinDirection === 0 && inertiaId === null && !isTouchCarousel;

    cards.forEach((card, index) => {
      const slotOffset = getItemSlotOffset(index, rotation, layout.angleStep, count);
      layoutCarouselCard(card, slotOffset, layout, index === activeIndex, { animate: shouldAnimate });
    });

    root.setAttribute('aria-label', `Provisioned wishlist, item ${activeIndex + 1} of ${count}`);
  };

  const startInertia = (velocityDegPerMs) => {
    cancelInertia();

    if (prefersReducedMotion || Math.abs(velocityDegPerMs) < CAROUSEL_MOMENTUM_MIN_VELOCITY) {
      return;
    }

    let velocity = velocityDegPerMs * CAROUSEL_MOMENTUM_MULTIPLIER;
    let lastTime = performance.now();

    const inertiaTick = (now) => {
      const deltaMs = now - lastTime;
      lastTime = now;
      rotation += velocity * deltaMs;
      velocity *= CAROUSEL_MOMENTUM_FRICTION ** (deltaMs / 16.67);
      applyRotation({ animate: false });

      if (Math.abs(velocity) >= CAROUSEL_MOMENTUM_MIN_VELOCITY) {
        inertiaId = requestAnimationFrame(inertiaTick);
      } else {
        inertiaId = null;
      }
    };

    inertiaId = requestAnimationFrame(inertiaTick);
  };

  const tick = (timestamp) => {
    if (spinDirection === 0) {
      animationId = null;
      lastTimestamp = null;
      prevBtn?.classList.remove('is-spinning');
      nextBtn?.classList.remove('is-spinning');
      return;
    }

    if (lastTimestamp !== null) {
      const delta = (timestamp - lastTimestamp) / 1000;
      rotation += spinDirection * CAROUSEL_SPIN_SPEED * delta;
      applyRotation({ animate: false });
    }

    lastTimestamp = timestamp;
    animationId = requestAnimationFrame(tick);
  };

  const startSpin = (direction, button) => {
    if (prefersReducedMotion || count <= 1) {
      return;
    }

    spinDirection = direction;
    prevBtn?.classList.toggle('is-spinning', button === prevBtn);
    nextBtn?.classList.toggle('is-spinning', button === nextBtn);

    if (animationId === null) {
      lastTimestamp = null;
      animationId = requestAnimationFrame(tick);
    }
  };

  const stopSpin = () => {
    spinDirection = 0;
  };

  const openProvisionedPage = () => {
    window.location.href = PROVISIONED_PAGE_URL;
  };

  const bindSpinControl = (button, direction) => {
    if (!button) {
      return;
    }

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('mouseenter', () => startSpin(direction, button));
    button.addEventListener('mouseleave', stopSpin);
    button.addEventListener('focus', () => startSpin(direction, button));
    button.addEventListener('blur', stopSpin);
    button.addEventListener('touchstart', (event) => {
      event.stopPropagation();
      event.preventDefault();
      startSpin(direction, button);
    }, { passive: false });
    button.addEventListener('touchend', stopSpin);
    button.addEventListener('touchcancel', stopSpin);
  };

  bindSpinControl(prevBtn, -1);
  bindSpinControl(nextBtn, 1);

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    stopSpin();
    cancelInertia();
    isTouchCarousel = event.pointerType === 'touch';

    const now = performance.now();
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      startRotation: rotation,
      lastTime: now,
      velocity: 0,
      moved: false,
      totalMove: 0,
    };

    viewport.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const incrementalX = event.clientX - dragState.lastX;
    dragState.totalMove = Math.max(dragState.totalMove, Math.abs(deltaX));

    if (Math.abs(deltaX) <= CAROUSEL_DRAG_THRESHOLD_PX) {
      return;
    }

    dragState.moved = true;
    const layout = getCarouselLayout(root, count);
    const sensitivity = getDragSensitivity(layout);
    const now = performance.now();
    const deltaMs = Math.max(now - dragState.lastTime, 1);
    const rotationDelta = -(incrementalX / layout.slotSpacing) * layout.angleStep * sensitivity;

    rotation += rotationDelta;
    dragState.velocity = dragState.velocity * 0.55 + (rotationDelta / deltaMs) * 0.45;
    dragState.lastX = event.clientX;
    dragState.lastTime = now;
    applyRotation({ animate: false });
  };

  const onPointerUp = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const shouldNavigate = !dragState.moved && dragState.totalMove < CAROUSEL_TAP_THRESHOLD_PX;
    const wasDragged = dragState.moved;
    const releaseVelocity = dragState.velocity;
    const usedTouch = isTouchCarousel;
    dragState = null;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (shouldNavigate) {
      isTouchCarousel = false;
      openProvisionedPage();
      return;
    }

    if (wasDragged && usedTouch) {
      startInertia(releaseVelocity);
      isTouchCarousel = false;
      return;
    }

    if (wasDragged) {
      applyRotation({ animate: true });
    }

    isTouchCarousel = false;
  };

  const onPointerCancel = (event) => {
    if (dragState?.pointerId === event.pointerId) {
      dragState = null;
      isTouchCarousel = false;
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProvisionedPage();
    }
  };

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerCancel);
  viewport.addEventListener('keydown', onKeyDown);

  const handleResize = () => {
    applyRotation();
  };

  applyRotation();
  requestAnimationFrame(applyRotation);

  window.addEventListener('resize', handleResize);

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(viewport);

  root._carouselCleanup = () => {
    stopSpin();
    cancelInertia();
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', handleResize);
    resizeObserver?.disconnect();
    viewport.removeEventListener('pointerdown', onPointerDown);
    viewport.removeEventListener('pointermove', onPointerMove);
    viewport.removeEventListener('pointerup', onPointerUp);
    viewport.removeEventListener('pointercancel', onPointerCancel);
    viewport.removeEventListener('keydown', onKeyDown);
  };
}

async function initProvisionedSection() {
  const carouselRoot = document.querySelector('[data-provisioned-coverflow]');
  const gridRoot = document.querySelector('[data-provisioned-grid]');
  const listRoot = carouselRoot || gridRoot;
  const descriptionRoot = document.querySelector('[data-provisioned-description]');

  if (!listRoot) {
    return;
  }

  try {
    const data = await fetchProvisionedItems();
    const categories = normalizeProvisionedCategories(data);
    const items = sortItemsByCategory(normalizeProvisionedItems(data, categories), categories);

    if (descriptionRoot && typeof data?.description === 'string' && data.description.trim()) {
      descriptionRoot.textContent = data.description.trim();
    }

    if (gridRoot) {
      renderProvisionedGrid(gridRoot, items, categories);
      return;
    }

    renderProvisionedCarousel(carouselRoot, items);
  } catch {
    listRoot.innerHTML = '<p class="provisioned-empty">Could not load provisioned items.</p>';
  }
}

document.addEventListener('DOMContentLoaded', initProvisionedSection);
