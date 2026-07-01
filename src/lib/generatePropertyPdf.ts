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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

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

export async function generatePropertyPdf(property: PropertyPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(212, 175, 55); // gold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SUPREME EMPREENDIMENTOS", margin, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Vitrine de Parcerias — Ficha do Imóvel", margin, 16);
  y = 30;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(property.title, pageW - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7;

  // Type + location
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${TYPE_LABELS[property.property_type] || property.property_type} · ${property.location}`,
    margin,
    y
  );
  y += 6;

  // Price
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55);
  doc.text(formatCurrency(property.price), margin, y + 4);
  y += 12;

  // Main image
  if (property.images && property.images.length > 0) {
    const first = await loadImageAsDataUrl(property.images[0]);
    if (first) {
      const maxW = pageW - margin * 2;
      const maxH = 90;
      const ratio = Math.min(maxW / first.width, maxH / first.height);
      const w = first.width * ratio;
      const h = first.height * ratio;
      try {
        doc.addImage(first.dataUrl, "JPEG", margin, y, w, h);
        y += h + 6;
      } catch {}
    }
  }

  // Features
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Características", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const feats: string[] = [];
  if (property.bedrooms != null) feats.push(`${property.bedrooms} Quarto(s)`);
  if (property.bathrooms != null) feats.push(`${property.bathrooms} Banheiro(s)`);
  if (property.parking_spaces != null)
    feats.push(`${property.parking_spaces} Vaga(s)`);
  if (property.area != null) feats.push(`${property.area} m²`);
  doc.text(feats.join("  ·  ") || "—", margin, y);
  y += 8;

  // Description
  if (property.description) {
    doc.setFont("helvetica", "bold");
    doc.text("Descrição", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(
      property.description,
      pageW - margin * 2
    );
    if (y + descLines.length * 5 > pageH - 25) {
      doc.addPage();
      y = margin;
    }
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 4;
  }

  // Amenities
  if (property.amenities && property.amenities.length > 0) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Comodidades", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const amenText = property.amenities.join(" · ");
    const amenLines = doc.splitTextToSize(amenText, pageW - margin * 2);
    doc.text(amenLines, margin, y);
    y += amenLines.length * 5 + 4;
  }

  // Extra images — 2 per page grid
  if (property.images && property.images.length > 1) {
    const extras = property.images.slice(1, 9); // limit
    for (let i = 0; i < extras.length; i++) {
      const img = await loadImageAsDataUrl(extras[i]);
      if (!img) continue;
      const maxW = pageW - margin * 2;
      const maxH = 110;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      if (y + h > pageH - 20) {
        doc.addPage();
        y = margin;
      }
      try {
        doc.addImage(img.dataUrl, "JPEG", margin, y, w, h);
        y += h + 6;
      } catch {}
    }
  }

  // Footer on every page — NO direct contact (partnership mode)
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 15, pageW - margin, pageH - 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Material exclusivo para parceria entre corretores — Supreme Empreendimentos · CRECI 20.316",
      margin,
      pageH - 10
    );
    doc.text(
      `Página ${p} de ${pageCount}`,
      pageW - margin,
      pageH - 10,
      { align: "right" }
    );
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
