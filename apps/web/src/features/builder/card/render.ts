import type { ExportRow } from "../lib";
import { FONTS, layoutCard, type CardLayout, type CardLayoutOptions, type Measure, type OverflowNote } from "./layout";
import { paintCard } from "./paint";

/**
 * 카드 PNG 굽기 — 부수효과(폰트 로드·이미지 디코드·canvas·Blob)는 이 파일에만 있다.
 * ☠DPR을 곱하지 않는다 — 840은 고정 픽셀 자산이다(디시 기본 리사이즈 폭 850 미만이라 리샘플 분기를
 * 아예 안 탄다). 기기마다 폭이 달라지면 무손실 전제가 무너진다(design/builder_export.md §0-b).
 */

/** 폰트 로드 확인용 표본 — 한글·숫자·라틴을 함께 넣어야 서브셋(unicode-range) 폰트까지 실제로 받는다. */
const FONT_SAMPLE = "0123456789 ABCabc 가나다";

const SPECS = [...new Set(Object.values(FONTS))];

/**
 * ☠`document.fonts.ready`만으로는 부족하다 — 카드 전용 폰트는 **어떤 DOM도 요청하지 않아** pending
 * 목록에 없고 ready가 즉시 resolve한다. 그러면 첫 렌더가 폴백으로 나가는데 오류도 경고도 없다.
 * ⇒ 쓰는 조합마다 load를 명시 호출하고, check가 실패하면 **렌더를 중단**한다
 * (폴백으로 그리면 measure와 paint가 다른 폰트를 재고 그려 글자가 칸을 넘는다).
 */
async function ensureFonts(): Promise<void> {
  const set = document.fonts;
  await Promise.all(SPECS.map((spec) => set.load(spec, FONT_SAMPLE)));
  const missing = SPECS.filter((spec) => !set.check(spec, FONT_SAMPLE));
  if (missing.length > 0) throw new Error(`카드 폰트 미로드 — 렌더 중단: ${missing.join(" | ")}`);
}

/** 아이콘 한 장 — ☠onload만으로는 디코드가 끝났다는 보장이 없다(첫 drawImage가 빈 칸이 된다). */
async function loadImage(src: string): Promise<[string, CanvasImageSource] | undefined> {
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return [src, img];
  } catch {
    // 한 장이 죽어도 카드는 나가야 한다 — 자리는 비고, 그 사실은 호출부가 아니라 그림이 말한다.
    return undefined;
  }
}

export interface RenderCardOptions extends CardLayoutOptions {
  /** 넘친 칸 보고 — ☠받아서 UI에 드러내라. 말없이 잘린 이름은 결손 목록에도 안 잡힌다. */
  onOverflow?: (notes: readonly OverflowNote[]) => void;
}

export async function renderCard(rows: readonly ExportRow[], opts: RenderCardOptions): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("2d 컨텍스트를 못 얻었다 — 카드 렌더 중단");

  // 재는 것과 그리는 것이 같은 컨텍스트여야 폭이 갈리지 않는다(폰트 해석기가 하나다).
  const measure: Measure = (text, font) => {
    ctx.font = FONTS[font];
    return ctx.measureText(text).width;
  };
  const layout: CardLayout = layoutCard(rows, opts, measure);
  if (opts.onOverflow !== undefined) opts.onOverflow(layout.overflow);

  const srcs = [...new Set(layout.ops.flatMap((op) => (op.op === "icon" ? [op.src] : [])))];
  const loaded = await Promise.all(srcs.map(loadImage));
  const images = new Map(loaded.flatMap((e) => (e === undefined ? [] : [e])));

  canvas.width = layout.width;
  canvas.height = layout.height;
  paintCard(layout, ctx, images);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  // ☠에셋이 교차 출처가 되면 캔버스가 오염돼 여기서 SecurityError가 난다(현행 아이콘은 동일 출처).
  if (blob === null) throw new Error("카드 PNG 인코딩 실패");
  return blob;
}
