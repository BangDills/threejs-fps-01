// Input tracking: Pointer Lock, mouse delta accumulation, and keyboard state for Vanguard Depot.
export function createInput(domElement, onLockChange) {
  const keys = new Set();
  let lookX = 0;
  let lookY = 0;
  let firing = false;
  let aimingDownSights = false;
  let isLocked = false;

  function onMouseMove(e) {
    if (document.pointerLockElement === domElement) {
      lookX += e.movementX || 0;
      lookY += e.movementY || 0;
    }
  }

  function onMouseDown(e) {
    if (document.pointerLockElement !== domElement) {
      domElement.requestPointerLock();
      return;
    }
    if (e.button === 0) firing = true;
    if (e.button === 2) aimingDownSights = true;
  }

  function onMouseUp(e) {
    if (e.button === 0) firing = false;
    if (e.button === 2) aimingDownSights = false;
  }

  function onKeyDown(e) {
    keys.add(e.code);
    if (e.code === 'Tab') {
      e.preventDefault(); // Prevent focus switching
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onPointerLockChange() {
    isLocked = document.pointerLockElement === domElement;
    if (!isLocked) {
      firing = false;
      aimingDownSights = false;
      keys.clear();
    }
    if (onLockChange) onLockChange(isLocked);
  }

  // Prevent context menu on right click (ADS)
  function onContextMenu(e) {
    e.preventDefault();
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  function requestLock() {
    try {
      domElement.requestPointerLock();
    } catch {}
  }

  function exitLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {}
  }

  function takeLook() {
    const x = lookX;
    const y = lookY;
    lookX = 0;
    lookY = 0;
    return { x, y };
  }

  return {
    state: {
      keys,
      get firing() { return firing; },
      get ads() { return aimingDownSights; },
      get locked() { return isLocked; },
    },
    takeLook,
    requestLock,
    exitLock,
  };
}
