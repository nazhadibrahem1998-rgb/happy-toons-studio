/**
 * Arrive steering, reduced to a scalar speed.
 * From Yuka ArriveBehavior.calculate (MIT).
 * Copyright © 2023 Yuka authors. https://github.com/Mugen87/yuka
 * Licence text: notices/YUKA-MIT.txt
 *
 * Yuka computes speed = min(maxSpeed, distance / deceleration)
 * and zeroes it inside the tolerance so the agent eases to a stop.
 */
export function arriveSpeed(distance, maxSpeed, deceleration = 3, tolerance = 0) {
  if (distance <= tolerance) return 0;
  const speed = distance / deceleration;
  return Math.min(maxSpeed, speed);
}
