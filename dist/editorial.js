const campaign = document.querySelector('.campaign');
const campaignPhoto = campaign.querySelector('.campaign-photo');
const railIndicator = document.querySelector('.rail-track span');
const story = document.querySelector('.brand-story');
document.querySelector('.shops').after(story);

// Keep the index in the same order as the campaign's featured outfit.
const varsityTile = tiles.find((_, index) => pieces[index].id === 'varsity');
list.prepend(varsityTile.item);

function updateRailIndicator() {
  const distance = list.scrollWidth - list.clientWidth;
  const progress = distance > 0 ? list.scrollLeft / distance : 0;
  railIndicator.style.setProperty('--rail-progress', `${progress * 257.14}%`);
}
list.addEventListener('scroll', updateRailIndicator, { passive: true });
new ResizeObserver(updateRailIndicator).observe(list);

let railDrag;
let discardRailClick = false;
list.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  discardRailClick = false;
  railDrag = { id: event.pointerId, start: event.clientX, left: list.scrollLeft, moved: false };
});
list.addEventListener('pointermove', event => {
  if (!railDrag || event.pointerId !== railDrag.id) return;
  const delta = event.clientX - railDrag.start;
  if (Math.abs(delta) > 6 && !railDrag.moved) {
    railDrag.moved = true;
    list.setPointerCapture(event.pointerId);
    list.classList.add('is-dragging');
    deferRailPlayback();
  }
  if (railDrag.moved) list.scrollLeft = railDrag.left - delta;
});
function settleRail(event) {
  if (!railDrag || event.pointerId !== railDrag.id) return;
  const moved = railDrag.moved;
  railDrag = undefined;
  list.classList.remove('is-dragging');
  if (!moved) return;
  discardRailClick = true;
  if (list.hasPointerCapture(event.pointerId)) list.releasePointerCapture(event.pointerId);
  const candidates = [...list.children].filter(item => !item.hidden);
  const viewport = list.getBoundingClientRect();
  const nearest = candidates.reduce((closest, item) => {
    const offset = item.getBoundingClientRect().left - viewport.left;
    return Math.abs(offset) < Math.abs(closest.offset) ? { item, offset } : closest;
  }, { offset: Infinity });
  if (nearest.item) list.scrollBy({ left: nearest.offset, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
window.addEventListener('pointerup', settleRail);
window.addEventListener('pointercancel', settleRail);
list.addEventListener('lostpointercapture', settleRail);
window.addEventListener('blur', () => {
  railDrag = undefined;
  list.classList.remove('is-dragging');
});
list.addEventListener('click', event => {
  if (!discardRailClick) return;
  discardRailClick = false;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

// Keyboard navigation follows the visual order of the rail.
list.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const controls = [...list.querySelectorAll('li:not([hidden]) .tile')];
  const index = controls.indexOf(document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  const destination = Math.max(0, Math.min(controls.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
  controls[destination].focus({ preventScroll: true });
  const offset = controls[destination].getBoundingClientRect().left - list.getBoundingClientRect().left;
  list.scrollBy({ left: offset, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});

// Reuse the existing photo transition and preserve the exact collection position.
let collectionPosition = 0;
let collectionSource;
list.addEventListener('click', event => {
  const button = event.target.closest('.tile');
  if (!button) return;
  collectionPosition = window.scrollY;
  collectionSource = button;
}, true);
document.querySelector('.back-to-collection').addEventListener('click', event => {
  event.preventDefault();
  ++request;
  ++angleRequest;
  stopFlight?.();
  const source = media.lastElementChild;
  const target = collectionSource?.querySelector('img');
  transitionPhoto(source, target, collectionPosition, () => {
    detail.hidden = true;
    collectionSource?.focus({ preventScroll: true });
  });
});

function resetCampaignMotion() {
  if (!reducedMotion.matches) return;
  stopFlight?.();
  campaignPhoto.getAnimations().forEach(animation => animation.cancel());
}
reducedMotion.addEventListener('change', resetCampaignMotion);
