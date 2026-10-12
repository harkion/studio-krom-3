import { NextResponse } from "next/server";
import db from "@/lib/stories";

// GET /api/stories - Fetch stories filtered by status (defaults to 'approved')
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "approved";

        const stmt = db.prepare(`
      SELECT 
        stories.id,
        stories.title,
        stories.summary,
        stories.category,
        stories.age,
        stories.gender,
        stories.status,
        stories.created_at,
        places.name as place_name,
        places.query as place_query
      FROM stories
      LEFT JOIN places ON stories.place_id = places.id
      WHERE stories.status = ?
      ORDER BY stories.created_at DESC
    `);

        const stories = stmt.all(status);

        return NextResponse.json(stories);
    } catch (error) {
        console.error("Error fetching stories:", error);
        return NextResponse.json(
            { error: "Failed to fetch stories" },
            { status: 500 }
        );
    }
}

// POST /api/stories - Submit a new story from ShareStory form
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            title,
            summary,
            category,
            age,
            gender,
            placeId,
            newPlaceName,
        } = body;

        // Server-side validation
        if (!title || !summary || !category || !age || !gender) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        let finalPlaceId = placeId;

        // Create a new place entry if user typed a new location/street name
        if (!finalPlaceId && newPlaceName) {
            finalPlaceId = newPlaceName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

            const insertPlace = db.prepare(`
        INSERT OR IGNORE INTO places (id, name, query, category, title, summary, scope, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

            insertPlace.run(
                finalPlaceId,
                newPlaceName,
                `${newPlaceName} Eindhoven`,
                category,
                title,
                summary,
                "User submitted location",
                "Community submission"
            );
        }

        if (!finalPlaceId) {
            return NextResponse.json(
                { error: "Location is required" },
                { status: 400 }
            );
        }

        const storyId = `story-${Date.now()}`;

        // Save story as 'pending' for admin review
        const insertStory = db.prepare(`
      INSERT INTO stories (id, title, summary, category, age, gender, place_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

        insertStory.run(
            storyId,
            title,
            summary,
            category,
            Number(age),
            gender,
            finalPlaceId
        );

        return NextResponse.json(
            { success: true, message: "Story submitted for review", id: storyId },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error saving story:", error);
        return NextResponse.json(
            { error: "Failed to submit story" },
            { status: 500 }
        );
    }
}