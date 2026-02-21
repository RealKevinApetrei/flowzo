"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const displayNameSchema = z.string().trim().min(1, "Name cannot be empty").max(50, "Name must be 50 characters or less");

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const displayName = displayNameSchema.parse(formData.get("displayName"));

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) throw new Error(`Failed to update display name: ${error.message}`);

  revalidatePath("/settings");
}
