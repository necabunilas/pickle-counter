// Pickleball scoring engine — pure functions, no UI.
// State shape:
//   {
//     mode: 'doubles' | 'singles',
//     score: [teamA, teamB],
//     serverTeam: 0 | 1,
//     serverNum: 1 | 2,          // doubles only meaningful; opens at 2
//     positions: [[rightA,leftA],[rightB,leftB]],  // player names by court side
//     over: bool,
//     winner: 0 | 1 | null,
//   }

export const DEFAULT_NAMES = { A: ['A1', 'A2'], B: ['B1', 'B2'] };

export function buildPositions(names = DEFAULT_NAMES) {
  return [
    [names.A[0], names.A[1]],
    [names.B[0], names.B[1]],
  ];
}

export function createGame({ mode = 'doubles', names = DEFAULT_NAMES } = {}) {
  return {
    mode,
    score: [0, 0],
    serverTeam: 0,
    // In doubles the first serving team gets only ONE server, so the game
    // opens at "server 2" — a single fault hands the ball straight over.
    serverNum: mode === 'singles' ? 1 : 2,
    // The opening server is *called* "2" but physically behaves like a first
    // server (serves from the right on an even score). This flag captures that
    // quirk and is cleared at the first side-out.
    isOpening: mode !== 'singles',
    positions: buildPositions(names),
    over: false,
    winner: null,
  };
}

const clone = (s) => ({
  ...s,
  score: [...s.score],
  positions: [[...s.positions[0]], [...s.positions[1]]],
});

// Court index of the current server within their team: 0 = right, 1 = left.
// Server 1 always serves from the side matching their score's parity
// (even -> right). After server 1 faults, server 2 serves from the opposite
// court without the team switching sides.
export function serverIndex(state) {
  const base = state.score[state.serverTeam] % 2 === 0 ? 0 : 1;
  if (state.mode === 'singles') return base;
  const effectiveNum = state.isOpening ? 1 : state.serverNum;
  return effectiveNum === 1 ? base : 1 - base;
}

export function serverName(state) {
  return state.positions[state.serverTeam][serverIndex(state)];
}

// Receiver is diagonally across from the server.
export function receiverName(state) {
  const idx = serverIndex(state);
  return state.positions[1 - state.serverTeam][1 - idx];
}

export function serveSide(state) {
  return serverIndex(state) === 0 ? 'Right' : 'Left';
}

// The official call: serverScore – receiverScore [– serverNum in doubles].
export function scoreCall(state) {
  const sv = state.serverTeam;
  const server = state.score[sv];
  const recv = state.score[1 - sv];
  return state.mode === 'singles'
    ? `${server} – ${recv}`
    : `${server} – ${recv} – ${state.serverNum}`;
}

function sideOut(s) {
  if (s.mode === 'singles') {
    s.serverTeam = 1 - s.serverTeam;
    return;
  }
  if (s.isOpening) {
    // Opening turn has a single server: one fault ends it immediately.
    s.serverTeam = 1 - s.serverTeam;
    s.serverNum = 1;
    s.isOpening = false;
  } else if (s.serverNum === 1) {
    s.serverNum = 2;
  } else {
    s.serverTeam = 1 - s.serverTeam;
    s.serverNum = 1;
  }
}

function applyWin(s, { target = 11, winBy2 = true }) {
  const [a, b] = s.score;
  const top = Math.max(a, b);
  const lead = Math.abs(a - b);
  if (top >= target && (!winBy2 || lead >= 2)) {
    s.over = true;
    s.winner = a > b ? 0 : 1;
  }
}

// A team wins a rally. Only the serving team can score; if the receiving
// team wins the rally it's a side-out / fault instead.
export function rallyWonBy(state, team, settings = {}) {
  if (state.over) return state;
  const s = clone(state);
  if (team === s.serverTeam) {
    s.score[team]++;
    const p = s.positions[team];
    [p[0], p[1]] = [p[1], p[0]]; // serving team swaps sides after a point
    applyWin(s, settings);
  } else {
    sideOut(s);
  }
  return s;
}

// Serving team faults (or you just want to hand over serve).
export function fault(state) {
  if (state.over) return state;
  const s = clone(state);
  sideOut(s);
  return s;
}