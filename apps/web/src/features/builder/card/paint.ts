import { FONTS, type CardLayout } from "./layout";

/**
 * 카드 그리기 — ☠계산은 layout이 끝냈다. 여기는 op을 순서대로 칠하기만 한다.
 * ☠결정성을 깨는 것 금지: filter · shadowBlur · 그라디언트 · letterSpacing(§6-a(5)).
 * ☠1px 괘선은 stroke가 아니라 fillRect다 — stroke는 경로 중심에 그려 반픽셀에 걸리고 2px 회색이 된다.
 */

/** 아이콘 배치 — 박스 안 contain. ☠확대 금지(원본 최소 weapontypes 25px, 박스 24px이라 축소만 일어난다). */
function fitIcon(img: CanvasImageSource, box: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  // 소스 종류(img·canvas·ImageBitmap)마다 크기 필드가 갈린다 — 둘 다 훑는다.
  const dim = img as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const iw = dim.naturalWidth ?? dim.width ?? 0;
  const ih = dim.naturalHeight ?? dim.height ?? 0;
  if (iw <= 0 || ih <= 0) return box;
  const s = Math.min(box.w / iw, box.h / ih, 1);
  const w = Math.max(1, Math.round(iw * s));
  const h = Math.max(1, Math.round(ih * s));
  return { x: box.x + Math.round((box.w - w) / 2), y: box.y + Math.round((box.h - h) / 2), w, h };
}

/**
 * 흰 실루엣 아이콘(무기군·특효)에 색 입히기 — 원본이 흰색뿐이라 흰 카드에 그대로 그리면 사라진다
 * (builder.css .entry-kind가 mask + currentColor로 하는 일과 같다).
 * source-in 합성은 결정적이다(filter·shadow와 달리 구현별 흐림이 없다).
 */
function tinted(ctx: CanvasRenderingContext2D, img: CanvasImageSource, w: number, h: number, color: string): CanvasImageSource | undefined {
  const doc = ctx.canvas.ownerDocument;
  const off = doc.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  if (octx === null) return undefined;
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, w, h);
  return off;
}

export function paintCard(layout: CardLayout, ctx: CanvasRenderingContext2D, images: ReadonlyMap<string, CanvasImageSource>): void {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  for (const op of layout.ops) {
    if (op.op === "rect") {
      ctx.fillStyle = op.fill;
      ctx.fillRect(op.x, op.y, op.w, op.h);
      continue;
    }
    if (op.op === "text") {
      ctx.font = FONTS[op.font];
      ctx.fillStyle = op.fill;
      ctx.fillText(op.text, op.x, op.y);
      continue;
    }
    const img = images.get(op.src);
    // 못 받은 아이콘은 자리만 비운다 — 대체 그림을 지어내면 없는 정보를 있는 것처럼 보인다.
    if (img === undefined) continue;
    const box = fitIcon(img, op);
    const src = op.tint === undefined ? img : tinted(ctx, img, box.w, box.h, op.tint);
    if (src === undefined) continue;
    ctx.drawImage(src, box.x, box.y, box.w, box.h);
  }
}
