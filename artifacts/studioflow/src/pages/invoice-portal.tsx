import { useRoute } from "wouter";
import { useGetPublicInvoice } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2 } from "lucide-react";

export default function InvoicePortalPage() {
  const [, params] = useRoute("/invoice/:token");
  const token = params?.token ?? "";

  const { data: invoice, isLoading } = useGetPublicInvoice(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(225_14%_8%)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(39_52%_61%/0.1)] flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7 text-[hsl(39_52%_61%)] animate-pulse" />
          </div>
          <Skeleton className="w-48 h-5 mx-auto" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[hsl(225_14%_8%)] flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-8 h-8 text-white/30" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invoice Not Found</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            This invoice link may be expired or invalid. Contact the photographer for a new link.
          </p>
        </div>
      </div>
    );
  }

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    void: "Void",
  };
  const statusColor: Record<string, string> = {
    draft: "text-white/40 bg-white/5",
    sent: "text-[hsl(39_52%_61%)] bg-[hsl(39_52%_61%/0.1)]",
    paid: "text-green-400 bg-green-400/10",
    void: "text-red-400/70 bg-red-400/5",
  };

  return (
    <div className="min-h-screen bg-[hsl(225_14%_8%)] text-white">
      <div className="max-w-2xl mx-auto px-5 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center">
            <img src="/logo.png" alt="RealDock" style={{ height: 32, width: "auto", objectFit: "contain" }} draggable={false} />
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[invoice.status] ?? statusColor["draft"]}`}>
            {statusLabel[invoice.status] ?? invoice.status}
          </span>
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden">

          {/* Invoice header */}
          <div className="px-8 py-7 border-b border-white/8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold mb-1">Invoice For</p>
                <p className="text-lg font-bold text-white">{invoice.clientName}</p>
                {invoice.clientEmail && (
                  <p className="text-sm text-white/50 mt-0.5">{invoice.clientEmail}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold mb-1">Project</p>
                <p className="text-sm font-medium text-white">{invoice.projectName}</p>
                <p className="text-xs text-white/40 mt-0.5">{invoice.projectAddress}</p>
              </div>
            </div>

            <div className="flex gap-8 mt-6">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold mb-1">Invoice Date</p>
                <p className="text-sm text-white/70">
                  {new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold mb-1">Due Date</p>
                  <p className="text-sm text-white/70">{invoice.dueDate}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold pb-3">Description</th>
                  <th className="text-right text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold pb-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-3.5 text-sm text-white/80">{item.description}</td>
                    <td className="py-3.5 text-sm text-white text-right font-medium tabular-nums">
                      {formatter.format(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="px-8 py-6 border-t border-white/8 bg-white/2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/60">Total Due</p>
              <p className="text-2xl font-bold text-[hsl(39_52%_61%)] tabular-nums">
                {formatter.format(invoice.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 rounded-xl bg-white/4 border border-white/8 px-6 py-4">
            <p className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-semibold mb-2">Notes</p>
            <p className="text-sm text-white/60 leading-relaxed">{invoice.notes}</p>
          </div>
        )}

        {/* Paid confirmation */}
        {invoice.status === "paid" && (
          <div className="mt-6 flex items-center gap-3 bg-green-400/8 border border-green-400/20 rounded-xl px-6 py-4">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-400">Payment Received</p>
              <p className="text-xs text-green-400/70 mt-0.5">Thank you — this invoice has been marked as paid.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-[11px] text-white/25">
            Delivered by <span className="text-white/40 font-medium">RealDock</span> · Luxury Real Estate Media
          </p>
        </div>
      </div>
    </div>
  );
}
