/** First to 7 or 11 points. No games, deuce, or tennis labels. */

export function pointTarget(n) {
  return n === 11 ? 11 : 7;
}

export function createScore(target) {
  return {
    goal: pointTarget(target),
    points: [0, 0],
    over: false,
    winner: null,
  };
}

export function addPoint(score, winner) {
  if (winner !== 0 && winner !== 1) throw new Error('winner must be 0 or 1');
  if (score.over) return { type: 'over', winner: score.winner };
  score.points[winner] += 1;
  if (score.points[winner] >= score.goal) {
    score.over = true;
    score.winner = winner;
    return { type: 'match', winner };
  }
  return { type: 'point', winner };
}
