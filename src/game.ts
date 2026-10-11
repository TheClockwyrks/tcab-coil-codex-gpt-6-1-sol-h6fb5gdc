import type { Game, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import { renderCoil } from "./render";

export const BACKGROUND = "#080f19";
export interface Snapshot {
  version: number;
  screen: C.Screen;
  menuIndex: number;
  titleIndex: number;
  mode: typeof C.MODE;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: C.Direction;
  turns: readonly C.Direction[];
  snake: readonly C.Cell[];
  pellet: C.Cell | null;
  obstacles: readonly C.Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: C.Cell | null;
}
export interface CoilState extends Snapshot {
  accumulator: number;
  biteAt: number;
  sprites: {
    head: readonly ImageBitmap[];
    body: ImageBitmap;
    corner: ImageBitmap;
    tail: ImageBitmap;
  };
  contacts: Readonly<Record<number, { index: number; screen: C.Screen }>>;
}
type State = DeepReadonly<CoilState>;
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CoilDebugApi {
  version: number;
  reset(s: State): CoilState;
  reconcile(s: State): CoilState;
  snapshot(s: State): Snapshot;
  menuItemRect(s: State, index: number): Rect | null;
  setScreen(s: State, screen: C.Screen): CoilState;
  setMenuIndex(s: State, index: number): CoilState;
  setScore(s: State, points: number): CoilState;
  setBest(s: State, points: number): CoilState;
  setCombo(s: State, multiplier: number): CoilState;
  setComboWindow(s: State, seconds: number): CoilState;
  setSnake(s: State, cells: readonly C.Cell[]): CoilState;
  setDirection(s: State, dir: C.Direction): CoilState;
  clearTurns(s: State): CoilState;
  setSnakeSteering(s: State, enabled: boolean): CoilState;
  setSnakeTravel(s: State, enabled: boolean): CoilState;
  setPellet(s: State, col: number, row: number): CoilState;
  clearPellet(s: State): CoilState;
  setPelletRespawn(s: State, enabled: boolean): CoilState;
  setNextPellet(s: State, col: number, row: number): CoilState;
  drawPelletCell(s: State): C.Cell | null;
}
const same = (a: C.Cell, b: C.Cell) => a.col === b.col && a.row === b.row;
const interior = (c: C.Cell) =>
  Number.isInteger(c.col) &&
  Number.isInteger(c.row) &&
  c.col >= C.INTERIOR_MIN_COL &&
  c.col <= C.INTERIOR_MAX_COL &&
  c.row >= C.INTERIOR_MIN_ROW &&
  c.row <= C.INTERIOR_MAX_ROW;
function requireValue(ok: boolean): void {
  if (!ok) throw new RangeError("Invalid Coil debug argument");
}
const whole = (n: number) => Number.isInteger(n) && n >= 0;
const free = (s: State, c: C.Cell) =>
  interior(c) &&
  !s.snake.some((a) => same(a, c)) &&
  !s.obstacles.some((a) => same(a, c));
export function validCells(s: State): C.Cell[] {
  const cells: C.Cell[] = [];
  for (let row = C.INTERIOR_MIN_ROW; row <= C.INTERIOR_MAX_ROW; row++)
    for (let col = C.INTERIOR_MIN_COL; col <= C.INTERIOR_MAX_COL; col++) {
      const c = { col, row };
      if (free(s, c) && (!s.pellet || !same(s.pellet, c))) cells.push(c);
    }
  return cells;
}
const draw = (s: State) => {
  const cells = validCells(s);
  return cells[Math.floor(Math.random() * cells.length)] ?? null;
};
export function items(screen: C.Screen): readonly string[] {
  switch (screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "paused":
      return C.PAUSE_ITEMS;
    case "gameover":
    case "cleared":
      return C.OVER_ITEMS;
    case "howto":
      return ["BACK"];
    default:
      return [];
  }
}
export function menuItemRect(
  s: Pick<State, "screen">,
  index: number,
): Rect | null {
  requireValue(whole(index));
  if (index >= items(s.screen).length) return null;
  return {
    x: s.screen === "title" ? 252 : 450,
    y:
      (s.screen === "title" ? 430 : s.screen === "howto" ? 606 : 424) +
      index * 64,
    w: 380,
    h: 52,
  };
}
function initial(sprites: CoilState["sprites"], muted = false): CoilState {
  return {
    version: C.COIL_DEBUG_VERSION,
    screen: "title",
    menuIndex: 0,
    titleIndex: 0,
    mode: C.MODE,
    score: 0,
    best: 0,
    combo: 1,
    comboWindow: 0,
    muted,
    ticks: 0,
    simTime: 0,
    dir: C.START_DIR,
    turns: [],
    snake: C.START_CELLS.map((c) => ({ ...c })),
    pellet: null,
    obstacles: [],
    steering: true,
    travel: true,
    pelletRespawn: true,
    nextPellet: null,
    accumulator: 0,
    biteAt: -Infinity,
    sprites,
    contacts: {},
  };
}
export const debug: CoilDebugApi = {
  version: C.COIL_DEBUG_VERSION,
  reset: (s) => initial(s.sprites, s.muted),
  reconcile: (s) => ({ ...s }),
  snapshot: (s) => ({
    version: s.version,
    screen: s.screen,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    mode: s.mode,
    score: s.score,
    best: s.best,
    combo: s.combo,
    comboWindow: s.comboWindow,
    muted: s.muted,
    ticks: s.ticks,
    simTime: s.simTime,
    dir: s.dir,
    turns: [...s.turns],
    snake: s.snake.map((c) => ({ ...c })),
    pellet: s.pellet ? { ...s.pellet } : null,
    obstacles: s.obstacles.map((c) => ({ ...c })),
    steering: s.steering,
    travel: s.travel,
    pelletRespawn: s.pelletRespawn,
    nextPellet: s.nextPellet ? { ...s.nextPellet } : null,
  }),
  menuItemRect,
  setScreen: (s, screen) => {
    requireValue(C.SCREENS.includes(screen));
    return { ...s, screen };
  },
  setMenuIndex: (s, menuIndex) => {
    requireValue(
      whole(menuIndex) &&
        (s.screen === "playing"
          ? menuIndex === 0
          : menuIndex < items(s.screen).length),
    );
    return { ...s, menuIndex };
  },
  setScore: (s, score) => {
    requireValue(whole(score));
    return { ...s, score };
  },
  setBest: (s, best) => {
    requireValue(whole(best));
    return { ...s, best };
  },
  setCombo: (s, combo) => {
    requireValue(whole(combo) && combo >= 1 && combo <= C.COMBO_MAX);
    return { ...s, combo };
  },
  setComboWindow: (s, comboWindow) => {
    requireValue(
      Number.isFinite(comboWindow) &&
        comboWindow >= 0 &&
        comboWindow <= C.COMBO_WINDOW,
    );
    return { ...s, comboWindow };
  },
  setSnake: (s, cells) => {
    requireValue(
      cells.length > 0 &&
        cells.every(
          (c, i) =>
            interior(c) &&
            !s.obstacles.some((o) => same(o, c)) &&
            !cells.slice(0, i).some((o) => same(o, c)) &&
            (i === 0 ||
              Math.abs(c.col - cells[i - 1].col) +
                Math.abs(c.row - cells[i - 1].row) ===
                1),
        ),
    );
    return { ...s, snake: cells.map((c) => ({ ...c })) };
  },
  setDirection: (s, dir) => {
    requireValue(C.DIRECTIONS.includes(dir));
    return { ...s, dir };
  },
  clearTurns: (s) => ({ ...s, turns: [] }),
  setSnakeSteering: (s, steering) => {
    requireValue(typeof steering === "boolean");
    return { ...s, steering, turns: steering ? s.turns : [] };
  },
  setSnakeTravel: (s, travel) => {
    requireValue(typeof travel === "boolean");
    return { ...s, travel };
  },
  setPellet: (s, col, row) => {
    requireValue(free(s, { col, row }));
    return { ...s, pellet: { col, row } };
  },
  clearPellet: (s) => ({ ...s, pellet: null }),
  setPelletRespawn: (s, pelletRespawn) => {
    requireValue(typeof pelletRespawn === "boolean");
    return { ...s, pelletRespawn };
  },
  setNextPellet: (s, col, row) => {
    requireValue(
      whole(col) && whole(row) && col < C.GRID_COLS && row < C.GRID_ROWS,
    );
    return { ...s, nextPellet: { col, row } };
  },
  drawPelletCell: draw,
};
function spawn(s: CoilState): CoilState {
  const valid = validCells(s);
  const pellet =
    s.nextPellet && valid.some((c) => same(c, s.nextPellet!))
      ? s.nextPellet
      : (valid[Math.floor(Math.random() * valid.length)] ?? null);
  return { ...s, pellet, nextPellet: null };
}
function begin(s: CoilState, api: UpdateApi): CoilState {
  api.audio.loop(C.CUES.music);
  return spawn({
    ...s,
    screen: "playing",
    menuIndex: 0,
    score: 0,
    combo: 1,
    comboWindow: 0,
    snake: C.START_CELLS.map((c) => ({ ...c })),
    dir: C.START_DIR,
    turns: [],
    pellet: null,
    obstacles: C.OBSTACLE_CELLS,
    accumulator: 0,
    biteAt: -Infinity,
    contacts: {},
  });
}
function title(s: CoilState, api: UpdateApi): CoilState {
  api.audio.stop(C.CUES.music);
  return { ...s, screen: "title", menuIndex: s.titleIndex, contacts: {} };
}
function confirm(s: CoilState, api: UpdateApi): CoilState {
  switch (s.screen) {
    case "title": {
      const next = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 0
        ? begin(next, api)
        : { ...next, screen: "howto", menuIndex: 0 };
    }
    case "howto":
      return title(s, api);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: "playing", menuIndex: 0 }
        : s.menuIndex === 1
          ? begin(s, api)
          : title(s, api);
    case "gameover":
    case "cleared":
      return s.menuIndex === 0 ? begin(s, api) : title(s, api);
    default:
      return s;
  }
}
const vector: Record<C.Direction, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
export function tick(input: State, api: UpdateApi): CoilState {
  let s: CoilState = { ...input, ticks: input.ticks + 1 };
  if (s.steering && s.turns.length) {
    const turn = s.turns[0];
    s = { ...s, turns: s.turns.slice(1) };
    if ((vector[turn][0] === 0) !== (vector[s.dir][0] === 0))
      s = { ...s, dir: turn };
  }
  if (s.travel) {
    const head = {
      col: s.snake[0].col + vector[s.dir][0],
      row: s.snake[0].row + vector[s.dir][1],
    };
    const eat = !!s.pellet && same(head, s.pellet);
    if (
      !interior(head) ||
      s.obstacles.some((c) => same(c, head)) ||
      s.snake.slice(1, eat ? undefined : -1).some((c) => same(c, head))
    ) {
      api.audio.play(C.CUES.death);
      api.audio.stop(C.CUES.music);
      return { ...s, screen: "gameover", menuIndex: 0 };
    }
    s = { ...s, snake: [head, ...(eat ? s.snake : s.snake.slice(0, -1))] };
    if (eat) {
      const combo = s.comboWindow > 0 ? Math.min(C.COMBO_MAX, s.combo + 1) : 1;
      api.audio.play(C.CUES.eat);
      if (combo > s.combo) api.audio.play(C.CUES.comboUp);
      s = {
        ...s,
        combo,
        score: s.score + C.PELLET_POINTS * combo,
        comboWindow: C.COMBO_WINDOW,
        biteAt: s.simTime,
      };
      if (s.pelletRespawn) {
        s = spawn(s);
        if (!s.pellet) {
          api.audio.stop(C.CUES.music);
          s = { ...s, screen: "cleared", menuIndex: 0 };
        }
      } else s = { ...s, pellet: null };
    }
  }
  const comboWindow = Math.max(0, s.comboWindow - C.TICK_SECONDS);
  return {
    ...s,
    comboWindow,
    combo: comboWindow === 0 ? 1 : s.combo,
    best: Math.max(s.best, s.score),
  };
}
export const game: Game<CoilState, CoilDebugApi> = {
  async initialize(api) {
    for (const action of C.ACTIONS)
      api.input.register(action, { keys: [...C.BINDINGS[action]] });
    const [head, body, corner, tail] = await Promise.all([
      Promise.all(C.SPRITE_PATHS.head.map((p) => api.assets.loadImage(p))),
      api.assets.loadImage(C.SPRITE_PATHS.body),
      api.assets.loadImage(C.SPRITE_PATHS.corner),
      api.assets.loadImage(C.SPRITE_PATHS.tail),
      ...Object.values(C.CUES).map((c) => api.audio.load(c, C.CUE_PATHS[c])),
    ]);
    for (const name of [
      "screen",
      "score",
      "best",
      "combo",
      "comboWindow",
      "dir",
    ] as const)
      api.diagnostics.register(name, (s) => s[name]);
    api.diagnostics.register("length", (s) => s.snake.length);
    api.diagnostics.register(
      "head",
      (s) => `${s.snake[0].col}, ${s.snake[0].row}`,
    );
    api.diagnostics.register("pellet", (s) =>
      s.pellet ? `${s.pellet.col}, ${s.pellet.row}` : "none",
    );
    return [initial({ head, body, corner, tail }), debug];
  },
  update(state, api, dt) {
    let s: CoilState = { ...state };
    const edges = Object.fromEntries(
      C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
    );
    if (edges.mute) api.audio.setMuted(!api.audio.muted());
    s = { ...s, muted: api.audio.muted(), best: Math.max(s.score, s.best) };
    if (s.screen === "playing") {
      if (edges.back || edges.pause)
        s = { ...s, screen: "paused", menuIndex: 0, contacts: {} };
      else if (s.steering)
        for (const d of C.DIRECTIONS)
          if (edges[d] && s.turns.length < C.TURN_QUEUE_MAX)
            s = { ...s, turns: [...s.turns, d] };
    } else {
      const count = items(s.screen).length;
      if (edges.up) s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
      if (edges.down) s = { ...s, menuIndex: (s.menuIndex + 1) % count };
      if (edges.back || (edges.pause && s.screen === "paused")) {
        if (s.screen === "paused")
          s = { ...s, screen: "playing", menuIndex: 0 };
        else if (s.screen !== "title") s = title(s, api);
      } else if (edges.confirm) s = confirm(s, api);
      if (s.screen !== "playing") {
        let contacts = { ...s.contacts };
        for (const sample of api.input.pointerSamples()) {
          if (sample.device !== "touch" && !sample.primary) continue;
          if (sample.type !== "move" && sample.button !== "primary") continue;
          const index = items(s.screen).findIndex((_, i) => {
            const r = menuItemRect(s, i)!;
            return (
              sample.x >= r.x &&
              sample.x < r.x + r.w &&
              sample.y >= r.y &&
              sample.y < r.y + r.h
            );
          });
          if (index >= 0) s = { ...s, menuIndex: index };
          if (sample.type === "down")
            contacts = {
              ...contacts,
              [sample.id]: { index, screen: s.screen },
            };
          if (sample.type === "up") {
            const press = contacts[sample.id];
            delete contacts[sample.id];
            if (
              index >= 0 &&
              press?.index === index &&
              press.screen === s.screen
            )
              s = confirm(s, api);
          }
        }
        s = { ...s, contacts };
      }
    }
    if (s.screen === "playing") {
      s = { ...s, simTime: s.simTime + dt, accumulator: s.accumulator + dt };
      while (s.accumulator + 1e-10 >= C.TICK_SECONDS && s.screen === "playing")
        s = tick(
          { ...s, accumulator: Math.max(0, s.accumulator - C.TICK_SECONDS) },
          api,
        );
    }
    return { ...s, best: Math.max(s.best, s.score) };
  },
  render: renderCoil,
};
