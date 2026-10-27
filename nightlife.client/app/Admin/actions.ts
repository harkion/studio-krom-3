"use server";

import db from "@/lib/stories";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteStory(id: number) {
    db.prepare("DELETE FROM stories WHERE id = ?").run(id);
    revalidatePath("/Admin");
}

export async function updateStory(id: number, formData: FormData) {
    const title = formData.get("title");
    const location_name = formData.get("location_name");
    const category = formData.get("category");
    const narrative_text = formData.get("narrative_text");
    const author_name = formData.get("author_name") || "Admin";
    const x = parseFloat(formData.get("x") as string) || 0;
    const z = parseFloat(formData.get("z") as string) || 0;

    db.prepare(`
    UPDATE stories SET 
      title = ?, location_name = ?, category = ?, 
      narrative_text = ?, author_name = ?, x = ?, z = ?
    WHERE id = ?
  `).run(title, location_name, category, narrative_text, author_name, x, z, id);

    revalidatePath("/Admin");
    redirect("/Admin");
}