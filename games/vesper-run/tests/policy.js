export function decide(sensors, hold, player) {
  const inp = {
    left: false,
    right: true,
    run: true,
    jumpHeld: false,
    jumpPressed: false,
    runPressed: false,
  };
  if (hold.t > 0) {
    hold.t -= 1;
    inp.jumpHeld = true;
  }
  if (sensors.waitForMover && !sensors.moverReady) {
    inp.right = false;
    inp.run = false;
  }
  if (sensors.rideHold) {
    inp.right = false;
    inp.run = false;
    const vx = player ? player.vx : 0;
    if (sensors.rideBack || vx > 80) inp.left = true;
    else if (vx < -40) inp.right = true;
  }
  const want = sensors.grounded
    && hold.t === 0
    && !sensors.waitForMover
    && !sensors.rideHold
    && !sensors.moverReady
    && (sensors.gapAhead || sensors.wallAhead || sensors.enemyAhead || sensors.hazardAhead || sensors.bossStomp);
  if (want) {
    inp.jumpPressed = true;
    inp.jumpHeld = true;
    const short = sensors.bossStomp || (sensors.wallAhead && !sensors.gapAhead && !sensors.hazardAhead && !sensors.enemyAhead);
    hold.t = short ? 9 : 16;
  }
  return inp;
}
