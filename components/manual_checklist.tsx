import { WCAG_22_MANUAL_CHECKS } from "@/lib/constants"

/**
 * Static checklist of the WCAG 2.2 Level A/AA success criteria that an
 * automated scan cannot verify. Shown so users know what still needs a
 * human review pass beyond the automated results.
 */
export default function ManualChecklist() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <span>WCAG 2.2 Manual Checklist</span>
          <span className="px-2.5 py-0.5 text-xs bg-slate-900 border border-slate-800 rounded-full text-slate-400">
            {WCAG_22_MANUAL_CHECKS.length}
          </span>
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
          These criteria require human judgement and are not covered by the
          automated scan. Review each one manually to claim WCAG 2.2 AA
          conformance.
        </p>
      </div>

      <ul className="space-y-3">
        {WCAG_22_MANUAL_CHECKS.map((check) => (
          <li
            key={check.criterion}
            className="flex gap-3.5 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl"
          >
            <span
              aria-hidden="true"
              className="shrink-0 mt-0.5 h-5 w-5 rounded-md border border-slate-700 bg-slate-950/60"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-100">
                  {check.title}
                </span>
                <span className="px-1.5 py-0.5 text-3xs font-bold rounded-md border bg-slate-800 border-slate-700 text-slate-400 font-mono">
                  {check.criterion} · {check.level}
                </span>
                {check.partiallyAutomated && (
                  <span className="px-1.5 py-0.5 text-3xs font-bold rounded-md border bg-sky-500/10 border-sky-500/20 text-sky-300 uppercase tracking-wide">
                    Partially automated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {check.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
