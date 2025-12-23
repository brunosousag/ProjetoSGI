
(() => {
  const initCarousel = (grid) => {
    const parent = grid.closest('.lr-shell') || grid.parentElement;
    const track = parent.querySelector('.lr-scrollbar-track');
    const thumb = parent.querySelector('.lr-scrollbar-thumb');
    const prevBtn = parent.querySelector('.lr-nav-prev');
    const nextBtn = parent.querySelector('.lr-nav-next');

    if (!track || !thumb) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let dragThreshold = 5;
    let moved = false;

    const updateThumb = () => {
      const visible = grid.clientWidth;
      const total = grid.scrollWidth;
      if (total <= visible) {
        thumb.style.display = 'none';
        track.style.opacity = '0';
        return;
      }
      track.style.opacity = '1';
      thumb.style.display = 'block';
      const ratio = visible / total;
      const thumbWidth = Math.max(60, track.clientWidth * ratio);
      thumb.style.width = `${thumbWidth}px`;
      const maxThumbX = track.clientWidth - thumbWidth;
      const scrollRatio = grid.scrollLeft / (total - visible);
      thumb.style.left = `${maxThumbX * scrollRatio}px`;

      // Update Button States
      if (prevBtn) {
        if (grid.scrollLeft <= 10) { // Tolerance
          prevBtn.style.opacity = '0.3';
          prevBtn.style.pointerEvents = 'none';
        } else {
          prevBtn.style.opacity = '1';
          prevBtn.style.pointerEvents = 'auto';
        }
      }
      if (nextBtn) {
        if (grid.scrollLeft + visible >= total - 10) { // Tolerance
          nextBtn.style.opacity = '0.3';
          nextBtn.style.pointerEvents = 'none';
        } else {
          nextBtn.style.opacity = '1';
          nextBtn.style.pointerEvents = 'auto';
        }
      }
    };

    grid.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);

    // Grid Drag
    grid.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      startX = e.pageX - grid.offsetLeft;
      scrollLeft = grid.scrollLeft;
      moved = false;
      grid.classList.add('lr-grabbing');

      // Disable smooth scroll & snap for immediate drag response
      grid.style.scrollBehavior = 'auto';
      grid.style.scrollSnapType = 'none';
    });

    const stopDrag = () => {
      isDown = false;
      grid.classList.remove('lr-grabbing');
      // Re-enable smooth scroll & snap
      grid.style.scrollBehavior = 'smooth';
      grid.style.scrollSnapType = 'x mandatory';
    };

    window.addEventListener('mouseleave', stopDrag);
    window.addEventListener('mouseup', stopDrag);

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - grid.offsetLeft;
      const walk = (x - startX) * 1.5; // Increased drag speed slightly for feel

      if (Math.abs(walk) > dragThreshold) {
        moved = true;
        grid.scrollLeft = scrollLeft - walk;
      }
    });

    // Prevent link clicks if dragged
    grid.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Thumb Drag (Keep existing logic but ensure smooth toggle)
    let isDragThumb = false;
    let thumbStart = 0;
    let thumbLeftStart = 0;

    const startDragThumb = (e) => {
      e.preventDefault();
      isDragThumb = true;
      grid.style.scrollBehavior = 'auto'; // Disable smooth for thumb drag
      grid.style.scrollSnapType = 'none';
      thumbStart = e.touches ? e.touches[0].pageX : e.pageX;
      thumbLeftStart = parseFloat(getComputedStyle(thumb).left) || 0;
    };

    thumb.addEventListener('mousedown', startDragThumb);
    thumb.addEventListener('touchstart', startDragThumb, { passive: false });

    const stopThumbDrag = () => {
      isDragThumb = false;
      grid.style.scrollBehavior = 'smooth';
      grid.style.scrollSnapType = 'x mandatory';
    };

    window.addEventListener('mouseup', stopThumbDrag);
    window.addEventListener('touchend', stopThumbDrag);

    const onThumbMove = (e) => {
      if (!isDragThumb) return;
      const dx = (e.touches ? e.touches[0].pageX : e.pageX) - thumbStart;
      const maxThumbX = track.clientWidth - thumb.clientWidth;
      const newLeft = Math.min(Math.max(0, thumbLeftStart + dx), maxThumbX);
      thumb.style.left = `${newLeft}px`;
      const ratio = newLeft / maxThumbX;
      grid.scrollLeft = (grid.scrollWidth - grid.clientWidth) * ratio;
    };

    window.addEventListener('mousemove', onThumbMove);
    window.addEventListener('touchmove', onThumbMove, { passive: false });

    // Nav Buttons
    if (prevBtn && nextBtn) {
      prevBtn.onclick = () => {
        grid.scrollBy({ left: -350, behavior: 'smooth' });
      };
      nextBtn.onclick = () => {
        grid.scrollBy({ left: 350, behavior: 'smooth' });
      };
    }

    // Intersection Observer to hide partial cards
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Smooth transition for opacity
        const target = entry.target;
        if (entry.intersectionRatio >= 0.99) {
          target.style.opacity = '1';
        } else {
          target.style.opacity = '0';
        }
        target.style.transition = 'opacity 0.4s ease-out';
      });
    }, {
      root: grid,
      threshold: 0.99
    });

    const cards = grid.querySelectorAll('.lr-product-card');
    cards.forEach(card => observer.observe(card));

    updateThumb(); // Initialize thumb and buttons
  };

  const grids = document.querySelectorAll('.lr-products-grid');
  grids.forEach(initCarousel);
})();
