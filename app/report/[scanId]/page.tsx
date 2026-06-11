import { createClient } from "@/lib/supabase/server"
import { generateReportHTML } from "@/lib/report-template"
import { ScanRecord } from "@/lib/types"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ scanId: string }>
}

export default async function ReportPage({ params }: Props) {
  const { scanId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", user.id) // RLS + explicit ownership check
    .single()

  if (error || !scan || !scan.result) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-2xl mb-2">⚠️</p>
          <h1 className="text-lg font-bold text-slate-800">Report not found</h1>
          <p className="text-sm text-slate-500 mt-1">This scan doesn&apos;t exist or belongs to another account.</p>
        </div>
      </div>
    )
  }

  const html = generateReportHTML(scan as ScanRecord, user.email)

  // Render the report HTML directly — no React wrapper needed for the print page
  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
