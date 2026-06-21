document.addEventListener('DOMContentLoaded', () => {
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
