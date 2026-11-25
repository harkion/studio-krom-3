import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isNarrationAdmin } from "@/lib/narration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyAdmin(request: Request) {
    const token = request.headers
        .get("authorization")
        ?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
        return { error: "Sign in to the admin page first.", status: 401 as const };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        return { error: "Supabase is not configured on the server.", status: 503 as const };
    }

    const authClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
        return { error: "Your login expired. Please sign in again.", status: 401 as const };
    }

    if (!isNarrationAdmin(data.user, process.env.NARRATION_ADMIN_USER_IDS || "")) {
        return { error: "Admin access required.", status: 403 as const };
    }

    // Prefer SUPABASE_SERVICE_ROLE_KEY for cross-user analytics reads; fall back to authed client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = serviceKey
        ? createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        : createClient(url, anonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
        });

    return { db, status: 200 as const };
}

export async function GET(request: Request) {
    try {
        const auth = await verifyAdmin(request);
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { db } = auth;

        // 1. Loop completions
        // Adjust table/column names to match your schema (e.g. from('loop_completions') or from('sessions').eq('completed_loop', true))
        const { count: completedLoopCount, error: loopError } = await db
            .from("loop_completions") // <-- REPLACE with your table name
            .select("*", { count: "exact", head: true });

        if (loopError) throw new Error(`Loop query failed: ${loopError.message}`);

        // 2. Stories + listen counts per story
        const { data: stories, error: storiesError } = await db
            .from("stories")
            .select("id, title")
            .order("id", { ascending: true });

        if (storiesError) throw new Error(`Stories query failed: ${storiesError.message}`);

        // Replace 'story_listens' and 'story_id' with your actual listen tracking table/column
        const { data: listens, error: listensError } = await db
            .from("story_listens") // <-- REPLACE with your listen events/logs table
            .select("story_id");

        if (listensError) throw new Error(`Listens query failed: ${listensError.message}`);

        const listenCountsByStory = new Map<string, number>();
        for (const row of listens || []) {
            const key = String(row.story_id);
            listenCountsByStory.set(key, (listenCountsByStory.get(key) || 0) + 1);
        }

        const storyListens = (stories || []).map((story) => ({
            storyId: String(story.id),
            title: story.title || `Story #${story.id}`,
            listens: listenCountsByStory.get(String(story.id)) || 0,
        }));

        // 3. Courage survey breakdown ("yes" / "maybe" / "no")
        // Replace 'courage_survey' and 'helped_answer' with your actual table/column names
        const { data: surveyRows, error: surveyError } = await db
            .from("survey_responses") // <-- REPLACE with your courage survey table
            .select("helped"); // <-- REPLACE with your answer column

        if (surveyError) throw new Error(`Survey query failed: ${surveyError.message}`);

        const survey = { yes: 0, somewhat: 0, no: 0, total: 0 };
        for (const row of surveyRows || []) {
            const normalized = String(row.helped || "")
                .trim()
                .toLowerCase();
            if (normalized === "yes") {
                survey.yes += 1;
                survey.total += 1;
            } else if (normalized === "somewhat") {
                survey.somewhat += 1;
                survey.total += 1;
            } else if (normalized === "no") {
                survey.no += 1;
                survey.total += 1;
            }
        }

        return NextResponse.json(
            {
                completedLoopCount: completedLoopCount ?? 0,
                storyListens,
                survey,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load analytics.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}