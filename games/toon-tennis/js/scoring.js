/**
 * Simple tennis scoring: 0 / 15 / 30 / 40, deuce, advantage.
 * A match is first to `gamesToWin` games (3 or 5). Games are not win-by-two.
 * Points inside a game are win-by-two once both players have reached 40.
 */

export function gamesTarget(n) {
  return n === 5 ? 5 : 3;
}

export function createScore(gamesToWin) {
  return {
    gamesToWin: gamesTarget(gamesToWin),
    games: [0, 0],
    points: [0, 0],
    server: 0,
    over: false,
    winner: null,
  };
}

/** @returns {[string, string]} labels for [player0, player1] */
export function scoreNames(score) {
  const a = score.points[0];
  const b = score.points[1];
  if (a >= 3 && b >= 3) {
    if (a === b) return ['deuce', 'deuce'];
    if (a > b) return ['adv', '40'];
    return ['40', 'adv'];
  }
  const label = (n) => ['0', '15', '30', '40'][Math.min(n, 3)];
  return [label(a), label(b)];
}

/**
 * Even number of points played so far → deuce court (server's right).
 * Odd → advantage court (server's left).
 */
export function serveCourt(score) {
  return (score.points[0] + score.points[1]) % 2 === 0 ? 'deuce' : 'ad';
}

/**
 * Award a point. Returns
 * { type: 'point'|'deuce'|'adv'|'game'|'match'|'over', winner }
 */
export function addPoint(score, winner) {
  if (winner !== 0 && winner !== 1) throw new Error('winner must be 0 or 1');
  if (score.over) return { type: 'over', winner: score.winner };
  score.points[winner] += 1;
  const a = score.points[0];
  const b = score.points[1];
  const lead = Math.abs(a - b);
  const max = Math.max(a, b);
  if (max >= 4 && lead >= 2) {
    score.games[winner] += 1;
    score.points[0] = 0;
    score.points[1] = 0;
    score.server = score.server === 0 ? 1 : 0;
    if (score.games[winner] >= score.gamesToWin) {
      score.over = true;
      score.winner = winner;
      return { type: 'match', winner };
    }
    return { type: 'game', winner };
  }
  if (a >= 3 && b >= 3 && a === b) return { type: 'deuce', winner };
  if (a >= 3 && b >= 3 && lead === 1) return { type: 'adv', winner: a > b ? 0 : 1 };
  return { type: 'point', winner };
}
