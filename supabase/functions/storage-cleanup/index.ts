import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const buckets = ["property-images", "avatars", "chat-attachments"];
    const results: { file: string; bucket: string; reason: string }[] = [];

    // 1. Get all active property image URLs
    const { data: properties } = await supabase
      .from("properties")
      .select("images");
    
    const activeImagePaths = new Set<string>();
    (properties || []).forEach((p: any) => {
      (p.images || []).forEach((img: string) => {
        // Extract path from full URL or store relative path
        try {
          const url = new URL(img);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);
          if (pathMatch) activeImagePaths.add(pathMatch[1]);
        } catch {
          activeImagePaths.add(img);
        }
      });
    });

    // 2. Get all active avatar URLs
    const { data: profiles } = await supabase
      .from("profiles")
      .select("avatar_url");
    
    (profiles || []).forEach((p: any) => {
      if (p.avatar_url) {
        try {
          const url = new URL(p.avatar_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);
          if (pathMatch) activeImagePaths.add(pathMatch[1]);
        } catch {
          activeImagePaths.add(p.avatar_url);
        }
      }
    });

    // 3. Scan each bucket
    for (const bucketName of buckets) {
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

      if (listError || !files) {
        console.log(`Skipping bucket ${bucketName}: ${listError?.message}`);
        continue;
      }

      // Process top-level folders and files
      for (const item of files) {
        if (item.id === null) {
          // It's a folder - list its contents
          const { data: folderFiles } = await supabase.storage
            .from(bucketName)
            .list(item.name, { limit: 1000 });

          if (!folderFiles) continue;

          // Check for temp/cache folders
          const isTempFolder = ["temp", "cache", "tmp", "test"].includes(item.name.toLowerCase());

          for (const file of folderFiles) {
            if (file.id === null) continue; // skip sub-folders
            const filePath = `${item.name}/${file.name}`;
            const fullRef = `${bucketName}/${filePath}`;

            if (isTempFolder) {
              results.push({ file: filePath, bucket: bucketName, reason: `pasta temporária: ${item.name}` });
              continue;
            }

            // Check if referenced by any active record
            if (!activeImagePaths.has(fullRef) && !activeImagePaths.has(filePath)) {
              // Extra safety: check if file is older than 30 days
              const createdAt = file.created_at ? new Date(file.created_at) : null;
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              
              if (createdAt && createdAt < thirtyDaysAgo) {
                results.push({ file: filePath, bucket: bucketName, reason: "arquivo órfão (sem referência em registros ativos)" });
              }
            }
          }
        } else {
          // Top-level file
          const fullRef = `${bucketName}/${item.name}`;
          if (!activeImagePaths.has(fullRef) && !activeImagePaths.has(item.name)) {
            const createdAt = item.created_at ? new Date(item.created_at) : null;
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            if (createdAt && createdAt < thirtyDaysAgo) {
              results.push({ file: item.name, bucket: bucketName, reason: "arquivo órfão (sem referência em registros ativos)" });
            }
          }
        }
      }
    }

    // 4. Delete orphan files and log
    let deletedCount = 0;
    for (const item of results) {
      const { error: deleteError } = await supabase.storage
        .from(item.bucket)
        .remove([item.file]);

      if (!deleteError) {
        deletedCount++;
        await supabase.from("storage_cleanup_logs").insert({
          file_path: item.file,
          bucket: item.bucket,
          reason: item.reason,
        });
      } else {
        console.error(`Failed to delete ${item.bucket}/${item.file}:`, deleteError.message);
      }
    }

    const response = {
      success: true,
      scanned_buckets: buckets,
      orphan_files_found: results.length,
      files_deleted: deletedCount,
      details: results.slice(0, 50), // limit response size
    };

    console.log("Storage cleanup completed:", JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Storage cleanup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
