"use client"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Ticket, Users, CheckCircle, Send } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface CouponType { id: string; name: string; discount_type: string; discount_value: number; is_active: boolean }
interface Grade { id: string; name: string }
interface Label { id: string; name: string }

interface JobStatus {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  result_json?: {
    issued?: number
    failed?: number
    total?: number
    errors?: string[]
  }
}

type Segment = "all" | "grade" | "label"
type IssueMode = "segment" | "bulk"

export default function CouponBulkIssuePage({ onBack }: { onBack?: () => void }) {
  const [couponTypes, setCouponTypes] = useState<CouponType[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [couponTypeId, setCouponTypeId] = useState("")
  const [issueMode, setIssueMode] = useState<IssueMode>("segment")
  const [segment, setSegment] = useState<Segment>("all")
  const [gradeId, setGradeId] = useState("")
  const [labelId, setLabelId] = useState("")
  const [customerIdsText, setCustomerIdsText] = useState("")
  const [issued, setIssued] = useState(false)
  const [issueResult, setIssueResult] = useState<{ jobId?: string; estimatedRecipients?: number; issuedCount?: number } | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Job polling state ─────────────────────────────────────────────────────
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [jobPollError, setJobPollError] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll GET /api/business/jobs/:id every 3 s when a jobId is set
  useEffect(() => {
    if (!jobId) return
    setJobStatus(null)
    setJobPollError(null)

    const poll = async () => {
      try {
        const job = await apiFetch<JobStatus>(`/api/business/jobs/${jobId}`)
        setJobStatus(job)
        if (job.status === "completed" || job.status === "failed") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      } catch (e: any) {
        setJobPollError(e.message ?? "Failed to fetch job status")
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }

    poll() // immediate first call
    pollIntervalRef.current = setInterval(poll, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [jobId])

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/api/business/coupon-types"),
      apiFetch<any[]>("/api/business/customer-grades"),
      apiFetch<any[]>("/api/business/customer-labels"),
    ]).then(([ctRes, gradesRes, labelsRes]) => {
      const ctArray: CouponType[] = Array.isArray(ctRes) ? ctRes : (ctRes?.data ?? [])
      setCouponTypes(ctArray.filter((ct: CouponType) => ct.is_active))
      const g: Grade[] = (gradesRes ?? []).map((x: any) => ({ id: x.id, name: x.name }))
      setGrades(g)
      if (g.length) setGradeId(g[0].id)
      const l: Label[] = (labelsRes ?? []).map((x: any) => ({ id: x.id, name: x.name }))
      setLabels(l)
      if (l.length) setLabelId(l[0].id)
    }).catch(() => {
      setError("Failed to load coupon types or segments.")
    }).finally(() => setLoadingTypes(false))
  }, [])

  const selectedType = couponTypes.find(c => c.id === couponTypeId)

  const parsedCustomerIds = customerIdsText
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)

  const handleIssue = async () => {
    if (!couponTypeId) return
    setLoading(true)
    setError(null)
    try {
      if (issueMode === "bulk") {
        if (parsedCustomerIds.length === 0) {
          setError("Enter at least one customer ID.")
          setLoading(false)
          return
        }
        const res = await apiFetch<any>("/api/business/coupons/bulk-issue", {
          method: "POST",
          body: JSON.stringify({ coupon_type_id: couponTypeId, customer_ids: parsedCustomerIds }),
        })
        setIssueResult({
          jobId: res?.job_id ?? undefined,
          issuedCount: res?.issued ?? parsedCustomerIds.length,
        })
        setJobId(res?.job_id ?? null)
        setEstimatedRecipients(null)
      } else {
        const body: Record<string, any> = { coupon_type_id: couponTypeId, segment }
        if (segment === "grade" && gradeId) body.grade_id = gradeId
        if (segment === "label" && labelId) body.label_id = labelId
        const res = await apiFetch<any>("/api/business/coupons/issue-to-segment", {
          method: "POST",
          body: JSON.stringify(body),
        })
        setIssueResult({
          jobId: res?.job_id ?? undefined,
          estimatedRecipients: res?.estimated_recipients ?? undefined,
        })
        setJobId(res?.job_id ?? null)
        setEstimatedRecipients(res?.estimated_recipients ?? null)
      }
      setIssued(true)
    } catch (e: any) {
      setError(e?.message ?? "Failed")
    } finally {
      setLoading(false)
    }
  }

  if (issued) {
    const r = issueResult
    const done = jobStatus?.result_json
    const total = done?.total ?? r?.estimatedRecipients ?? r?.issuedCount ?? null
    const issuedCount = done?.issued ?? null
    const failedCount = done?.failed ?? null
    const progressPct = total && issuedCount != null ? Math.round(((issuedCount + (failedCount ?? 0)) / total) * 100) : null
    const jobDone = jobStatus?.status === "completed" || jobStatus?.status === "failed"

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Coupons Issued!</h2>
        {r?.jobId ? (
          <div className="w-full space-y-3">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {r.estimatedRecipients != null
                ? `Job queued for ~${r.estimatedRecipients.toLocaleString()} recipients`
                : r.issuedCount != null
                ? `Job queued: ${r.issuedCount.toLocaleString()} coupons`
                : "Job queued"} — <strong>{selectedType?.name}</strong>
            </p>
            <p className="text-xs text-gray-400 text-center">Job ID: <span className="font-mono">{r.jobId}</span></p>

            {/* Progress section */}
            {!jobDone && !jobPollError && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full" />
                    {jobStatus?.status === "running" ? "Processing…" : "Waiting to start…"}
                  </span>
                  {progressPct != null && <span>{progressPct}%</span>}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: progressPct != null ? `${progressPct}%` : "0%" }}
                  />
                </div>
                {issuedCount != null && (
                  <p className="text-xs text-gray-400 text-right">
                    {issuedCount.toLocaleString()} issued
                    {failedCount != null && failedCount > 0 && ` · ${failedCount.toLocaleString()} failed`}
                    {total != null && ` of ${total.toLocaleString()}`}
                  </p>
                )}
              </div>
            )}

            {jobStatus?.status === "completed" && done && (
              <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Job completed</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Issued: <strong>{(done.issued ?? 0).toLocaleString()}</strong>
                  {(done.failed ?? 0) > 0 && <> · Failed: <strong className="text-red-600 dark:text-red-400">{done.failed?.toLocaleString()}</strong></>}
                  {done.total != null && <> of {done.total.toLocaleString()}</>}
                </p>
              </div>
            )}

            {jobStatus?.status === "failed" && (
              <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Job failed</p>
                {done?.errors && done.errors.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{done.errors[0]}</p>
                )}
              </div>
            )}

            {jobPollError && (
              <p className="text-xs text-red-500 text-center">{jobPollError}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center">
            {r?.issuedCount != null
              ? `Issued ${r.issuedCount.toLocaleString()} coupons`
              : "Coupons issued"} for <strong>{selectedType?.name}</strong>.
          </p>
        )}
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Back to Coupons
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Issue Coupons</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Issue coupon codes to a customer segment</p>
        </div>
      </div>

      {/* Step 1: Select Coupon Type */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
          Select Coupon Type
        </h2>
        {loadingTypes ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
            Loading coupon types…
          </div>
        ) : couponTypes.length === 0 ? (
          <p className="text-sm text-gray-400">No active coupon types found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {couponTypes.map(ct => (
              <button key={ct.id} onClick={() => setCouponTypeId(ct.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${couponTypeId === ct.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300 dark:hover:border-indigo-700"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Ticket className={`w-4 h-4 ${couponTypeId === ct.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
                  <p className={`text-sm font-medium ${couponTypeId === ct.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>{ct.name}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {ct.discount_type} · {ct.discount_value}{ct.discount_type === "percentage" ? "%" : " MAD"} off
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Issue Method */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
          Issue Method
        </h2>

        {/* Mode toggle */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-[#1F1F23]">
          <button onClick={() => setIssueMode("segment")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${issueMode === "segment" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            By Segment
          </button>
          <button onClick={() => setIssueMode("bulk")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${issueMode === "bulk" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            By Customer IDs
          </button>
        </div>

        {issueMode === "segment" && (
          <>
            <div className="flex gap-3">
              {(["all", "grade", "label"] as Segment[]).map(s => (
                <button key={s} onClick={() => setSegment(s)}
                  className={`px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all capitalize ${segment === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>
                  {s === "all" ? "All Customers" : s === "grade" ? "By Grade" : "By Label"}
                </button>
              ))}
            </div>

            {segment === "grade" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={gradeId} onChange={e => setGradeId(e.target.value)}>
                  {grades.length === 0
                    ? <option value="">No grades available</option>
                    : grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                  }
                </select>
              </div>
            )}

            {segment === "label" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={labelId} onChange={e => setLabelId(e.target.value)}>
                  {labels.length === 0
                    ? <option value="">No labels available</option>
                    : labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                  }
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {segment === "all" ? "All active customers will receive a coupon." : segment === "grade" ? "All customers in the selected grade will receive a coupon." : "All customers with the selected label will receive a coupon."}
              </p>
            </div>
          </>
        )}

        {issueMode === "bulk" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer IDs <span className="text-gray-400 font-normal">(one per line or comma-separated)</span>
              </label>
              <textarea
                rows={6}
                value={customerIdsText}
                onChange={e => setCustomerIdsText(e.target.value)}
                placeholder={"uuid-1\nuuid-2\nuuid-3"}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              {parsedCustomerIds.length > 0 && (
                <p className="mt-1 text-xs text-gray-400">{parsedCustomerIds.length.toLocaleString()} customer{parsedCustomerIds.length !== 1 ? "s" : ""} · {parsedCustomerIds.length > 100 ? "async job" : "sync"}</p>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {parsedCustomerIds.length <= 100
                  ? "Up to 100 IDs are issued synchronously and you get an immediate count."
                  : "More than 100 IDs — a background job will be queued and you will receive a job ID to track progress."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 w-full text-right">{error}</p>
        )}
        <div className="flex gap-3">
          {onBack && <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>}
          <button onClick={handleIssue} disabled={!couponTypeId || loading || loadingTypes || (issueMode === "segment" && segment === "grade" && !gradeId) || (issueMode === "segment" && segment === "label" && !labelId) || (issueMode === "bulk" && parsedCustomerIds.length === 0)}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
            {loading ? "Sending..." : "Issue Coupons"}
          </button>
        </div>
      </div>
    </div>
  )
}
