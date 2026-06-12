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
});
