const PROVISIONED_ITEMS_URL = '/provisioned/items.json';
const CAROUSEL_SPIN_SPEED = 32;
const FLASHCARD_TRANSITION_MS = 240;

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
      <div class="coverflow-viewport">
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
        <section class="provisioned-category" aria-labelledby="provisioned-category-${escapeHtml(group.id)}">
          <h2 class="provisioned-category-title" id="provisioned-category-${escapeHtml(group.id)}">${escapeHtml(group.title)}</h2>
          <div class="provisioned-grid">${gridMarkup}</div>
        </section>
      `;
    })
    .join('');

  container.innerHTML = `<div class="provisioned-catalog">${catalogMarkup}</div>`;
  initProvisionedFlashcards(container, items);
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
  const viewport = root.querySelector('.coverflow-viewport');
  const viewportWidth = viewport?.clientWidth || root.clientWidth || 640;
  const visibleSlots = count <= 10 ? 3.2 : count <= 16 ? 2.9 : 2.6;
  const usableWidth = Math.max(cardSize * 2.4, viewportWidth - cardSize - 56);
  const slotSpacing = Math.min(
    cardSize * 0.84,
    Math.max(cardSize * 0.66, usableWidth / (visibleSlots * 2))
  );

  return {
    cardSize,
    angleStep: 360 / count,
    visibleSlots,
    slotSpacing,
    count,
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

function layoutCarouselCard(card, slotOffset, layout, isActive) {
  const abs = Math.abs(slotOffset);
  const visible = abs <= layout.visibleSlots + 0.4;

  if (!visible) {
    card.classList.remove('is-active', 'is-visible');
    card.style.opacity = '0';
    card.style.visibility = 'hidden';
    card.style.zIndex = '0';
    card.style.transform = 'translateX(0px) rotateY(0deg) scale(0.8)';
    card.setAttribute('aria-hidden', 'true');
    return;
  }

  const x = slotOffset * layout.slotSpacing;
  const rotateY = clamp(-slotOffset * 26, -48, 48);
  const scale = clamp(1 - abs * 0.075, 0.8, 1);
  const opacity = clamp(1 - Math.max(0, abs - 0.35) * 0.4, 0, 1);

  card.classList.toggle('is-active', isActive);
  card.classList.toggle('is-visible', opacity > 0.04);
  card.style.opacity = String(opacity);
  card.style.visibility = opacity > 0.04 ? 'visible' : 'hidden';
  card.style.zIndex = String(Math.round(1000 - abs * 100));
  card.style.transform = `translateX(${x.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
}

function initCarousel3D(root, items) {
  const ring = root.querySelector('[data-carousel-ring]');
  const prevBtn = root.querySelector('.coverflow-btn-prev');
  const nextBtn = root.querySelector('.coverflow-btn-next');
  const cards = Array.from(ring?.querySelectorAll('.coverflow-card') ?? []);
  const count = cards.length;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!ring || count === 0) {
    return;
  }

  let rotation = 0;
  let spinDirection = 0;
  let animationId = null;
  let lastTimestamp = null;
  let layout = getCarouselLayout(root, count);

  root.dataset.carouselCount = String(count);

  const applyRotation = () => {
    layout = getCarouselLayout(root, count);
    const activeIndex = ((Math.round(rotation / layout.angleStep) % count) + count) % count;

    cards.forEach((card, index) => {
      const slotOffset = getItemSlotOffset(index, rotation, layout.angleStep, count);
      layoutCarouselCard(card, slotOffset, layout, index === activeIndex);
    });

    root.setAttribute('aria-label', `Provisioned wishlist, item ${activeIndex + 1} of ${count}`);
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
      applyRotation();
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

  const bindSpinControl = (button, direction) => {
    if (!button) {
      return;
    }

    button.addEventListener('mouseenter', () => startSpin(direction, button));
    button.addEventListener('mouseleave', stopSpin);
    button.addEventListener('focus', () => startSpin(direction, button));
    button.addEventListener('blur', stopSpin);
    button.addEventListener('touchstart', (event) => {
      event.preventDefault();
      startSpin(direction, button);
    }, { passive: false });
    button.addEventListener('touchend', stopSpin);
    button.addEventListener('touchcancel', stopSpin);
  };

  bindSpinControl(prevBtn, -1);
  bindSpinControl(nextBtn, 1);

  const handleResize = () => {
    applyRotation();
  };

  applyRotation();
  requestAnimationFrame(applyRotation);

  window.addEventListener('resize', handleResize);

  const viewport = root.querySelector('.coverflow-viewport');
  const resizeObserver = viewport && typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(viewport);

  root._carouselCleanup = () => {
    stopSpin();
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', handleResize);
    resizeObserver?.disconnect();
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
