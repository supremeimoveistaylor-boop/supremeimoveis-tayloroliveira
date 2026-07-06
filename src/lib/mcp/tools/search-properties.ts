import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supa() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_properties",
  title: "Search properties",
  description:
    "Search Supreme Empreendimentos' public real-estate catalog in Goiânia. Filter by purpose (venda/aluguel), property type, bedrooms, price range, or location text.",
  inputSchema: {
    purpose: z.enum(["venda", "aluguel"]).optional().describe("Buy (venda) or rent (aluguel)."),
    property_type: z.string().optional().describe("e.g. casa, apartamento, terreno, rural."),
    min_bedrooms: z.number().int().optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    location_contains: z.string().optional().describe("Substring match on location/neighborhood."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (input) => {
    const limit = input.limit ?? 10;
    let q = supa().from("public_properties").select("*").limit(limit);
    if (input.purpose) q = q.eq("purpose", input.purpose);
    if (input.property_type) q = q.eq("property_type", input.property_type);
    if (typeof input.min_bedrooms === "number") q = q.gte("bedrooms", input.min_bedrooms);
    if (typeof input.min_price === "number") q = q.gte("price", input.min_price);
    if (typeof input.max_price === "number") q = q.lte("price", input.max_price);
    if (input.location_contains) q = q.ilike("location", `%${input.location_contains}%`);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, results: data ?? [] },
    };
  },
});
