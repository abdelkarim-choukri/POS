import { generateTextReceipt, type ReceiptData } from '../services/receiptService';

interface Props {
  data: ReceiptData;
  onClose: () => void;
}

export default function ReceiptPreview({ data, onClose }: Props) {
  const text = generateTextReceipt(data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white text-black rounded-xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b">
          <span className="text-sm font-semibold">Receipt Preview</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Close</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <pre className="font-mono text-[11px] leading-tight whitespace-pre-wrap">{text}</pre>
        </div>
        <div className="p-3 border-t bg-gray-50 flex gap-2">
          <button onClick={() => {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-${data.transactionNumber}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition">
            Download
          </button>
          <button onClick={() => {
            const printWindow = window.open('', '_blank', 'width=320,height=600');
            if (printWindow) {
              printWindow.document.write(`<html><head><style>body{font-family:'Courier New',monospace;font-size:12px;padding:10px;width:280px;}pre{white-space:pre-wrap;margin:0;}</style></head><body><pre>${text}</pre><script>window.print();setTimeout(()=>window.close(),1000);</script></body></html>`);
              printWindow.document.close();
            }
          }}
            className="flex-1 bg-pos-blue text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
