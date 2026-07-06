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
  name: "list_featured_properties",
  title: "List featured properties",
  description: "Return highlighted (featured) properties from Supreme Empreendimentos.",
  inputSchema: {
    limit: z.number().int().min(1).max(20).optional().describe("Max results (default 6)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ limit }) => {
    const { data, error } = await supa()
      .from("public_properties")
      .select("*")
      .eq("featured", true)
      .limit(limit ?? 6);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, results: data ?? [] },
    };
  },
});
