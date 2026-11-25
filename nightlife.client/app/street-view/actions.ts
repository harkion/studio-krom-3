"use server";

import { supabase } from "@/lib/supabase";

export async function getApprovedStories() {
    const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'approved');

    if (error) {
        console.error("Error fetching approved stories:", error);
        // A failed request must reach the recovery UI, not look like an empty street.
        throw new Error("Could not load approved stories.");
    }

    return stories || [];
}