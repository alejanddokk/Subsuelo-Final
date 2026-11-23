const stage = document.querySelector('#stage');
const look = stage.closest('.look');
const detail = look.closest('#detalle');
const media = stage.querySelector('.stage-media');
const frame = stage.querySelector('.stage-frame');
const stageError = stage.querySelector('.stage-error');
const pieceTitle = detail.querySelector('#piece-title span');
const collectionTitle = document.querySelector('#collection-title');
const specs = detail.querySelector('.piece-specs');
const filterStatus = document.querySelector('#filter-status');
const list = document.querySelector('#productos');
const typeFilter = document.querySelector('#tipo');
const colorFilter = document.querySelector('#color');
const railButtons = [...document.querySelectorAll('[data-step]')];
const railPlayback = document.querySelector('.rail-playback');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pieceGlows = {
  Rosa: '#59404b',
  Espresso: '#47352e',
  Carbón: '#373640',
  Gris: '#414047',
  Grafito: '#343641',
};
const angles = ['Frente', 'Tres cuartos', 'Espalda'];
const anglePhotos = look.querySelector('.angle-photos');
const path = (piece, index = 0) => 'assets/isolated/' + piece.id + '-' + (index + 1) + '.png';
const angleButtons = angles.map((label, index) => {
  const button = document.createElement('button');
  const thumbnail = new Image();
  button.type = 'button';
  button.setAttribute('aria-label', label);
  thumbnail.alt = '';
  thumbnail.draggable = false;
  button.append(thumbnail);
  button.addEventListener('click', () => showAngle(index));
  anglePhotos.append(button);
  return button;
});

let displayed = -1;
let angle = 0;
let requestedAngle = 0;
let angleRequest = 0;
let angleImages = [];
let angleFade;
let viewerWheelTime = -Infinity;
let viewerWheelDirection = 0;
let viewerWheelOwned = false;
let requestedPiece = displayed;
let request = 0;
let drag;
let lightFrame = 0;
let railFrame = 0;
let railGlide = 0;
let railTarget = 0;
let railWheelTime = -Infinity;
let railWheelDirection = 0;
let stopFlight;
let railPlaybackFrame;
let railLastFrame = 0;
let railRemainder = 0;
let railDirection = 1;
let railPauseUntil = 0;
let railAutoPosition = 0;
let railPointer;
let railPlaying = !reducedMotion.matches;

async function openPiece(index, source) {
  deferRailPlayback();
  stopFlight?.();
  stopRailGlide();
  list.scrollTo({ left: list.scrollLeft, behavior: 'instant' });
  if (!await show(index)) return;
  detail.hidden = false;
  setZoom(false);
  flyPhoto(source, media.lastElementChild);
}

const tiles = pieces.map((piece, index) => {
  const item = document.createElement('li');
  const button = document.createElement('button');
  const thumbnail = document.createElement('span');
  const image = new Image();
  const name = document.createElement('span');
  button.type = 'button';
  button.className = 'tile';
  item.style.setProperty('--piece-glow', pieceGlows[piece.color]);
  button.setAttribute('aria-controls', 'detalle');
  thumbnail.className = 'tile-image';
  image.src = path(piece);
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  thumbnail.append(image);
  name.className = 'tile-name';
  name.textContent = piece.name;
  const arrow = document.createElement('span');
  arrow.className = 'tile-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  name.append(arrow);
  button.append(thumbnail, name);
  button.addEventListener('click', () => openPiece(index, image));
  item.append(button);
  list.append(item);
  return { item, button };
});

function flyPhoto(source, target) {
  const top = Math.max(0, Math.min(
    window.scrollY + detail.getBoundingClientRect().top - 16,
    document.documentElement.scrollHeight - window.innerHeight,
  ));
  transitionPhoto(source, target, top, () => {
    detail.querySelector('h2').focus({ preventScroll: true });
  });
}

function transitionPhoto(source, target, endScroll, onComplete) {
  stopFlight?.();
  if (reducedMotion.matches || !source || !target) {
    window.scrollTo({ top: endScroll, behavior: 'instant' });
    onComplete();
    return;
  }

  const origin = source.getBoundingClientRect();
  const destination = target.getBoundingClientRect();
  const startScroll = window.scrollY;
  const finalTop = destination.top + startScroll - endScroll;
  const flight = source.cloneNode();
  flight.className = 'editorial-flight';
  flight.setAttribute('aria-hidden', 'true');
  flight.style.cssText = `position:fixed;z-index:30;pointer-events:none;object-fit:contain;left:${origin.left}px;top:${origin.top}px;width:${origin.width}px;height:${origin.height}px;max-width:none;max-height:none;translate:none;`;
  document.body.append(flight);
  source.classList.add('is-in-flight');
  target.classList.add('is-in-flight');

  let frameId;
  let startTime;
  let settled = false;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(frameId);
    flight.remove();
    source.classList.remove('is-in-flight');
    target.classList.remove('is-in-flight');
    window.removeEventListener('wheel', interrupt);
    window.removeEventListener('touchstart', interrupt);
    window.removeEventListener('keydown', interrupt);
    window.removeEventListener('resize', interrupt);
    stopFlight = undefined;
  };
  const interrupt = () => cleanup();
  stopFlight = cleanup;
  window.addEventListener('wheel', interrupt, { passive: true, once: true });
  window.addEventListener('touchstart', interrupt, { passive: true, once: true });
  window.addEventListener('keydown', interrupt, { once: true });
  window.addEventListener('resize', interrupt, { once: true });

  const mix = (from, to, progress) => from + (to - from) * progress;
  const tick = time => {
    startTime ??= time;
    const elapsed = Math.min(1, (time - startTime) / 640);
    const progress = 1 - Math.pow(1 - elapsed, 4);
    window.scrollTo({ top: mix(startScroll, endScroll, progress), behavior: 'instant' });
    flight.style.transformOrigin = 'top left';
    flight.style.transform = `translate(${mix(0, destination.left - origin.left, progress)}px, ${mix(0, finalTop - origin.top, progress)}px) scale(${mix(1, destination.width / origin.width, progress)}, ${mix(1, destination.height / origin.height, progress)})`;
    if (elapsed < 1) frameId = requestAnimationFrame(tick);
    else {
      cleanup();
      onComplete();
    }
  };
  frameId = requestAnimationFrame(tick);
}

function positionLens(x, y) {
  frame.style.setProperty('--lens-x', x + 'px');
  frame.style.setProperty('--lens-y', y + 'px');
}

function setZoom(zoomed, x = frame.clientWidth / 2, y = frame.clientHeight / 2) {
  if (zoomed) {
    frame.style.setProperty('--lens-image', `url("${media.lastElementChild.src}")`);
    frame.style.setProperty('--lens-width', frame.clientWidth * 2 + 'px');
    frame.style.setProperty('--lens-height', frame.clientHeight * 2 + 'px');
    positionLens(x, y);
  }
  look.classList.toggle('is-zoomed', zoomed);
}

function photoFor(piece, index) {
  const photo = new Image();
  photo.className = 'stage-photo';
  photo.alt = piece.name + ' — ' + angles[index].toLowerCase();
  photo.src = path(piece, index);
  return { photo, ready: photo.decode().then(() => true, () => false) };
}

function markAngle(index) {
  angleButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
}

async function showAngle(index) {
  const next = Math.max(0, Math.min(angles.length - 1, index));
  if (next === requestedAngle || !angleImages[next]) return;
  stopFlight?.();
  requestedAngle = next;
  const ticket = ++angleRequest;
  const { photo: preloaded, ready } = angleImages[next];
  const photo = preloaded.cloneNode();
  const loaded = await ready && await photo.decode().then(() => true, () => false);
  // Finish the current blend before applying the latest request.
  await angleFade;
  if (ticket !== angleRequest) return;
  if (!loaded) {
    requestedAngle = angle;
    return;
  }

  const previous = media.lastElementChild;
  const direction = Math.sign(next - angle);
  setZoom(false);
  angle = next;
  markAngle(next);
  stageError.hidden = true;
  look.style.setProperty('--ambient-x', direction > 0 ? '13%' : '-13%');
  look.style.setProperty('--control-offset', direction > 0 ? '-8px' : '0px');
  if (!previous || reducedMotion.matches) {
    media.replaceChildren(photo);
    return;
  }

  previous.setAttribute('aria-hidden', 'true');
  media.append(photo);
  const timing = { duration: 220, easing: 'ease-in-out' };
  const exit = previous.animate({ opacity: [1, 0] }, { ...timing, fill: 'forwards' });
  const entrance = photo.animate({ opacity: [0, 1] }, timing);
  angleFade = entrance.finished.catch(() => {}).finally(() => {
    if (media.lastElementChild === photo) previous.remove();
    exit.cancel();
    angleFade = undefined;
  });
}

async function show(index) {
  const ticket = ++request;
  requestedPiece = index;
  ++angleRequest;
  const piece = pieces[index];
  const images = displayed === index ? angleImages : angles.map((_, i) => photoFor(piece, i));
  const { photo, ready } = images[0];
  const loaded = await ready;
  if (ticket !== request) return false;

  ++angleRequest;
  angleImages = images;
  angle = requestedAngle = 0;
  viewerWheelTime = -Infinity;
  markAngle(0);
  angleButtons.forEach((button, i) => { button.firstChild.src = path(piece, i); });
  photo.getAnimations().forEach((animation) => animation.cancel());
  photo.removeAttribute('aria-hidden');
  displayed = index;
  detail.classList.remove('reveal-piece-text');
  detail.style.setProperty('--piece-glow', pieceGlows[piece.color]);
  pieceTitle.textContent = piece.name;
  specs.querySelector('.piece-description').textContent = piece.description;
  specs.querySelector('[data-spec="fit"]').textContent = piece.fit;
  specs.querySelector('[data-spec="materials"]').textContent = piece.materials;
  specs.querySelector('.specs-sizes').replaceChildren(...piece.sizes.map((size) => {
    const item = document.createElement('li');
    item.textContent = size;
    return item;
  }));
  tiles.forEach(({ button }, i) => button.setAttribute('aria-current', String(i === index)));
  stageError.hidden = loaded;
  media.replaceChildren(...(loaded ? [photo] : []));
  return true;
}

function filterPieces() {
  deferRailPlayback();
  stopRailGlide();
  const type = typeFilter.value;
  const color = colorFilter.value;
  tiles.forEach(({ item }, index) => {
    const piece = pieces[index];
    const matchesType = !type || type === piece.group || type === piece.type;
    item.hidden = !matchesType || Boolean(color && piece.color !== color);
  });
  filterStatus.hidden = tiles.some(({ item }) => !item.hidden);
  filterStatus.textContent = filterStatus.hidden ? '' : 'No hay prendas con esos filtros. Probá con otro tipo o color.';
  list.scrollTo({ left: 0, behavior: 'instant' });
  queueRailUpdate();
  if (tiles[requestedPiece]?.item.hidden) {
    ++request;
    requestedPiece = displayed;
  }
  if (tiles[displayed]?.item.hidden) {
    stopFlight?.();
    ++angleRequest;
    detail.hidden = true;
  }
}

for (const type of new Set(pieces.map((piece) => piece.type))) typeFilter.add(new Option(type, type));
for (const color of new Set(pieces.map((piece) => piece.color))) colorFilter.add(new Option(color, color));
typeFilter.addEventListener('change', filterPieces);
colorFilter.addEventListener('change', filterPieces);

function queueRailUpdate() {
  if (railFrame) return;
  railFrame = requestAnimationFrame(() => {
    railFrame = 0;
    const width = list.clientWidth;
    const left = list.getBoundingClientRect().left;
    railButtons[0].disabled = list.scrollLeft <= 2;
    railButtons[1].disabled = list.scrollLeft + width >= list.scrollWidth - 2;
    railPlayback.hidden = reducedMotion.matches || list.scrollWidth <= width + 2;
    for (const { item } of tiles) {
      if (item.hidden) continue;
      const rect = item.getBoundingClientRect();
      const distance = (rect.left - left + rect.width / 2 - width / 2) / Math.max(1, width / 2);
      const position = Math.min(1, Math.max(-1, distance));
      item.style.setProperty('--lift', position ** 2 * 13 + 'px');
      item.style.setProperty('--bank', position * -6 + 'deg');
      item.style.setProperty('--shine', (50 - position * 44) + '%');
      item.style.setProperty('--exposure', 1.12 - Math.abs(position) * .30);
      item.style.setProperty('--name-shift', position * -5 + 'px');
    }
  });
}

function stepRail(step) {
  stopRailGlide();
  const item = tiles.find(({ item }) => !item.hidden)?.item;
  if (!item) return;
  const distance = item.offsetWidth + parseFloat(getComputedStyle(list).columnGap);
  list.scrollBy({ left: distance * step, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

function setRailPlaying(playing) {
  railPlaying = playing;
  cancelAnimationFrame(railPlaybackFrame);
  railLastFrame = 0;
  railRemainder = 0;
  railPlayback.textContent = playing ? 'Ⅱ' : '▶';
  railPlayback.setAttribute('aria-label', playing ? 'Pausar recorrido automático' : 'Reanudar recorrido automático');
  if (playing) railPlaybackFrame = requestAnimationFrame(playRail);
}

function deferRailPlayback() {
  railPauseUntil = performance.now() + 850;
}

function playRail(time) {
  railPlaybackFrame = requestAnimationFrame(playRail);
  const elapsed = railLastFrame ? Math.min(time - railLastFrame, 40) : 0;
  railLastFrame = time;
  if (time < railPauseUntil || railPointer !== undefined || railGlide || railPlayback.hidden ||
      stopFlight || !intro.hidden || outfit.open || list.matches(':focus-within')) return;
  const bounds = list.getBoundingClientRect();
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

  const current = list.scrollLeft;
  const end = list.scrollWidth - list.clientWidth;
  if (end <= 2) return;
  if (current >= end - 1) railDirection = -1;
  else if (current <= 1) railDirection = 1;
  railRemainder += elapsed * .045;
  const pixels = Math.floor(railRemainder);
  if (!pixels) return;
  railRemainder -= pixels;
  list.scrollLeft = current + railDirection * pixels;
  railAutoPosition = list.scrollLeft;
}

railPlayback.addEventListener('click', () => setRailPlaying(!railPlaying));
railButtons.forEach((button) => button.addEventListener('click', () => {
  deferRailPlayback();
  stepRail(Number(button.dataset.step));
}));
list.addEventListener('scroll', () => {
  if (list.scrollLeft !== railAutoPosition) deferRailPlayback();
  queueRailUpdate();
}, { passive: true });
list.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary) return;
  railPointer = event.pointerId;
  stopRailGlide();
  list.scrollTo({ left: list.scrollLeft, behavior: 'instant' });
}, { passive: true });
function releaseRailPointer(event) {
  if (event.pointerId !== railPointer) return;
  railPointer = undefined;
  deferRailPlayback();
}
window.addEventListener('pointerup', releaseRailPointer, { passive: true });
window.addEventListener('pointercancel', releaseRailPointer, { passive: true });
window.addEventListener('blur', () => { railPointer = undefined; });
list.addEventListener('focusin', deferRailPlayback);
window.addEventListener('resize', queueRailUpdate);
window.addEventListener('resize', () => setZoom(false));

function stopRailGlide() {
  cancelAnimationFrame(railGlide);
  railGlide = 0;
  railWheelTime = -Infinity;
}

function wheelDelta(event, viewport) {
  const dominant = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  return dominant * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1);
}

list.addEventListener('wheel', (event) => {
  if (event.defaultPrevented || event.ctrlKey || !event.cancelable) return;
  const delta = wheelDelta(event, list.clientWidth);
  const max = list.scrollWidth - list.clientWidth;
  const current = list.scrollLeft;
  if (!delta || max < 1) return;
  const now = performance.now();
  const direction = Math.sign(delta);
  const continued = direction === railWheelDirection && now - railWheelTime < 155;
  const atEdge = direction < 0 ? current <= 1 : current >= max - 1;
  if (atEdge && !continued && !railGlide) return;
  deferRailPlayback();
  event.preventDefault();
  railWheelTime = now;
  railWheelDirection = direction;
  railTarget = Math.max(0, Math.min(max, (railGlide ? railTarget : current) + delta));
  if (reducedMotion.matches) {
    list.scrollLeft = railTarget;
    return;
  }
  if (!railGlide) railGlide = requestAnimationFrame(glideRail);
}, { passive: false });

function glideRail() {
  const remaining = railTarget - list.scrollLeft;
  if (Math.abs(remaining) < 1.5) {
    list.scrollLeft = railTarget;
    railGlide = 0;
    return;
  }
  list.scrollLeft += Math.sign(remaining) * Math.max(1, Math.abs(remaining) * .23);
  railGlide = requestAnimationFrame(glideRail);
}

stage.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
    event.preventDefault();
    if (!event.repeat && media.lastElementChild && !stopFlight) {
      setZoom(event.key !== 'Escape' && !look.classList.contains('is-zoomed'));
    }
    return;
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showAngle(requestedAngle + (event.key === 'ArrowRight' ? 1 : -1));
});

look.addEventListener('wheel', (event) => {
  if (event.defaultPrevented || event.ctrlKey || !event.cancelable) return;
  const delta = wheelDelta(event, stage.clientHeight);
  if (!delta) return;
  const now = performance.now();
  const direction = Math.sign(delta);
  if (now - viewerWheelTime > 180 || direction !== viewerWheelDirection) {
    const next = requestedAngle + direction;
    viewerWheelOwned = next >= 0 && next < angles.length;
    if (viewerWheelOwned) showAngle(next);
  }
  viewerWheelTime = now;
  viewerWheelDirection = direction;
  if (viewerWheelOwned) event.preventDefault();
}, { passive: false });

stage.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || stopFlight) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: requestedAngle, moved: false };
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener('pointermove', (event) => {
  if (drag?.id === event.pointerId) {
    const distance = drag.x - event.clientX;
    drag.moved ||= Math.hypot(distance, drag.y - event.clientY) > 8;
    const steps = Math.sign(distance) * Math.floor(Math.abs(distance) / 64);
    showAngle(drag.angle + steps);
  }
  if (event.pointerType !== 'mouse') return;
  cancelAnimationFrame(lightFrame);
  lightFrame = requestAnimationFrame(() => {
    if (look.classList.contains('is-zoomed')) {
      const photo = frame.getBoundingClientRect();
      if (event.clientX >= photo.left && event.clientX <= photo.right &&
          event.clientY >= photo.top && event.clientY <= photo.bottom) {
        positionLens(event.clientX - photo.left, event.clientY - photo.top);
      }
    }
    if (reducedMotion.matches) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    stage.style.setProperty('--light-x', x * 100 + '%');
    stage.style.setProperty('--light-y', y * 100 + '%');
  });
});

stage.addEventListener('pointerup', (event) => {
  if (drag?.id !== event.pointerId || drag.moved || !media.lastElementChild) return;
  const { clientX, clientY } = event;
  const photo = media.getBoundingClientRect();
  if (clientX < photo.left || clientX > photo.right || clientY < photo.top || clientY > photo.bottom) return;
  if (look.classList.contains('is-zoomed')) {
    setZoom(false);
    return;
  }
  setZoom(true, clientX - photo.left, clientY - photo.top);
});

stage.addEventListener('pointerleave', () => cancelAnimationFrame(lightFrame));
stage.addEventListener('lostpointercapture', () => { drag = undefined; });
reducedMotion.addEventListener('change', () => {
  queueRailUpdate();
  if (!reducedMotion.matches) return;
  setRailPlaying(false);
  stopFlight?.();
  stopRailGlide();
  const current = media.lastElementChild;
  if (current) {
    current.getAnimations().forEach((animation) => animation.cancel());
    media.replaceChildren(current);
  }
});

queueRailUpdate();
setRailPlaying(railPlaying);

const intro = document.querySelector('.brand-intro');
const showroom = document.querySelector('.showroom');
const brandFooter = document.querySelector('.brand-footer');
const collectionAmbient = showroom.querySelector('.showroom-ambient');
const detailAmbient = detail.querySelector('.detail-ambient');
const ambientPointer = matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');
let ambientFrame = 0;
let activeAmbient = collectionAmbient;

function resetAmbientLight() {
  cancelAnimationFrame(ambientFrame);
  for (const offset of ['--wall-x', '--wall-y', '--light-x', '--light-y']) {
    activeAmbient.style.removeProperty(offset);
  }
}

showroom.addEventListener('pointermove', (event) => {
  if (!ambientPointer.matches || event.pointerType !== 'mouse') return;
  const ambient = detail.contains(event.target) ? detailAmbient : collectionAmbient;
  if (ambient !== activeAmbient) {
    resetAmbientLight();
    activeAmbient = ambient;
  }
  cancelAnimationFrame(ambientFrame);
  ambientFrame = requestAnimationFrame(() => {
    const { left, top, width, height } = ambient.getBoundingClientRect();
    const x = (event.clientX - left) / width - .5;
    const y = (event.clientY - top) / height - .5;
    if (Math.abs(y) > .5) {
      resetAmbientLight();
      return;
    }
    ambient.style.setProperty('--wall-x', `${-x * 14}px`);
    ambient.style.setProperty('--wall-y', `${-y * 10}px`);
    ambient.style.setProperty('--light-x', `${x * 108}px`);
    ambient.style.setProperty('--light-y', `${y * 62}px`);
  });
}, { passive: true });
showroom.addEventListener('pointerleave', resetAmbientLight);
ambientPointer.addEventListener('change', resetAmbientLight);

function revealCollectionTitle() {
  if (reducedMotion.matches) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    collectionTitle.classList.add('is-revealing');
    observer.disconnect();
  }, { threshold: .55 });
  observer.observe(collectionTitle);
}

const introRelease = intro.getAnimations().find((animation) => animation.animationName === 'intro-release');
if (introRelease && getComputedStyle(intro).visibility === 'visible') {
  const skipToCatalog = document.querySelector('.skip');
  const dismissIntro = () => {
    if (intro.hidden) return;
    intro.hidden = true;
    document.body.classList.remove('intro-playing');
    showroom.inert = skipToCatalog.inert = brandFooter.inert = false;
    clearTimeout(introDeadline);
    revealCollectionTitle();
  };

  document.body.classList.add('intro-playing');
  showroom.inert = skipToCatalog.inert = brandFooter.inert = true;
  const introDeadline = setTimeout(dismissIntro, 3400);
  introRelease.finished.then(() => dismissIntro(), () => dismissIntro());
} else {
  intro.hidden = true;
  revealCollectionTitle();
}

const shops = {
  chacarita: {
    name: 'Chacarita', location: 'Chacarita, Buenos Aires',
    street: 'Pasaje del Túnel 48', hours: 'Martes a sábado, de 14 a 20 h',
  },
  guemes: {
    name: 'Güemes', location: 'Güemes, Córdoba',
    street: 'Pasaje del Vinilo 27', hours: 'Miércoles a domingo, de 15 a 21 h',
  },
};
const shopButtons = [...brandFooter.querySelectorAll('[data-shop]')];
const shopSign = brandFooter.querySelector('.shop-sign');
const shopName = shopSign.querySelector('.shop-sign-name');
const shopAddress = brandFooter.querySelector('.shop-address');

function selectShop(button) {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const shop = shops[button.dataset.shop];
  for (const option of shopButtons) option.setAttribute('aria-pressed', String(option === button));
  shopName.textContent = shop.name;
  shopAddress.querySelector('.shop-location').textContent = shop.location;
  shopAddress.querySelector('.shop-street').textContent = shop.street;
  shopAddress.querySelector('.shop-hours').textContent = shop.hours;

  for (const element of [shopName, shopAddress]) {
    element.getAnimations().forEach((animation) => animation.cancel());
    if (!reducedMotion.matches) {
      element.animate([
        { opacity: .2, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 320, easing: 'ease-out' });
    }
  }
}

for (const button of shopButtons) {
  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') selectShop(button);
  });
  button.addEventListener('click', () => selectShop(button));
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const target = event.key === 'ArrowLeft' ? shopButtons[0] : shopButtons[1];
    target.focus();
    selectShop(target);
  });
}

let shopLightFrame;
shopSign.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
  cancelAnimationFrame(shopLightFrame);
  shopLightFrame = requestAnimationFrame(() => {
    const bounds = shopSign.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    shopSign.style.setProperty('--shop-x', `${x * 100}px`);
    shopSign.style.setProperty('--shop-y', `${y * 70}px`);
    shopSign.style.setProperty('--shop-tilt-x', `${-y * 14}deg`);
    shopSign.style.setProperty('--shop-tilt-y', `${x * 18}deg`);
  });
});
shopSign.addEventListener('pointerleave', () => {
  cancelAnimationFrame(shopLightFrame);
  for (const property of ['--shop-x', '--shop-y', '--shop-tilt-x', '--shop-tilt-y']) {
    shopSign.style.removeProperty(property);
  }
});

const outfit = document.querySelector('.outfit');
const outfitStage = outfit.querySelector('.outfit-stage');
const outfitModel = outfit.querySelector('#outfit-model');
const outfitOptions = outfit.querySelector('.outfit-options');
const outfitStatus = outfit.querySelector('.outfit-status');
const outfitGenerate = outfit.querySelector('.outfit-generate');
const generatedOutfits = new Map();
let generationEnabled = false;
let pendingOutfit;
const outfitAngles = [...outfit.querySelectorAll('[data-outfit-angle]')];
const outfitSelection = new Set(['cargo', 'hoodie']);
const outfitPresets = [
  { id: 'eco', name: 'Eco', items: ['cargo', 'hoodie'] },
  { id: 'tunel', name: 'Túnel', items: ['cargo', 'hoodie', 'bolso'] },
  { id: 'anden', name: 'Andén', items: ['cargo', 'varsity', 'gorra'] },
  { id: 'frecuencia', name: 'Frecuencia', items: ['remera', 'gorra', 'bolso'] },
];
const outfitPresetButtons = outfitPresets.map((preset) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = preset.name;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    outfitSelection.clear();
    preset.items.forEach((id) => outfitSelection.add(id));
    updateOutfitSelection();
  });
  outfit.querySelector('.outfit-presets').append(button);
  return button;
});
let outfitAngle = 0;
let outfitRender = 0;

function outfitMessage(message) {
  const placeholder = document.createElement('p');
  placeholder.className = 'outfit-placeholder';
  placeholder.textContent = message;
  outfitStage.removeAttribute('role');
  outfitStage.removeAttribute('aria-label');
  outfitStage.replaceChildren(placeholder);
}

function outfitKey(model, items) {
  return JSON.stringify([model, [...items].sort()]);
}

async function renderOutfit() {
  const ticket = ++outfitRender;
  const preset = outfitPresets.find(({ items }) =>
    items.length === outfitSelection.size && items.every((id) => outfitSelection.has(id)));
  outfitPresetButtons.forEach((button, index) =>
    button.setAttribute('aria-pressed', String(outfitPresets[index] === preset)));
  const model = outfitModel.value;
  const angle = outfitAngle;
  const key = outfitKey(model, outfitSelection);
  const generated = generatedOutfits.get(key);
  const generating = pendingOutfit?.key === key;
  outfitModel.disabled = !outfitSelection.size;
  for (const button of outfitAngles) button.disabled = !preset && !generated;
  outfitGenerate.hidden = !generationEnabled || !outfitSelection.size || Boolean(preset || generated);
  outfitGenerate.disabled = Boolean(pendingOutfit);
  outfitGenerate.textContent = generating ? 'Generando vistas…' : 'Generar vistas con IA';
  outfitStatus.textContent = outfitSelection.size === 1
    ? '1 pieza elegida.'
    : outfitSelection.size + ' piezas elegidas.';

  if (!preset && !generated) {
    if (generating) {
      outfitMessage('Estamos generando las tres vistas. Puede tardar unos minutos.');
      return;
    }
    outfitMessage(outfitSelection.size
      ? 'Esta combinación todavía no tiene una vista generada.'
      : 'Elegí las piezas que querés combinar.');
    return;
  }

  const filename = preset
    ? 'assets/conjuntos/' + preset.id + '-' + model + '-' + (angle + 1) + '.jpg'
    : generated[angle];
  const currentPhoto = outfitStage.querySelector('.outfit-photo');
  const viewKey = JSON.stringify([key, angle]);
  if (currentPhoto?.dataset.viewKey === viewKey) return;

  const photo = new Image();
  photo.className = 'outfit-photo';
  photo.dataset.viewKey = viewKey;
  photo.alt = '';
  photo.src = filename;
  const loaded = await photo.decode().then(() => true, () => false);
  if (ticket !== outfitRender || !outfit.open) return;
  if (!loaded) {
    outfitMessage('No pudimos cargar esta vista. Probá con otro ángulo.');
    return;
  }

  outfitAngles.forEach((button, index) => button.setAttribute('aria-pressed', String(index === angle)));
  const names = pieces.filter(({ id }) => outfitSelection.has(id)).map(({ name }) => name);
  outfitStage.setAttribute('role', 'img');
  outfitStage.setAttribute('aria-label', 'Maniquí de ' + model + ', ' + angles[angle].toLowerCase() + '. ' + names.join(', '));
  outfitStage.replaceChildren(photo);
  if (!reducedMotion.matches) photo.animate({ opacity: [.65, 1] }, { duration: 200, easing: 'ease-out' });
}

for (const piece of pieces.filter(({ outfitSlot }) => outfitSlot)) {
  const button = document.createElement('button');
  const thumb = new Image();
  thumb.alt = '';
  thumb.src = path(piece);
  button.type = 'button';
  button.value = piece.id;
  button.append(thumb, piece.name);
  outfitOptions.append(button);
  button.addEventListener('click', () => {
    const id = piece.id;
    if (!outfitSelection.delete(id)) {
      const occupied = [piece.outfitSlot, ...(piece.covers ?? [])];
      for (const selected of pieces) {
        if (!outfitSelection.has(selected.id)) continue;
        const selectedSlots = [selected.outfitSlot, ...(selected.covers ?? [])];
        if (selectedSlots.some((slot) => occupied.includes(slot))) outfitSelection.delete(selected.id);
      }
      outfitSelection.add(id);
    }
    updateOutfitSelection();
  });
}

function updateOutfitSelection() {
  for (const button of outfitOptions.children) button.setAttribute('aria-pressed', String(outfitSelection.has(button.value)));
  renderOutfit();
}

document.querySelector('.outfit-open').addEventListener('click', () => {
  deferRailPlayback();
  stopFlight?.();
  outfit.showModal();
  updateOutfitSelection();
  if (location.protocol !== 'file:') {
    fetch('/api/probador')
      .then(response => response.ok ? response.json() : {})
      .then(({ enabled }) => {
        generationEnabled = enabled === true;
        if (outfit.open) renderOutfit();
      })
      .catch(() => {});
  }
});
outfitGenerate.addEventListener('click', async () => {
  if (pendingOutfit) return;
  const model = outfitModel.value;
  const items = [...outfitSelection];
  const key = outfitKey(model, items);
  pendingOutfit = { key };
  renderOutfit();
  let errorMessage;
  try {
    const response = await fetch('/api/probador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, items }),
    });
    const { views, error } = await response.json();
    if (!response.ok) throw new Error(error);
    if (!Array.isArray(views) || views.length !== angles.length) throw new Error();
    generatedOutfits.set(key, views);
  } catch (error) {
    errorMessage = error.message || 'No pudimos generar el conjunto. Probá de nuevo.';
  } finally {
    pendingOutfit = undefined;
    if (outfit.open) {
      renderOutfit();
      if (errorMessage && key === outfitKey(outfitModel.value, outfitSelection)) {
        outfitStatus.textContent = errorMessage;
      }
    }
  }
});
outfitModel.addEventListener('change', renderOutfit);
outfitAngles.forEach((button) => button.addEventListener('click', () => {
  outfitAngle = Number(button.dataset.outfitAngle);
  renderOutfit();
}));

