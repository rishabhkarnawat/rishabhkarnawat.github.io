document.addEventListener('DOMContentLoaded', () => {
  initMarginDecor();

  document.querySelectorAll('.project-video-wrap video').forEach((video) => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;

    const play = () => {
      video.play().catch(() => {});
    };

    play();
    video.addEventListener('ended', play);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        play();
      }
    });
  });

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.projects-carousel-track');
    const prevBtn = carousel.querySelector('.carousel-btn-prev');
    const nextBtn = carousel.querySelector('.carousel-btn-next');

    if (!track || !prevBtn || !nextBtn) {
      return;
    }

    const cards = track.querySelectorAll('.project-card');
    if (cards.length === 0) {
      return;
    }

    const getScrollStep = () => {
      const card = cards[0];
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      return card.offsetWidth + gap;
    };

    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const hasOverflow = maxScroll > 4;

      prevBtn.hidden = !hasOverflow;
      nextBtn.hidden = !hasOverflow;
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= maxScroll - 4;
    };

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();
  });

  initPortfolioAccordions();
});

function initMarginDecor() {
  if (window.matchMedia('(max-width: 960px)').matches) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const left = document.createElement('div');
  left.className = 'margin-decor margin-decor-left';
  left.setAttribute('aria-hidden', 'true');

  const right = document.createElement('div');
  right.className = 'margin-decor margin-decor-right';
  right.setAttribute('aria-hidden', 'true');

  document.body.append(left, right);

  bindMarginDecor(left);
  bindMarginDecor(right);
}

function getMarginCellPosition(x, y, width, gridSize, isRight) {
  const remainder = width % gridSize;
  let cellX;
  let cellW = gridSize;

  if (isRight) {
    if (remainder > 0 && x < remainder) {
      cellX = 0;
      cellW = remainder;
    } else {
      const gridStart = remainder;
      cellX = gridStart + Math.floor((x - gridStart) / gridSize) * gridSize;
    }
  } else {
    cellX = Math.floor(x / gridSize) * gridSize;
    if (remainder > 0) {
      const partialStart = width - remainder;
      if (x >= partialStart) {
        cellX = partialStart;
        cellW = remainder;
      }
    }
  }

  const cellY = Math.floor(y / gridSize) * gridSize;
  return { cellX, cellY, cellW, cellH: gridSize };
}

function getMarginCellColumns(width, gridSize, isRight) {
  const columns = [];
  const remainder = width % gridSize;

  if (isRight) {
    if (remainder > 0) {
      columns.push({ x: 0, w: remainder });
    }
    for (let x = remainder; x + gridSize <= width; x += gridSize) {
      columns.push({ x, w: gridSize });
    }
    return columns;
  }

  for (let x = 0; x + gridSize <= width - remainder; x += gridSize) {
    columns.push({ x, w: gridSize });
  }
  if (remainder > 0) {
    columns.push({ x: width - remainder, w: remainder });
  }
  return columns;
}

function spawnMarginGridWave(decor, x, y, width, height, gridSize, isRight) {
  const radiusCells = 2.35;
  const radiusPx = gridSize * radiusCells;
  const columns = getMarginCellColumns(width, gridSize, isRight);
  const minRow = Math.max(0, Math.floor((y - radiusPx) / gridSize));
  const maxRow = Math.floor((y + radiusPx) / gridSize);

  const wave = document.createElement('div');
  wave.className = 'margin-grid-wave';

  const ring = document.createElement('span');
  ring.className = 'margin-grid-wave__ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  wave.append(ring);

  for (let row = minRow; row <= maxRow; row += 1) {
    const cellY = row * gridSize;
    if (cellY + gridSize > height) {
      continue;
    }

    columns.forEach((col) => {
      const centerX = col.x + col.w / 2;
      const centerY = cellY + gridSize / 2;
      const distance = Math.hypot(x - centerX, y - centerY);

      if (distance > radiusPx) {
        return;
      }

      const cell = document.createElement('span');
      cell.className = 'margin-grid-wave__cell';
      cell.style.left = `${col.x}px`;
      cell.style.top = `${cellY}px`;
      cell.style.width = `${col.w}px`;
      cell.style.height = `${gridSize}px`;

      const normalized = distance / radiusPx;
      cell.style.setProperty('--wave-delay', `${normalized * 0.14}s`);
      cell.style.setProperty('--wave-opacity', `${0.85 - normalized * 0.45}`);

      const fill = document.createElement('span');
      fill.className = 'margin-grid-wave__cell-fill';
      cell.append(fill);
      wave.append(cell);
    });
  }

  decor.append(wave);
  window.setTimeout(() => wave.remove(), 720);
}

function bindMarginDecor(decor) {
  const gridSize = 22;
  const isRight = decor.classList.contains('margin-decor-right');

  decor.addEventListener('mousemove', (event) => {
    const rect = decor.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { cellX, cellY, cellW, cellH } = getMarginCellPosition(x, y, rect.width, gridSize, isRight);

    decor.style.setProperty('--cursor-x', `${x}px`);
    decor.style.setProperty('--cursor-y', `${y}px`);
    decor.style.setProperty('--cell-x', `${cellX}px`);
    decor.style.setProperty('--cell-y', `${cellY}px`);
    decor.style.setProperty('--cell-w', `${cellW}px`);
    decor.style.setProperty('--cell-h', `${cellH}px`);
    decor.classList.add('is-active');
  });

  decor.addEventListener('click', (event) => {
    const rect = decor.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    spawnMarginGridWave(decor, x, y, rect.width, rect.height, gridSize, isRight);
  });

  decor.addEventListener('mouseleave', () => {
    decor.classList.remove('is-active');
  });
}

const PI_ACCORDION_DURATION = 450;

function initPortfolioAccordions() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.pi-accordion').forEach((details) => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.pi-accordion-panel');
    const content = details.querySelector('.pi-accordion-inner .pi-cell-grid');

    if (!summary || !panel || !content) {
      return;
    }

    summary.addEventListener('click', (event) => {
      if (prefersReducedMotion) {
        return;
      }

      event.preventDefault();
      cancelPortfolioAccordionAnimation(details);

      if (details.classList.contains('is-expanded')) {
        closePortfolioAccordion(details, panel, content);
      } else {
        openPortfolioAccordion(details, content);
      }

      summary.blur();
    });
  });
}

function resetPortfolioAccordionPanel(panel) {
  panel.style.height = '';
  panel.style.transition = '';
  panel.style.overflow = '';
}

function cancelPortfolioAccordionAnimation(details) {
  if (details._accordionFinish?.cancel) {
    details._accordionFinish.cancel();
    details._accordionFinish = null;
  }

  const panel = details.querySelector('.pi-accordion-panel');
  if (panel) {
    resetPortfolioAccordionPanel(panel);
  }

  details.classList.remove('is-hiding');
}

function waitForPortfolioAccordionFade(content, onComplete) {
  let finished = false;
  const details = content.closest('.pi-accordion');

  const cleanup = () => {
    content.removeEventListener('transitionend', onTransitionEnd);
    clearTimeout(fallbackTimer);
    if (details?._accordionFinish?.finish === finish) {
      details._accordionFinish = null;
    }
  };

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    cleanup();
    onComplete();
  };

  details._accordionFinish = { finish, cancel: cleanup };

  const onTransitionEnd = (event) => {
    if (event.target === content && event.propertyName === 'opacity') {
      finish();
    }
  };

  const fallbackTimer = window.setTimeout(finish, PI_ACCORDION_DURATION + 50);
  content.addEventListener('transitionend', onTransitionEnd);
}

function waitForPortfolioAccordionCollapse(panel, onComplete) {
  let finished = false;
  const details = panel.closest('.pi-accordion');

  const cleanup = () => {
    panel.removeEventListener('transitionend', onTransitionEnd);
    clearTimeout(fallbackTimer);
    if (details?._accordionFinish?.finish === finish) {
      details._accordionFinish = null;
    }
  };

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    cleanup();
    onComplete();
  };

  details._accordionFinish = { finish, cancel: cleanup };

  const onTransitionEnd = (event) => {
    if (event.target === panel && event.propertyName === 'height') {
      finish();
    }
  };

  const fallbackTimer = window.setTimeout(finish, PI_ACCORDION_DURATION + 50);
  panel.addEventListener('transitionend', onTransitionEnd);
}

function openPortfolioAccordion(details, content) {
  details.open = true;
  details.classList.remove('is-hiding');
  details.classList.remove('is-expanded');
  content.offsetHeight;

  requestAnimationFrame(() => {
    details.classList.add('is-expanded');
  });
}

function closePortfolioAccordion(details, panel, content) {
  details.classList.add('is-hiding');

  waitForPortfolioAccordionFade(content, () => {
    details.classList.remove('is-hiding');
    details.classList.remove('is-expanded');

    const startHeight = panel.scrollHeight;
    panel.style.overflow = 'hidden';
    panel.style.height = `${startHeight}px`;
    panel.style.transition = `height ${PI_ACCORDION_DURATION}ms ease-in-out`;
    panel.offsetHeight;
    panel.style.height = '0px';

    waitForPortfolioAccordionCollapse(panel, () => {
      details.open = false;
      resetPortfolioAccordionPanel(panel);
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getMarginCellPosition,
    getMarginCellColumns,
    PI_ACCORDION_DURATION,
  };
}
