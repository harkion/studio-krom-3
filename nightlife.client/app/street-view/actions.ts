"use server";

import db from "@/lib/stories";

export async function getApprovedStories() {
    const stories = db
        .prepare("SELECT * FROM stories WHERE status = 'approved'")
        .all();

    return stories;
}
