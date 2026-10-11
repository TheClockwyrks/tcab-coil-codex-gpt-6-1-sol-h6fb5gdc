import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CoilState } from "./game";
import { items, menuItemRect } from "./game";
import * as C from "./constants";
const mint = "#a2ffce",
  muted = "#69878d",
  amber = "#ffbc6b";
export function renderCoil(s: DeepReadonly<CoilState>, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.imageSmoothingEnabled = false;
  const text = (
    copy: string,
    x: number,
    y: number,
    size = 16,
    color = muted,
    align: CanvasTextAlign = "left",
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${size >= 40 ? "bold " : ""}${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(copy, x, y);
  };
  const line = (
    x: number,
    y: number,
    x2: number,
    y2: number,
    color: string,
  ) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  box(0, 0, C.STAGE_W, C.STAGE_H, "#080f19");
  text("C / 01", 42, 47, 15, mint);
  text("COIL", 160, 40, 19, mint);
  text("NEON GRID SYSTEM", 1120, 40, 12, muted, "right");
  line(160, 53, 1120, 53, "#234044");
  text(C.SCORE_LABEL, 160, 77, 12);
  text(String(s.score).padStart(4, "0"), 160, 106, 27, mint);
  text(C.BEST_LABEL, 350, 77, 12);
  text(String(s.best).padStart(4, "0"), 350, 106, 27, "#dce9eb");
  if (s.combo >= 2) {
    text(`x${s.combo}`, 610, 94, 30, amber);
    box(680, 79, 150, 6, "#293431");
    box(680, 79, (150 * s.comboWindow) / C.COMBO_WINDOW, 6, amber);
    text("CHAIN WINDOW", 680, 106, 11, amber);
  }
  text(C.MODE_LABEL, 930, 82, 16, mint);
  text(
    s.muted ? "M / MUTED" : "M / SOUND ON",
    1120,
    107,
    12,
    s.muted ? amber : muted,
    "right",
  );
  box(
    C.BOARD_X,
    C.BOARD_Y,
    C.GRID_COLS * C.CELL,
    C.GRID_ROWS * C.CELL,
    "#0c1922",
  );
  for (let row = 0; row < C.GRID_ROWS; row++)
    for (let col = 0; col < C.GRID_COLS; col++) {
      const x = C.BOARD_X + col * C.CELL,
        y = C.BOARD_Y + row * C.CELL;
      if (
        row === 0 ||
        col === 0 ||
        row === C.GRID_ROWS - 1 ||
        col === C.GRID_COLS - 1
      ) {
        box(x + 1, y + 1, 30, 30, "#162c34");
        line(x + 7, y + 16, x + 25, y + 16, "#31595c");
        box(x + 14, y + 14, 4, 4, "#54817b");
      } else {
        ctx.strokeStyle = "#172931";
        ctx.strokeRect(x + 0.5, y + 0.5, 32, 32);
        box(x + 15, y + 15, 1, 1, "#264047");
      }
    }
  ctx.strokeStyle = "#426760";
  ctx.strokeRect(C.BOARD_X + 0.5, C.BOARD_Y + 0.5, 959, 575);
  for (const o of s.obstacles) {
    box(
      C.BOARD_X + o.col * C.CELL + 2,
      C.BOARD_Y + o.row * C.CELL + 2,
      28,
      28,
      "#65425a",
    );
  }
  if (s.pellet) {
    const x = C.BOARD_X + s.pellet.col * C.CELL + 16,
      y = C.BOARD_Y + s.pellet.row * C.CELL + 16;
    ctx.save();
    ctx.shadowColor = amber;
    ctx.shadowBlur = 14;
    ctx.fillStyle = amber;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    box(x - 2, y - 5, 3, 5, "#fff4cc");
    ctx.strokeStyle = "#9c7844";
    ctx.strokeRect(x - 13, y - 13, 26, 26);
    ctx.restore();
  }
  const angle = (a: C.Cell, b: C.Cell) =>
    Math.atan2(b.row - a.row, b.col - a.col);
  for (let i = s.snake.length - 1; i >= 0; i--) {
    const c = s.snake[i];
    let image = s.sprites.body,
      rotation = 0;
    if (i === 0) {
      const elapsed = s.simTime - s.biteAt;
      const frame =
        elapsed >= 0 && elapsed < C.BITE_SECONDS
          ? Math.min(
              C.HEAD_FRAMES - 1,
              1 + Math.floor(elapsed / (C.BITE_SECONDS / 3)),
            )
          : 0;
      image = s.sprites.head[frame];
      rotation = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      }[s.dir];
    } else if (i === s.snake.length - 1) {
      image = s.sprites.tail;
      rotation = angle(c, s.snake[i - 1]);
    } else {
      const a = s.snake[i - 1],
        b = s.snake[i + 1];
      if (a.col === b.col) rotation = Math.PI / 2;
      else if (a.row !== b.row) {
        image = s.sprites.corner;
        const dirs = [angle(c, a), angle(c, b)].map(
          (v) => (Math.round(v / (Math.PI / 2)) + 4) % 4,
        );
        rotation =
          (([0, 1, 2, 3].find(
            (r) => dirs.includes(r) && dirs.includes((r + 1) % 4),
          ) ?? 0) *
            Math.PI) /
          2;
      }
    }
    ctx.save();
    ctx.translate(
      C.BOARD_X + c.col * C.CELL + 16,
      C.BOARD_Y + c.row * C.CELL + 16,
    );
    ctx.rotate(rotation);
    ctx.drawImage(image, -16, -16, C.CELL, C.CELL);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(61, 590);
  ctx.rotate(-Math.PI / 2);
  text("KEEP THE CIRCUIT ALIVE", 0, 0, 12);
  ctx.restore();
  text("08", 1190, 163, 25, mint, "center");
  text("HZ", 1190, 184, 12, muted, "center");
  if (s.screen === "playing") {
    text("P / PAUSE", 1190, 650, 11, muted, "center");
    return;
  }
  box(192, 152, 896, 512, "#080f19d9");
  if (s.screen === "title") {
    text("01 / CLASSIC ARCADE", 252, 217, 13, amber);
    text(C.TITLE_TEXT, 245, 345, 116, mint);
    text(C.TAGLINE_TEXT, 255, 383, 21, "#d5e6e8");
    text("A continuous circuit.", 748, 299, 19, "#d5e6e8");
    text("An unforgiving edge.", 748, 331, 19, "#d5e6e8");
    text("EAT. CHAIN. SURVIVE.", 748, 385, 14, amber);
    text(C.BEST_LABEL, 748, 469, 13);
    text(String(s.best).padStart(4, "0"), 748, 517, 40, mint);
    text("ARROWS / WASD   •   ENTER TO SELECT", 252, 610, 13);
    line(702, 248, 702, 549, "#284244");
  } else if (s.screen === "howto") {
    text("HOW TO PLAY", 640, 216, 40, mint, "center");
    const lines = [
      "Keep moving. Your next turn lands on the next tick.",
      "Turn across your path — you can never double back.",
      "Eat amber pellets to grow one cell longer.",
      "The walls and your own body end your run.",
      "Eat quickly to build x2 → x5. Wait, and it drops to x1.",
      "ARROWS / WASD   steer     ENTER / SPACE   select",
      "P / ESC   pause or resume     M   toggle sound",
    ];
    lines.forEach((copy, i) =>
      text(copy, 280, 282 + i * 40, 16, i >= 5 ? amber : "#d5e6e8"),
    );
  } else {
    text(
      s.screen === "paused"
        ? "CIRCUIT HELD"
        : s.screen === "cleared"
          ? C.CLEARED_TEXT
          : C.GAMEOVER_TEXT,
      640,
      274,
      44,
      s.screen === "gameover" ? amber : mint,
      "center",
    );
    if (s.screen === "paused")
      text(
        "Take a breath. Your chain can wait.",
        640,
        322,
        16,
        muted,
        "center",
      );
    else {
      text(
        `${C.SCORE_LABEL}  ${s.score}     ${C.BEST_LABEL}  ${s.best}`,
        640,
        339,
        21,
        "#d5e6e8",
        "center",
      );
    }
  }
  items(s.screen).forEach((copy, i) => {
    const r = menuItemRect(s, i)!;
    const selected = i === s.menuIndex;
    box(r.x, r.y, r.w, r.h, selected ? "#14392f" : "#0c1b24");
    ctx.strokeStyle = selected ? mint : "#284249";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    text(selected ? "›" : "·", r.x + 20, r.y + 34, 25, selected ? mint : muted);
    text(copy, r.x + 54, r.y + 33, 18, selected ? mint : muted);
    text(
      String(i + 1).padStart(2, "0"),
      r.x + r.w - 20,
      r.y + 32,
      12,
      muted,
      "right",
    );
  });
}
