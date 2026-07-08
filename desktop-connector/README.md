# Tally Prime Web + Desktop Sync Connector

The Desktop Connector is a professional Windows Background Service written in Node.js. It acts as an integration gateway between your on-premise **Tally Prime Desktop** application and the cloud-based **Tally Web ERP**.

---

## ⚙️ Architecture & Data Flow

```
+--------------------------+                 +---------------------------+
|   Tally Prime Desktop    |                 |        Cloud Web ERP      |
|                          |                 |                           |
|  Local SOAP XML Gateway  | <-------------> |   Express Node.js Server  |
|  (Running on Port 9000)  |  (Bi-Direct)    |   (Firestore Persistent)  |
+--------------------------+                 +---------------------------+
             ^                                             ^
             |                                             |
             +-------- [ Windows Connector Service ] ------+
```

---

## 📦 Key Responsibilities

1. **Auto-Discovery**: Automatically scans local ports (default 9000) to detect running Tally Prime instances.
2. **Real-time Synchronization**: Runs in a non-blocking background loop (adjustable interval, default 10 seconds).
3. **Incremental Sync**: Only downloads and uploads records modified since the last successful sync timestamp.
4. **Queue & Retry Management**: Retries sync operations in case of power failure or network disconnection.
5. **Conflict Resolution**: Implements last-write-wins (LWW) or custom merge resolution on modified ledgers.
6. **Anti-Duplicate Ledger Guard**: Prevents voucher duplications by tracking local GUIDs inside `sync_history.json`.

---

## 🛠️ Step-by-Step Installation

### Step 1: Configure Tally Prime ODBC/XML port
1. Open Tally Prime on your Windows machine.
2. Press **F1 (Help)** > **Settings** > **Startup**.
3. Under **Client/Server Configuration**, set the following:
   - **Tally Prime acts as**: `Both`
   - **Enable ODBC**: `Yes`
   - **Port**: `9000`
4. Restart Tally Prime.

### Step 2: Install Node.js environment
1. Download and install **Node.js LTS** on the Tally host computer.
2. Verify by running `node -v` and `npm -v` in the command prompt.

### Step 3: Install the Connector files
1. Create a directory e.g., `C:\TallySyncConnector`.
2. Extract the connector scripts into this folder.
3. Install dependencies:
   ```bash
   npm install axios dotenv pm2-windows-service
   ```

### Step 4: Configure Environment Variables
Create a `.env` file in the folder:
```env
WEB_ERP_API_URL="https://your-cloud-erp-url.com"
TALLY_GATEWAY_URL="http://localhost:9000"
POLL_INTERVAL_MS=10000
```

### Step 5: Install as Windows Service
We use `pm2` with `pm2-windows-service` to run the connector as an autostarting, silent Windows Service:
```bash
# Install PM2 and Windows Service utility globally
npm install -g pm2 pm2-windows-startup

# Set PM2 to auto-start with Windows
pm2-startup install

# Run the connector script
pm2 start connector.ts --name "tally-connector"

# Save the current process list so it recovers on reboot
pm2 save
```

---

## 🗄️ Database & Document Schema (Firestore)

We utilize Google Cloud Firestore for secure, enterprise-grade data persistence.

### 1. `companies` Collection
```json
{
  "id": "comp-01",
  "name": "ABC Electronics Ltd",
  "state": "Delhi",
  "country": "India",
  "gstin": "07AAAAA1111A1Z1",
  "financialYearFrom": "2026-04-01",
  "booksBeginningFrom": "2026-04-01"
}
```

### 2. `ledgers` Collection
```json
{
  "id": "ledger-09",
  "companyId": "comp-01",
  "name": "Ram Kumar & Co",
  "groupName": "Sundry Debtors",
  "openingBalance": 45000,
  "balanceType": "Dr",
  "currentBalance": 45000,
  "state": "Delhi",
  "gstin": "07BBBBB2222B1Z2",
  "updatedAt": "2026-07-07T21:53:00.000Z"
}
```

### 3. `vouchers` Collection
```json
{
  "id": "vch-01",
  "companyId": "comp-01",
  "voucherNumber": "Sales/001",
  "date": "2026-07-01",
  "voucherType": "Sales",
  "partyLedgerName": "Ram Kumar & Co",
  "amount": 76700,
  "ledgerEntries": [
    { "ledgerName": "Ram Kumar & Co", "amount": 76700, "type": "Dr" },
    { "ledgerName": "Sales A/c", "amount": 65000, "type": "Cr" },
    { "ledgerName": "CGST @ 9%", "amount": 5850, "type": "Cr" },
    { "ledgerName": "SGST @ 9%", "amount": 5850, "type": "Cr" }
  ],
  "inventoryEntries": [
    { "stockItemName": "Samsung Galaxy S23", "godownName": "Main Location", "quantity": 1, "rate": 65000, "amount": 65000 }
  ],
  "syncStatus": "Synced"
}
```
