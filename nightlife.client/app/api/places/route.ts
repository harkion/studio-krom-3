import { NextResponse } from "next/server";
import db from "@/lib/stories";

// GET /api/places - Fetch all map locations from SQLite
export async function GET() {
    try {
        const stmt = db.prepare("SELECT * FROM places");
        const places = stmt.all();

        return NextResponse.json(places);
    } catch (error) {
        console.error("Error fetching places:", error);
        return NextResponse.json(
            { error: "Failed to fetch places" },
            { status: 500 }
        );
    }
}