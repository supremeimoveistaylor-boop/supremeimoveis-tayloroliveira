import { jsPDF } from "jspdf";

interface PropertyPdfData {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  location: string;
  property_type: string;
  images?: string[] | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  amenities?: string[] | null;
}

const TYPE_LABELS: Record<string, string> = {
  house: "Casa",
  apartment: "Apartamento",
  commercial: "Comercial",
  land: "Terreno",
};

// Premium palette
const INK = [17, 24, 39] as const;         // near-black
const MUTED = [107, 114, 128] as const;    // slate-500
const HAIRLINE = [229, 231, 235] as const; // slate-200
const CANVAS = [250, 250, 249] as const;   // off-white
const GOLD = [180, 142, 68] as const;      // discreet gold
const PETROL = [22, 52, 66] as const;      // deep petrol

const BRAND = {
  label: "Material Corretor Parceiro",
};


// Sanitize text for jsPDF Helvetica (WinAnsi). Strips emojis/symbols that render
// as garbage ("Ø=Üí", "%ªþ") and normalizes bullets, dashes and smart quotes.
function sanitize(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).normalize("NFC");
  // Remove emoji / pictographs / symbols / dingbats / variation selectors
  s = s.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    ""
  );
  // Normalize common punctuation
  s = s
    .replace(/[•●◦▪■□▶►]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, "...")
    .replace(/·/g, "-");
  // Drop any remaining non-WinAnsi characters (keep basic latin + latin-1 supplement)
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
  // Collapse excess spaces
  s = s.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
  return s;
}

// Replace the middle-dot separator "·" (used only for display) with a safe dash
const SEP = " - ";


const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const formatDate = () =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

async function loadImageAsDataUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims: { width: number; height: number } = await new Promise(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = dataUrl;
      }
    );
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

/**
 * Draw an image cropped to fill (object-fit: cover) into the given rect,
 * preserving aspect ratio without distortion by inserting the image with
 * computed offset. Since jsPDF doesn't clip natively without extra deps,
 * we compute a "fit" (contain) rectangle centered inside the target rect
 * with a subtle backdrop, which avoids distortion while looking clean.
 */
function drawFittedImage(
  doc: jsPDF,
  dataUrl: string,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: "cover" | "contain" = "cover"
) {
  const rImg = imgW / imgH;
  const rBox = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;

  if (mode === "cover") {
    // scale to cover, then center; overflow will render outside (jsPDF has no clip),
    // so instead we approximate: use contain but fill background.
    // For visual quality prefer contain here.
    mode = "contain";
  }
  if (mode === "contain") {
    if (rImg > rBox) {
      dw = w;
      dh = w / rImg;
      dx = x;
      dy = y + (h - dh) / 2;
    } else {
      dh = h;
      dw = h * rImg;
      dy = y;
      dx = x + (w - dw) / 2;
    }
  }
  try {
    doc.addImage(dataUrl, "JPEG", dx, dy, dw, dh, undefined, "FAST");
  } catch {
    try {
      doc.addImage(dataUrl, "PNG", dx, dy, dw, dh, undefined, "FAST");
    } catch {}
  }
}

// --- tiny vector "icons" (monochrome, minimalist) drawn with lines/rects ---
function icon(doc: jsPDF, name: string, cx: number, cy: number, size = 3.2) {
  const s = size;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  switch (name) {
    case "bed":
      doc.line(cx - s, cy + s * 0.4, cx + s, cy + s * 0.4);
      doc.line(cx - s, cy + s * 0.4, cx - s, cy - s * 0.2);
      doc.line(cx + s, cy + s * 0.4, cx + s, cy - s * 0.2);
      doc.roundedRect(cx - s * 0.9, cy - s * 0.2, s * 1.8, s * 0.5, 0.3, 0.3);
      break;
    case "bath":
      doc.roundedRect(cx - s, cy - s * 0.1, s * 2, s * 0.8, 0.4, 0.4);
      doc.line(cx - s * 0.7, cy + s * 0.7, cx - s * 0.7, cy + s);
      doc.line(cx + s * 0.7, cy + s * 0.7, cx + s * 0.7, cy + s);
      break;
    case "car":
      doc.roundedRect(cx - s, cy - s * 0.2, s * 2, s * 0.9, 0.4, 0.4);
      doc.circle(cx - s * 0.55, cy + s * 0.7, 0.5, "S");
      doc.circle(cx + s * 0.55, cy + s * 0.7, 0.5, "S");
      break;
    case "area":
      doc.rect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
      doc.line(cx - s + 0.6, cy - s * 0.7 + 0.6, cx - s + 1.6, cy - s * 0.7 + 0.6);
      doc.line(cx - s + 0.6, cy - s * 0.7 + 0.6, cx - s + 0.6, cy - s * 0.7 + 1.4);
      break;
    case "pin":
      doc.circle(cx, cy - s * 0.2, s * 0.55, "S");
      doc.line(cx, cy + s * 0.35, cx, cy + s);
      break;
    case "tag":
      doc.line(cx - s, cy, cx, cy - s);
      doc.line(cx, cy - s, cx + s, cy - s);
      doc.line(cx + s, cy - s, cx + s, cy);
      doc.line(cx + s, cy, cx - s, cy);
      break;
  }
}

function drawHeader(doc: jsPDF, pageW: number, margin: number) {
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setCharSpace(1.2);
  doc.text(BRAND.label.toUpperCase(), margin, 12);
  doc.setCharSpace(0);
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.line(margin, 15, pageW - margin, 15);
}


function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
  page: number,
  total: number,
  date: string
) {
  const yLine = pageH - 14;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.line(margin, yLine, pageW - margin, yLine);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(BRAND.label, margin, pageH - 8);
  doc.text(date, pageW / 2, pageH - 8, { align: "center" });
  doc.text(`${page} / ${total}`, pageW - margin, pageH - 8, { align: "right" });
}

export async function generatePropertyPdf(property: PropertyPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const date = formatDate();

  const images = (property.images || []).filter(Boolean);
  const loaded = (
    await Promise.all(images.slice(0, 10).map(loadImageAsDataUrl))
  ).filter(Boolean) as { dataUrl: string; width: number; height: number }[];

  // ============ PAGE 1 — COVER ============
  // Full-bleed hero
  const heroH = pageH * 0.62;
  if (loaded[0]) {
    // background fill to avoid white bars if contain
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, heroH, "F");
    drawFittedImage(
      doc,
      loaded[0].dataUrl,
      loaded[0].width,
      loaded[0].height,
      0,
      0,
      pageW,
      heroH,
      "contain"
    );
  } else {
    doc.setFillColor(...PETROL);
    doc.rect(0, 0, pageW, heroH, "F");
  }

  // Overlay bar with brand
  doc.setFillColor(255, 255, 255);
  doc.rect(0, heroH, pageW, pageH - heroH, "F");

  // Gold accent line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(margin, heroH + 10, margin + 22, heroH + 10);

  // Cover meta
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setCharSpace(1.2);
  doc.text("PORTFÓLIO IMOBILIÁRIO", margin, heroH + 18);
  doc.setCharSpace(0);

  // Title
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const coverTitle = doc.splitTextToSize(property.title, contentW);
  doc.text(coverTitle.slice(0, 2), margin, heroH + 30);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const typeLabel = TYPE_LABELS[property.property_type] || property.property_type;
  doc.text(`${typeLabel} · ${property.location}`, margin, heroH + 30 + coverTitle.slice(0, 2).length * 8 + 2);

  // Price card (right-aligned pill)
  const priceStr = formatCurrency(property.price);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const priceW = doc.getTextWidth(priceStr) + 14;
  const priceX = pageW - margin - priceW;
  const priceY = pageH - 42;
  doc.setFillColor(...INK);
  doc.roundedRect(priceX, priceY, priceW, 14, 2, 2, "F");
  doc.setTextColor(...GOLD);
  doc.text(priceStr, priceX + priceW / 2, priceY + 9.5, { align: "center" });

  // Bottom brand line
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.line(margin, pageH - 20, pageW - margin, pageH - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.8);
  doc.text(BRAND.label.toUpperCase(), margin, pageH - 13);
  doc.setCharSpace(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(date, pageW - margin, pageH - 13, { align: "right" });

  // ============ PAGE 2 — DETALHES ============
  doc.addPage();
  drawHeader(doc, pageW, margin);

  let y = 30;

  // Section eyebrow
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.setCharSpace(1.2);
  doc.text("FICHA DO IMÓVEL", margin, y);
  doc.setCharSpace(0);
  y += 6;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  const tLines = doc.splitTextToSize(property.title, contentW);
  doc.text(tLines, margin, y);
  y += tLines.length * 7 + 1;

  // Location w/ pin
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  icon(doc, "pin", margin + 1.5, y - 1.4, 2.2);
  doc.text(`${typeLabel} · ${property.location}`, margin + 6, y);
  y += 8;

  // Price card wide
  doc.setFillColor(...CANVAS);
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.8);
  doc.text("VALOR", margin + 6, y + 8);
  doc.setCharSpace(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(formatCurrency(property.price), margin + 6, y + 17);
  // Gold accent tick
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(pageW - margin - 6, y + 5, pageW - margin - 6, y + 17);
  y += 30;

  // Feature grid (4 columns)
  const feats: { icon: string; label: string; value: string }[] = [];
  if (property.area != null) feats.push({ icon: "area", label: "Área", value: `${property.area} m²` });
  if (property.bedrooms != null) feats.push({ icon: "bed", label: "Quartos", value: String(property.bedrooms) });
  if (property.bathrooms != null) feats.push({ icon: "bath", label: "Banheiros", value: String(property.bathrooms) });
  if (property.parking_spaces != null) feats.push({ icon: "car", label: "Vagas", value: String(property.parking_spaces) });

  if (feats.length) {
    const cols = Math.min(4, feats.length);
    const gap = 4;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const rows = Math.ceil(feats.length / cols);
    const cellH = 22;
    for (let i = 0; i < feats.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = margin + c * (cellW + gap);
      const cy = y + r * (cellH + gap);
      doc.setDrawColor(...HAIRLINE);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, cy, cellW, cellH, 1.5, 1.5, "FD");
      icon(doc, feats[i].icon, cx + 6, cy + 8, 2.6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.setCharSpace(0.6);
      doc.text(feats[i].label.toUpperCase(), cx + 12, cy + 9);
      doc.setCharSpace(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      doc.text(feats[i].value, cx + 12, cy + 17);
    }
    y += rows * cellH + (rows - 1) * gap + 10;
  }

  // Description
  if (property.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.setCharSpace(1.2);
    doc.text("SOBRE O IMÓVEL", margin, y);
    doc.setCharSpace(0);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const descLines = doc.splitTextToSize(property.description, contentW);
    const lineH = 5.2;
    let i = 0;
    while (i < descLines.length) {
      if (y + lineH > pageH - 22) {
        drawFooter(doc, pageW, pageH, margin, 0, 0, date); // placeholder, rewritten later
        doc.addPage();
        drawHeader(doc, pageW, margin);
        y = 30;
      }
      doc.text(descLines[i], margin, y);
      y += lineH;
      i++;
    }
    y += 4;
  }

  // Amenities
  if (property.amenities && property.amenities.length > 0) {
    if (y + 20 > pageH - 22) {
      doc.addPage();
      drawHeader(doc, pageW, margin);
      y = 30;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.setCharSpace(1.2);
    doc.text("COMODIDADES", margin, y);
    doc.setCharSpace(0);
    y += 6;

    // pill chips
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let cx = margin;
    const chipH = 7;
    const gap = 3;
    for (const a of property.amenities) {
      const w = doc.getTextWidth(a) + 8;
      if (cx + w > pageW - margin) {
        cx = margin;
        y += chipH + gap;
        if (y + chipH > pageH - 22) {
          doc.addPage();
          drawHeader(doc, pageW, margin);
          y = 30;
        }
      }
      doc.setDrawColor(...HAIRLINE);
      doc.setFillColor(...CANVAS);
      doc.roundedRect(cx, y, w, chipH, 3.5, 3.5, "FD");
      doc.setTextColor(...INK);
      doc.text(a, cx + w / 2, y + 5, { align: "center" });
      cx += w + gap;
    }
    y += chipH + 6;
  }

  // ============ GALERIA ============
  if (loaded.length > 1) {
    doc.addPage();
    drawHeader(doc, pageW, margin);
    y = 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.setCharSpace(1.2);
    doc.text("GALERIA", margin, y);
    doc.setCharSpace(0);
    y += 8;

    const rest = loaded.slice(1);
    // Layout: 1 big (full width) then 2-column grid of remaining
    const bigH = 85;
    if (rest[0]) {
      doc.setFillColor(...CANVAS);
      doc.roundedRect(margin, y, contentW, bigH, 2, 2, "F");
      drawFittedImage(
        doc,
        rest[0].dataUrl,
        rest[0].width,
        rest[0].height,
        margin,
        y,
        contentW,
        bigH,
        "contain"
      );
      y += bigH + 4;
    }
    const grid = rest.slice(1);
    const cols = 2;
    const gap = 4;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const cellH = 55;
    for (let i = 0; i < grid.length; i++) {
      const c = i % cols;
      const cx = margin + c * (cellW + gap);
      if (c === 0 && y + cellH > pageH - 22) {
        doc.addPage();
        drawHeader(doc, pageW, margin);
        y = 30;
      }
      doc.setFillColor(...CANVAS);
      doc.roundedRect(cx, y, cellW, cellH, 2, 2, "F");
      drawFittedImage(
        doc,
        grid[i].dataUrl,
        grid[i].width,
        grid[i].height,
        cx,
        y,
        cellW,
        cellH,
        "contain"
      );
      if (c === cols - 1 || i === grid.length - 1) {
        y += cellH + gap;
      }
    }
  }

  // ============ FOOTERS (all pages except cover) ============
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p === 1) continue; // cover already has its own footer
    drawFooter(doc, pageW, pageH, margin, p, totalPages, date);
  }

  const safeTitle = property.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  doc.save(`imovel-${safeTitle || property.id}.pdf`);
}
