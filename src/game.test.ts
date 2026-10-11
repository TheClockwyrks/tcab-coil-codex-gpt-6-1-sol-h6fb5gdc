import { describe, expect, it, vi } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { debug, game, type CoilState, menuItemRect } from "./game";
import * as C from "./constants";

async function fixture() {
  const cues: string[] = [];
  let muted = false;
  const loops = new Set<string>();
  let edges: string[] = [];
  const api = {
    input: {
      pressed: (a: string) => edges.includes(a),
      pointerSamples: () => [],
    },
    audio: {
      play: (c: string) => cues.push(c),
      loop: (c: string) => loops.add(c),
      stop: (c: string) => loops.delete(c),
      muted: () => muted,
      setMuted: (v: boolean) => {
        muted = v;
      },
    },
  } as unknown as UpdateApi;
  const init = {
    input: { register: vi.fn() },
    audio: { load: vi.fn() },
    assets: { loadImage: vi.fn().mockResolvedValue({}) },
    diagnostics: { register: vi.fn() },
  } as unknown as InitApi<CoilState>;
  const [start] = await game.initialize(init);
  return {
    start,
    api,
    cues,
    loops,
    step: (s: CoilState, dt = 0.125, actions: string[] = []) => {
      edges = actions;
      return game.update(s, api, dt);
    },
  };
}
describe("Coil fixed tick", () => {
  it("opens on title, starts the canonical chain and preserves time across rounds", async () => {
    const f = await fixture();
    expect(debug.snapshot(f.start)).toMatchObject({
      screen: "title",
      score: 0,
      pellet: null,
      combo: 1,
      steering: true,
    });
    const s = f.step(f.start, 0, ["confirm"]);
    expect(s.snake).toEqual(C.START_CELLS);
    expect(s.pellet).not.toBeNull();
    expect(f.loops.has("music")).toBe(true);
    const next = f.step(s, 0.3);
    expect(next.ticks).toBe(2);
    expect(next.snake[0]).toEqual({ col: 17, row: 8 });
    expect(next.accumulator).toBeCloseTo(0.05);
    expect(s.snake).toEqual(C.START_CELLS);
  });
  it("buffers two requests and consumes invalid reversals one per tick", async () => {
    const f = await fixture();
    let s = debug.setScreen(f.start, "playing");
    s = f.step(s, 0, ["down", "left", "up"]);
    expect(s.turns).toHaveLength(2);
    s = f.step(s);
    expect(s.dir).toBe("up");
    s = f.step(s);
    expect(s.dir).toBe("up");
    expect(s.dir).toBe("up");
  });
  it("scores, grows, raises the combo and lapses after 28 ticks", async () => {
    const f = await fixture();
    let s = debug.setScreen(f.start, "playing");
    s = debug.setPelletRespawn(s, false);
    s = debug.setPellet(s, 16, 8);
    s = f.step(s);
    expect(s.score).toBe(10);
    expect(s.snake).toHaveLength(4);
    expect(s.comboWindow).toBe(3.375);
    s = debug.setPellet(s, 17, 8);
    s = f.step(s);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(2);
    expect(f.cues).toEqual(["eat", "eat", "combo-up"]);
    s = debug.setSnakeTravel(s, false);
    s = f.step(s, 27 * 0.125);
    expect(s.combo).toBe(1);
    expect(s.comboWindow).toBe(0);
    expect(s.best).toBe(30);
  });
  it("freezes the chain, bite and accumulator while paused, and resumes", async () => {
    const f = await fixture();
    let s = debug.setScreen(f.start, "playing");
    s = f.step(s, 0.05);
    s = f.step(s, 0, ["pause"]);
    const before = debug.snapshot(s);
    s = f.step(s, 10);
    expect(debug.snapshot(s)).toEqual(before);
    expect(s.accumulator).toBe(0.05);
    s = f.step(s, 0.075, ["pause"]);
    expect(s.ticks).toBe(1);
  });
  it("allows chasing a vacating tail but kills a body collision without moving", async () => {
    const f = await fixture();
    let s = debug.setScreen(f.start, "playing");
    s = debug.setSnake(s, [
      { col: 4, row: 4 },
      { col: 4, row: 5 },
      { col: 3, row: 5 },
      { col: 3, row: 4 },
    ]);
    s = debug.setDirection(s, "left");
    s = f.step(s);
    expect(s.screen).toBe("playing");
    expect(s.snake[0]).toEqual({ col: 3, row: 4 });
    s = debug.setDirection(s, "right");
    const chain = s.snake;
    s = f.step(s);
    expect(s.screen).toBe("gameover");
    expect(s.snake).toEqual(chain);
    expect(f.cues).toContain("death");
  });
  it("consumes a posed spawn and does not consume it with respawn disabled", async () => {
    const f = await fixture();
    let s = debug.setNextPellet(f.start, 20, 9);
    s = f.step(s, 0, ["confirm"]);
    expect(s.pellet).toEqual({ col: 20, row: 9 });
    expect(s.nextPellet).toBeNull();
    s = debug.setNextPellet(s, 22, 9);
    s = debug.setPelletRespawn(s, false);
    s = debug.setPellet(s, 16, 8);
    s = f.step(s);
    expect(s.nextPellet).toEqual({ col: 22, row: 9 });
    expect(s.pellet).toBeNull();
  });
  it("remembers the title selection and mirrors mute on every screen", async () => {
    const f = await fixture();
    let s = f.step(f.start, 0, ["down", "confirm"]);
    expect(s.screen).toBe("howto");
    expect(s.titleIndex).toBe(1);
    s = f.step(s, 0, ["back", "mute"]);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(1);
    expect(s.muted).toBe(true);
    expect(debug.reset(s).muted).toBe(true);
  });
  it("rejects invalid poses and returns independent snapshots", async () => {
    const f = await fixture();
    expect(() => debug.setScore(f.start, -1)).toThrow();
    expect(() => debug.setCombo(f.start, 6)).toThrow();
    expect(() => debug.setSnake(f.start, [])).toThrow();
    expect(() => debug.setPellet(f.start, 15, 8)).toThrow();
    expect(() => debug.setNextPellet(f.start, 30, 2)).toThrow();
    expect(menuItemRect(f.start, 2)).toBeNull();
    expect(menuItemRect({ ...f.start, screen: "playing" }, 0)).toBeNull();
    expect(debug.reconcile(f.start)).toEqual(f.start);
    const copy = debug.snapshot(f.start);
    expect(copy.snake).not.toBe(f.start.snake);
  });
  it("clears a completely filled board and stops its bed", async () => {
    const f = await fixture();
    const cells = [];
    for (let row = 1; row <= 16; row++) {
      for (let n = 1; n <= 28; n++) {
        const col = row % 2 ? n : 29 - n;
        if (col !== 1 || row !== 1) cells.push({ col, row });
      }
    }
    let s = debug.setScreen(f.start, "playing");
    s = debug.setSnake(s, cells);
    s = debug.setDirection(s, "left");
    s = debug.setPellet(s, 1, 1);
    s = f.step(s);
    expect(s.screen).toBe("cleared");
    expect(s.snake).toHaveLength(448);
    expect(s.pellet).toBeNull();
    expect(debug.drawPelletCell(s)).toBeNull();
    expect(f.cues).toEqual(["eat"]);
  });
  it("drains combo while travel is disabled and ignores steering while it is disabled", async () => {
    const f = await fixture();
    let s = debug.setScreen(f.start, "playing");
    s = debug.setSnakeSteering(s, false);
    s = debug.setSnakeTravel(s, false);
    s = debug.setCombo(s, 5);
    s = debug.setComboWindow(s, 0.125);
    s = f.step(s, 0.125, ["up"]);
    expect(s.snake).toEqual(C.START_CELLS);
    expect(s.dir).toBe("right");
    expect(s.turns).toEqual([]);
    expect(s.combo).toBe(1);
    expect(s.ticks).toBe(1);
  });
  it("accepts same-frame pointer edges and refuses edges in different items", async () => {
    const f = await fixture();
    const sample = (type: "down" | "up", y: number) => ({
      type,
      x: 400,
      y,
      id: 1,
      primary: true,
      device: "touch" as const,
      button: "primary" as const,
      buttons: [],
    });
    const api = {
      ...f.api,
      input: {
        ...f.api.input,
        pointerSamples: () => [sample("down", 450), sample("up", 520)],
      },
    };
    let s = game.update(f.start, api, 0);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(1);
    s = game.update(
      s,
      {
        ...api,
        input: {
          ...api.input,
          pointerSamples: () => [sample("down", 520), sample("up", 520)],
        },
      },
      0,
    );
    expect(s.screen).toBe("howto");
    expect(s.titleIndex).toBe(1);
  });
  it("stops music when leaving a paused round and starts a fresh round on restart", async () => {
    const f = await fixture();
    let s = f.step(f.start, 0, ["confirm"]);
    s = f.step(s, 0, ["pause"]);
    expect(f.loops.has("music")).toBe(true);
    s = debug.setMenuIndex(s, 1);
    s = f.step(s, 0, ["confirm"]);
    expect(s.screen).toBe("playing");
    expect(s.score).toBe(0);
    s = f.step(s, 0, ["pause"]);
    s = debug.setMenuIndex(s, 2);
    s = f.step(s, 0, ["confirm"]);
    expect(s.screen).toBe("title");
    expect(f.loops.has("music")).toBe(false);
  });
});
