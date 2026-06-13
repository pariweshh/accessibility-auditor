import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PAID_TIERS = ["pro", "agency"]

// GET /api/keys - List all keys for the logged-in user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_preview, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch API keys error:", error)
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
    }

    return NextResponse.json({ keys })
  } catch (err) {
    console.error("GET /api/keys error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "API key name is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single()

    if (!profile || !PAID_TIERS.includes(profile.subscription_tier)) {
      return NextResponse.json(
        { error: "upgrade_required", message: "Developer API access is available on Pro and Agency plans." },
        { status: 403 }
      )
    }

    // Generate secure cryptographically random key
    const rawKey = `aud_live_${crypto.randomBytes(32).toString("hex")}`
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
    const keyPreview = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`

    const { data: newKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHash,
        key_preview: keyPreview,
      })
      .select("id, name, key_preview, created_at")
      .single()

    if (insertError || !newKey) {
      console.error("Insert API key error:", insertError)
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
    }

    // Return the raw key ONLY ONCE in response
    return NextResponse.json({
      key: newKey,
      rawKey,
    })
  } catch (err) {
    console.error("POST /api/keys error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/keys?id=... - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get("id")

    if (!keyId) {
      return NextResponse.json({ error: "API key ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id) // Ensure ownership

    if (deleteError) {
      console.error("Delete API key error:", deleteError)
      return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/keys error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
