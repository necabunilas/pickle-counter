import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  Modal,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useFonts, Bangers_400Regular } from '@expo-google-fonts/bangers';
import {
  createGame,
  buildPositions,
  rallyWonBy,
  fault as faultGame,
  serverIndex,
  serverName,
  receiverName,
  serveSide,
} from './scoring';

// PickleCounter palette — neon-on-space
const C = {
  bg: '#05060c',      // near-black space
  panel: '#191333',   // deep purple panels
  line: '#2e2550',
  muted: '#9d8ec4',
  text: '#f3eefc',
  serve: '#a6e22e',   // accent green (serve / win)
  teamA: '#6fd2e6',   // team A cyan
  teamB: '#f4d35e',   // team B yellow
  good: '#a6e22e',
  danger: '#ff6b6b',  // reset / destructive
};

export default function App() {
  const [mode, setMode] = useState('doubles');
  const [target, setTarget] = useState('11');
  const [winBy2, setWinBy2] = useState(true);
  const [showNames, setShowNames] = useState(false);
  const [namesA, setNamesA] = useState(['', '']);
  const [namesB, setNamesB] = useState(['', '']);

  const names = useMemo(
    () => ({
      A: [namesA[0] || 'A1', namesA[1] || 'A2'],
      B: [namesB[0] || 'B1', namesB[1] || 'B2'],
    }),
    [namesA, namesB]
  );

  const [game, setGame] = useState(() => createGame({ mode, names }));
  const [history, setHistory] = useState([]);
  const [fontsLoaded] = useFonts({ Bangers_400Regular });

  const settings = { target: parseInt(target, 10) || 11, winBy2 };
  const single = game.mode === 'singles';

  function push(next) {
    setHistory((h) => [...h, game]);
    setGame(next);
  }

  function reset(newMode = game.mode) {
    setHistory([]);
    setGame(createGame({ mode: newMode, names }));
  }

  function pickMode(m) {
    setMode(m);
    reset(m);
  }

  function score(team) {
    push(rallyWonBy(game, team, settings));
  }

  function doFault() {
    push(faultGame(game));
  }

  function undo() {
    if (!history.length) return;
    setGame(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }

  // Re-seed positions when names change (orientation resets, score is kept).
  function editName(team, i, value) {
    const setter = team === 0 ? setNamesA : setNamesB;
    const cur = team === 0 ? namesA : namesB;
    const nextArr = [...cur];
    nextArr[i] = value;
    setter(nextArr);
    const merged = {
      A: team === 0 ? [nextArr[0] || 'A1', nextArr[1] || 'A2'] : names.A,
      B: team === 1 ? [nextArr[0] || 'B1', nextArr[1] || 'B2'] : names.B,
    };
    setGame((g) => ({ ...g, positions: buildPositions(merged) }));
  }

  const sv = game.serverTeam;
  const idx = serverIndex(game);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Starfield />

      {/* Header */}
      <View style={s.header}>
        <View style={s.brand}>
          <Image source={require('./assets/pickle-mark.png')} style={s.brandIcon} resizeMode="contain" />
          <Text style={s.title}>
            Pickle<Text style={{ color: C.serve }}>Counter</Text>
          </Text>
        </View>
        <View style={s.modeToggle}>
          <Pill label="Doubles" active={mode === 'doubles'} onPress={() => pickMode('doubles')} />
          <Pill label="Singles" active={mode === 'singles'} onPress={() => pickMode('singles')} />
        </View>
      </View>

      {/* Settings */}
      <View style={s.settings}>
        <View style={s.setItem}>
          <Text style={s.setLabel}>Game to</Text>
          <TextInput
            style={s.numInput}
            keyboardType="number-pad"
            value={target}
            onChangeText={setTarget}
            maxLength={2}
          />
        </View>
        <View style={s.setItem}>
          <Text style={s.setLabel}>Win by 2</Text>
          <Switch value={winBy2} onValueChange={setWinBy2} trackColor={{ true: C.good }} />
        </View>
        <View style={s.setItem}>
          <Text style={s.setLabel}>Names</Text>
          <Switch value={showNames} onValueChange={setShowNames} trackColor={{ true: C.serve }} />
        </View>
      </View>

      {showNames && (
        <View style={s.nameRow}>
          <View style={s.nameCol}>
            <NameField value={namesA[0]} ph="Team A · Player 1" onChange={(v) => editName(0, 0, v)} />
            {!single && (
              <NameField value={namesA[1]} ph="Team A · Player 2" onChange={(v) => editName(0, 1, v)} />
            )}
          </View>
          <View style={s.nameCol}>
            <NameField value={namesB[0]} ph="Team B · Player 1" onChange={(v) => editName(1, 0, v)} />
            {!single && (
              <NameField value={namesB[1]} ph="Team B · Player 2" onChange={(v) => editName(1, 1, v)} />
            )}
          </View>
        </View>
      )}

      {/* Score call */}
      <View style={s.callbar}>
        <Text style={s.scoreCall}>
          <Text style={{ color: C.serve }}>{game.score[sv]}</Text>
          {`  –  ${game.score[1 - sv]}`}
          {!single ? `  –  ${game.serverNum}` : ''}
        </Text>
        <Text style={s.serveInfo}>
          {single ? (
            <>
              <Text style={s.hl}>{serverName(game)}</Text> serving from the{' '}
              <Text style={s.hl}>{serveSide(game)}</Text> court
            </>
          ) : (
            <>
              <Text style={s.hl}>{serverName(game)}</Text> ({sv === 0 ? 'Team A' : 'Team B'}, server{' '}
              {game.serverNum}) from <Text style={s.hl}>{serveSide(game)}</Text> · receiver{' '}
              <Text style={s.hl}>{receiverName(game)}</Text>
            </>
          )}
        </Text>
      </View>

      {/* Teams */}
      <View style={s.teams}>
        <TeamPanel
          name="TEAM A"
          color={C.teamA}
          points={game.score[0]}
          serving={sv === 0}
          positions={game.positions[0]}
          serverHere={sv === 0 ? idx : -1}
          single={single}
          soloName={names.A[0]}
          onPress={() => score(0)}
        />
        <TeamPanel
          name="TEAM B"
          color={C.teamB}
          points={game.score[1]}
          serving={sv === 1}
          positions={game.positions[1]}
          serverHere={sv === 1 ? idx : -1}
          single={single}
          soloName={names.B[0]}
          onPress={() => score(1)}
        />
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Ctrl label="Fault / Side-out" onPress={doFault} />
        <Ctrl label="↶ Undo" onPress={undo} disabled={!history.length} />
        <Ctrl label="Reset" danger onPress={() => reset()} />
      </View>

      {/* Winner overlay */}
      <Modal visible={game.over} transparent animationType="fade">
        <View style={s.overlay}>
          <Text style={s.trophy}>🏆 Game!</Text>
          <Text style={s.winText}>
            {single
              ? game.winner === 0
                ? names.A[0]
                : names.B[0]
              : game.winner === 0
              ? `Team A (${names.A[0]} & ${names.A[1]})`
              : `Team B (${names.B[0]} & ${names.B[1]})`}{' '}
            wins {game.score[0]} – {game.score[1]}
          </Text>
          <Pressable style={s.playAgain} onPress={() => reset()}>
            <Text style={s.playAgainText}>New Game</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Starfield() {
  const stars = useMemo(() => {
    const palette = ['#ffffff', '#ffffff', '#ffffff', '#cfd8ff', '#a6e22e', '#6fd2e6', '#f4d35e'];
    return Array.from({ length: 110 }, () => {
      const size = Math.random() * 2.4 + 0.8;
      return {
        top: Math.random() * 100,
        left: Math.random() * 100,
        size,
        opacity: Math.random() * 0.7 + 0.2,
        color: palette[Math.floor(Math.random() * palette.length)],
      };
    });
  }, []);

  return (
    <View pointerEvents="none" style={s.starfield}>
      {stars.map((st, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: `${st.top}%`,
            left: `${st.left}%`,
            width: st.size,
            height: st.size,
            borderRadius: st.size / 2,
            backgroundColor: st.color,
            opacity: st.opacity,
          }}
        />
      ))}
    </View>
  );
}

function Pill({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active && s.pillActive]}>
      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NameField({ value, ph, onChange }) {
  return (
    <TextInput
      style={s.nameInput}
      value={value}
      placeholder={ph}
      placeholderTextColor={C.muted}
      onChangeText={onChange}
    />
  );
}

function Ctrl({ label, onPress, danger, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.ctrl, disabled && { opacity: 0.4 }]}>
      <Text style={[s.ctrlText, danger && { color: C.danger }]}>{label}</Text>
    </Pressable>
  );
}

function TeamPanel({ name, color, points, serving, positions, serverHere, single, soloName, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.team,
        { borderColor: serving ? C.serve : color + '55' },
        serving && s.teamGlow,
      ]}
    >
      {serving && <View style={s.serveDot} />}
      <Text style={[s.teamLabel, { color }]}>{name}</Text>
      <Text style={[s.pts, { color }]}>{points}</Text>
      <View style={s.playersBox}>
        {single ? (
          <Text style={[s.player, serving && s.playerServer]}>
            {serving ? '▸ ' : ''}
            {soloName}
          </Text>
        ) : (
          <>
            <Text style={s.player}>
              <Text style={serverHere === 1 ? s.playerServer : undefined}>
                {serverHere === 1 ? '▸' : ''}
                {positions[1]}
              </Text>
              {'   |   '}
              <Text style={serverHere === 0 ? s.playerServer : undefined}>
                {serverHere === 0 ? '▸' : ''}
                {positions[0]}
              </Text>
            </Text>
            <Text style={s.courtHint}>left      right</Text>
          </>
        )}
      </View>
      <Text style={s.tapHint}>tap to score</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  starfield: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 30, height: 40 },
  title: { color: C.text, fontSize: 24, fontFamily: 'Bangers_400Regular', letterSpacing: 1.5, paddingRight: 4 },
  modeToggle: { flexDirection: 'row', gap: 6 },
  pill: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: C.serve, borderColor: C.serve },
  pillText: { color: C.muted, fontSize: 15, fontFamily: 'Bangers_400Regular', letterSpacing: 1 },
  pillTextActive: { color: '#1a1a1a' },

  settings: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 18,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  setItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setLabel: { color: C.muted, fontSize: 13 },
  numInput: {
    width: 46,
    backgroundColor: C.panel,
    color: C.text,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    textAlign: 'center',
  },

  nameRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  nameCol: { flex: 1, gap: 6 },
  nameInput: {
    backgroundColor: C.panel,
    color: C.text,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },

  callbar: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  scoreCall: { color: C.text, fontSize: 50, fontFamily: 'Bangers_400Regular', letterSpacing: 3 },
  serveInfo: { color: C.muted, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
  hl: { color: C.serve, fontWeight: '700' },

  teams: { flex: 1, flexDirection: 'row', gap: 10, padding: 12 },
  team: {
    flex: 1,
    backgroundColor: C.panel,
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  teamGlow: {
    borderColor: C.serve,
    shadowColor: C.serve,
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  serveDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.serve,
  },
  teamLabel: { fontSize: 19, fontFamily: 'Bangers_400Regular', letterSpacing: 1 },
  pts: {
    color: C.text,
    fontSize: 108,
    fontFamily: 'Bangers_400Regular',
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
  playersBox: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  player: { color: C.muted, fontSize: 14, textAlign: 'center' },
  playerServer: { color: C.serve, fontWeight: '700' },
  courtHint: { color: C.muted, opacity: 0.6, fontSize: 11, marginTop: 2 },
  tapHint: { color: C.muted, opacity: 0.7, fontSize: 11, marginTop: 6 },

  controls: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 16 },
  ctrl: {
    flex: 1,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctrlText: { color: C.text, fontSize: 17, fontFamily: 'Bangers_400Regular', letterSpacing: 0.5 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  trophy: { color: C.text, fontSize: 46, fontFamily: 'Bangers_400Regular', letterSpacing: 1 },
  winText: { color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  playAgain: { backgroundColor: C.good, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16 },
  playAgainText: { color: '#06240f', fontSize: 22, fontFamily: 'Bangers_400Regular', letterSpacing: 1 },
});