// Client-side export helpers for Daily Store (PNG + vector PDF).
// Heavy libraries are loaded on demand so the page bundle stays small.

export type PdfColumn = {
  label: string;
  align: "left" | "right" | "center";
  /** Width in mm (A4 landscape has 273mm of usable width). */
  width: number;
};

export type PdfInput = {
  title: string;
  scope: string;
  meta: string;
  dataThrough: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  columns: PdfColumn[];
  rows: string[][];
  foot: string[];
  /** Column index that should be emphasised (Total Revenue). */
  totalColumnIndex?: number;
  filename: string;
};

const PAGE_W = 297;
const PAGE_H = 210;
const M = 12;
const PURPLE: [number, number, number] = [124, 58, 237];
const INK: [number, number, number] = [23, 23, 28];
const SOFT: [number, number, number] = [75, 85, 99];
const MUTED: [number, number, number] = [107, 114, 128];
const FAINT: [number, number, number] = [156, 163, 175];
const LINE: [number, number, number] = [232, 232, 239];
const CANVAS: [number, number, number] = [244, 245, 250];

export async function buildPdfBlob(input: PdfInput): Promise<Blob> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  doc.setProperties({
    title: `${input.title} — ${input.scope}`,
    subject: input.meta,
    author: "OneMapTech",
    creator: "OneMapTech Dashboard",
  });

  drawPageOneHeader(doc, input);

  autoTable(doc, {
    startY: 64,
    head: [input.columns.map((column) => column.label)],
    body: input.rows,
    foot: [input.foot],
    showFoot: "lastPage",
    margin: { left: M, right: M, top: 24, bottom: 20 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
      textColor: SOFT,
      lineColor: LINE,
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: CANVAS,
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 6.4,
      lineColor: LINE,
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    footStyles: {
      fillColor: CANVAS,
      textColor: INK,
      fontStyle: "bold",
      fontSize: 7,
      lineColor: LINE,
      lineWidth: 0.1,
    },
    columnStyles: Object.fromEntries(
      input.columns.map((column, index) => [
        index,
        { cellWidth: column.width },
      ]),
    ),
    didParseCell: (data) => {
      const column = input.columns[data.column.index];
      if (column) data.cell.styles.halign = column.align;
      if (
        input.totalColumnIndex !== undefined &&
        data.column.index === input.totalColumnIndex &&
        (data.section === "body" || data.section === "foot")
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = INK;
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(
          `ONEMAPTECH · ${input.title} · ${input.scope} · ${input.meta}`,
          M,
          11,
        );
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${data.pageNumber}`, PAGE_W - M, 11, {
          align: "right",
        });
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(M, 14, PAGE_W - M, 14);
      }
    },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const y = PAGE_H - 12;

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, y, PAGE_W - M, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(...MUTED);
    doc.text(
      `OneMapTech · daily report · data s/d ${input.dataThrough}`,
      M,
      y + 4,
    );
    doc.text(`Page ${page}/${pages}`, PAGE_W - M, y + 4, { align: "right" });

    // Watermark: intentionally tiny, just enough to mark the report source.
    const watermark = "Powered by Amiril M";
    doc.setFontSize(5.2);
    doc.setTextColor(...FAINT);
    doc.setCharSpace(0.35);
    doc.text(watermark, PAGE_W - M, y + 8.2, { align: "right" });
    const textWidth = doc.getTextWidth(watermark);
    doc.setCharSpace(0);
    const cx = PAGE_W - M - textWidth - 3;
    doc.setFillColor(...PURPLE);
    doc.triangle(cx, y + 7.4, cx + 0.8, y + 8.2, cx, y + 9, "F");
    doc.triangle(cx, y + 7.4, cx - 0.8, y + 8.2, cx, y + 9, "F");
  }

  return doc.output("blob");
}

function drawPageOneHeader(
  doc: InstanceType<typeof import("jspdf").default>,
  input: PdfInput,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PURPLE);
  doc.setCharSpace(0.5);
  doc.text("ONEMAPTECH", M, 14);
  doc.setCharSpace(0);

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("DAILY SALES", PAGE_W - M, 14, { align: "right" });

  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(input.title, M, 23.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  doc.text(input.scope, M, 29.5);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(input.meta, M, 34.5);

  doc.setFontSize(7);
  doc.setTextColor(...FAINT);
  doc.text(
    `Generated ${input.generatedAt} · Data s/d ${input.dataThrough}`,
    M,
    39,
  );

  let x = M;
  for (const item of input.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.25);
    doc.text(item.label.toUpperCase(), x, 47);
    doc.setCharSpace(0);
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(item.value, x, 53.5);
    x += 64;
  }

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, 58.5, PAGE_W - M, 58.5);
}

/** Render a DOM node to a PNG (used for the export sheet). */
export async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import("html-to-image");

  if (document.fonts?.ready) await document.fonts.ready;
  // Let layout settle before measuring/capturing.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  const width = node.scrollWidth;
  const height = node.scrollHeight;

  // Aim for 2x, but keep the bitmap within the canvas limits of mobile Safari
  // (long "All stores" sheets can otherwise produce a blank image).
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const maxSide = isIOS ? 4096 : 8192;
  const scale = Math.min(2, maxSide / Math.max(width, height));

  const blob = await toBlob(node, {
    pixelRatio: 1,
    backgroundColor: "#ffffff",
    cacheBust: true,
    width,
    height,
    canvasWidth: Math.round(width * scale),
    canvasHeight: Math.round(height * scale),
    style: { margin: "0", transform: "none" },
  });

  if (!blob) throw new Error("Gagal membuat gambar PNG.");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Mobile: open the native share sheet (WhatsApp etc.).
 * Desktop / unsupported: download the file.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string,
): Promise<void> {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
  });

  const ua = navigator.userAgent;
  const uaData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  const isMobile =
    uaData?.mobile === true ||
    /Android|iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  if (isMobile) {
    try {
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Fall through to download when sharing is unavailable or fails.
    }
  }

  downloadBlob(blob, filename);
}

/**
 * Show a generated PDF in a browser tab. The caller opens the tab
 * synchronously (inside the click handler) so pop-up blockers allow it.
 * Falls back to a download when the window could not be opened.
 */
export function showPdfInWindow(
  win: Window | null,
  blob: Blob,
  filename: string,
): boolean {
  if (win && !win.closed) {
    const url = URL.createObjectURL(blob);
    win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  }
  downloadBlob(blob, filename);
  return false;
}
