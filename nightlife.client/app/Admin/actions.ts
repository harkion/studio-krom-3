"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteStory(id: number) {
    // Supabase DELETE query
    const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Delete failed:", error);
        throw new Error("Failed to delete story.");
    }

    revalidatePath("/Admin");
}

export async function updateStory(id: number, formData: FormData) {

    const colorInput = formData.get('color') as string;

    // 2. Convert Hex string to an integer for the int8 column
    let colorInt = 7067135; // fallback default
    if (colorInput) {
        const cleanHex = colorInput.replace('#', '');
        colorInt = parseInt(cleanHex, 16);
    }
    const title = formData.get("title");
    const location_name = formData.get("location_name");
    const category = formData.get("category");
    const narrative_text = formData.get("narrative_text");
    const author_name = formData.get("author_name") || "Admin";
    const x = parseFloat(formData.get("x") as string) || 0;
    const z = parseFloat(formData.get("z") as string) || 0;
    const color = colorInt;

    // Supabase UPDATE query
    const { error } = await supabase
        .from('stories')
        .update({
            title,
            location_name,
            category,
            narrative_text,
            author_name,
            x,
            z,
            color
        })
        .eq('id', id);

    if (error) {
        console.error("Update failed:", error);
        throw new Error("Failed to update story.");
    }

    revalidatePath("/Admin");
    redirect("/Admin");
}

export async function approveStory(id: number) {
    const { error } = await supabase
        .from('stories')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) {
        console.error("Approval failed:", error);
        throw new Error("Failed to approve story.");
    }

    revalidatePath("/Admin");
}