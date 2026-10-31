'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 bg-[#080808] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]"
    >
      <Printer className="h-3.5 w-3.5" /> Print Invoice
    </button>
  );
}

