export interface Company {
  id: string;
  name: string;
  state: string;
  country: string;
  gstin?: string;
  financialYearFrom: string;
  booksBeginningFrom: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  parentName?: string;
  category: 'Assets' | 'Liabilities' | 'Income' | 'Expenses';
}

export interface Ledger {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  currentBalance: number;
  gstEnabled?: boolean;
  gstin?: string;
  state?: string;
  hsnCode?: string;
  syncStatus?: 'Synced' | 'Pending' | 'Error';
  updatedAt?: string;
}

export interface Unit {
  id: string;
  symbol: string;
  formalName: string;
  decimalPlaces: number;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  openingBalance: number;
  openingRate: number;
  openingValue: number;
  gstRate: number; // e.g. 18 for 18%
  hsnCode?: string;
  currentStock: number;
}

export interface Godown {
  id: string;
  name: string;
  location?: string;
}

export interface CostCenter {
  id: string;
  name: string;
  category?: string;
}

export interface LedgerEntry {
  ledgerName: string;
  amount: number;
  type: 'Dr' | 'Cr';
  billWiseDetails?: BillWiseDetail[];
}

export interface BillWiseDetail {
  refNo: string;
  type: 'New Ref' | 'Against Ref' | 'Advance' | 'On Account';
  amount: number;
}

export interface InventoryEntry {
  stockItemName: string;
  godownName?: string;
  quantity: number;
  rate: number;
  amount: number;
  gstRate?: number;
  batchDetails?: {
    batchNo: string;
    expiryDate?: string;
  };
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  date: string;
  voucherType: 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Credit Note' | 'Debit Note';
  referenceNo?: string;
  partyLedgerName: string;
  narration?: string;
  amount: number;
  ledgerEntries: LedgerEntry[];
  inventoryEntries?: InventoryEntry[];
  gstDetails?: {
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalGst: number;
  };
  syncStatus: 'Synced' | 'Pending' | 'Error';
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  direction: 'WebToDesktop' | 'DesktopToWeb';
  status: 'Success' | 'Failed' | 'Pending';
  recordsSynced: number;
  details?: string;
  errorMessage?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface User {
  username: string;
  role: 'Admin' | 'Accountant' | 'Operator' | 'Viewer';
  token?: string;
}
