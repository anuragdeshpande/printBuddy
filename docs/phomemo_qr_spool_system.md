# Master Implementation Plan & UX Guide: Direct Phomemo Bluetooth Thermal Printing, QR Translation & Spool NFC Ecosystem

---

## Executive Overview

This document outlines the complete implementation design for extending **PrintBuddy (Server)** and **BuddyDash (Android App)** to support:
1. **Direct Phomemo Bluetooth Thermal Label Printing** for 30mm circular stickers directly from BuddyDash (without using the vendor Phomemo app).
2. **Unified QR-to-NFC Translation Pipeline** on the PrintBuddy server, allowing inexpensive thermal QR stickers to act as drop-in replacements for NFC tags.
3. **Comprehensive Multi-Brand NFC/RFID Spool Ecosystem Support** (OpenSpool, Prusament NFC, Anycubic RFID, and Bambu Lab RFID).

---

## Part 1: Complete End-to-End User Experience (UX) Guide

### Scenario 1: Adding a New Spool & Printing a 30mm Thermal QR Label

```
[ Step 1: Open BuddyDash ] -> [ Step 2: Add Spool ] -> [ Step 3: 1-Tap Bluetooth Print ] -> [ Step 4: Stick Label ]
```

1. **Step 1 — Open Spool Inventory in BuddyDash**:
   - Open BuddyDash on your Android phone. Tap **Inventory** -> **+ Add New Spool**.
2. **Step 2 — Enter Filament Details**:
   - Select Brand (e.g., *Sunlu*), Material (*PLA*), Color (*Galaxy Black*, pick live color swatch), and Spool Weight (*1000g*).
   - Tap **Save Spool to PrintHive**.
3. **Step 3 — Instant Print Dialog**:
   - BuddyDash immediately presents a **"Print 30mm Label"** dialog showing a live graphic preview of your 30mm round sticker (QR code + brand, color swatch, and 210°C/60°C temp badges).
   - Tap **Print via Bluetooth**.
4. **Step 4 — Automatic Bluetooth Connection & Printing**:
   - BuddyDash connects directly to your paired **Phomemo M110 / D30 / M220 / T02** thermal printer over Bluetooth (SPP/BLE).
   - The printer feeds and prints a crisp 203 DPI 30mm circular label in under 2 seconds. No Phomemo app, no manual layout alignment required!
5. **Step 5 — Apply Label**:
   - Peel the 30mm round sticker and place it on the side of your filament spool.

---

### Scenario 2: Loading a Spool into an AMS or Printer Slot

```
[ Step 1: Tap Scan in BuddyDash ] -> [ Step 2: Point Camera at Spool ] -> [ Step 3: Tap Load to Slot 2 ]
```

1. **Step 1 — Open Camera Scanner in BuddyDash**:
   - Tap the **Camera Scan** icon on the BuddyDash main dashboard or from any Printer Detail screen (*BambuLab X2D* or *Elegoo CC1*).
2. **Step 2 — Point Phone Camera at Spool**:
   - Point your phone camera at the 30mm QR sticker on the spool (or tap an NFC tag if using NFC).
3. **Step 3 — Instant Recognition & 1-Tap Load**:
   - BuddyDash instantly detects the QR code, queries PrintHive, and displays a card:
     > **Matched Spool**: Sunlu PLA (Galaxy Black) — 850g remaining
   - Select Target Slot (e.g., *Bambu AMS Slot 2* or *Elegoo External Spool*) and tap **Load Spool**.
4. **Step 4 — Server Synchronization**:
   - PrintHive updates the database, syncs with **Spoolman**, and sets the filament color/type on the printer.

---

## Part 2: Supported Spool Tag Systems (Pros & Cons Comparison)

PrintBuddy supports all major filament tag standards through a **Unified Translation Pipeline**. Below is a detailed breakdown of each supported tag system:

| Tag System | Frequency / Format | Cost Per Spool | Pros | Cons | Recommendation |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Phomemo 30mm Thermal QR Stickers** | Visual QR Code (203 DPI Raster) | **<$0.005** | • Extremely cheap.<br>• No hardware alignment issues.<br>• Human-readable text + QR code.<br>• Instant camera scan from a distance. | • Requires line-of-sight scanning.<br>• Cannot be read directly by Bambu AMS internal RFID coils. | ⭐ **Highly Recommended (Primary)** |
| **OpenSpool NFC (NTAG213/215/216)** | 13.56 MHz High Frequency NDEF | **$0.25 – $0.50** | • Open industry standard.<br>• Stores full metadata on-chip (vendor, color, temps).<br>• Rewritable and readable by phone NFC. | • Stickers can peel off or align poorly.<br>• Expensive for large spool collections. | ⭐ **Recommended for NFC** |
| **Prusament NFC** | 13.56 MHz NTAG213 (UID Encoded) | **Free with spool** | • Factory-embedded in every Prusament spool.<br>• Unique chip UID automatically tracked in inventory.<br>• Pre-indexed in PrintBuddy catalog. | • Encrypted metadata (PrintBuddy tracks via UID lookup). | ✅ **Supported Out-of-the-Box** |
| **Anycubic RFID** | 13.56 MHz High Frequency RFID | **Free with spool** | • Factory-embedded in Anycubic spools.<br>• Readable via BuddyDash phone NFC or SpoolBuddy scanner. | • Proprietary reader protocol on Anycubic hardware. | ✅ **Supported via UID Tracking** |
| **Bambu Lab RFID** | 13.56 MHz Proprietary RFID | **Free with spool** | • Seamless auto-read inside Bambu AMS.<br>• Auto-populates color, material, and K-factor. | • Proprietary encryption (read-only by Bambu AMS).<br>• Cannot be written by end-users. | ✅ **Fully Supported on Bambu AMS** |

---

## Part 3: Architecture & Data Specifications

### 1. 30mm Round Label Graphic Specification

```
      ┌─────────────────────────┐
      │   /---\                 │
      │  /  Q  \   SUNLU        │
      │ |   R   |  PLA          │
      │ |  CODE |  Galaxy Black │
      │  \     /   210°C / 60°C │
      │   \---/                 │
      │   240x240 px (203 DPI)  │
      └─────────────────────────┘
```

- **Canvas Size**: 30mm round diameter = **240 x 240 pixels** at 203 DPI.
- **Embedded Payload**: Standard URI format `bambuddy://spool?uuid=<tray_uuid>&id=<spool_id>`.
- **Text Elements**: Brand Name, Material Type, Color Name, Nozzle/Bed Target Temps.

---

## Part 4: Technical Implementation Plan

### Component 1: PrintBuddy Backend Server (`printBuddy`)

#### [NEW] [qr_label.py](file:///Users/anuragdeshpande/IdeaProjects/printBuddy/backend/app/api/routes/qr_label.py)
- Endpoint `GET /api/v1/inventory/spools/{id}/qr-code`: Generates PNG/SVG QR code image for a spool.
- Endpoint `POST /api/v1/spoolbuddy/qr/scan`: Translates scanned QR URI payloads into the standard `nfc_tag_scanned` pipeline so Spoolman, inventory matching, and WebSockets treat QR scans identically to NFC taps.

---

### Component 2: BuddyDash Android App (`BuddyDash`)

#### [NEW] [PhomemoBluetoothPrinter.kt](file:///Users/anuragdeshpande/IdeaProjects/BuddyDash/app/src/main/java/com/chronoswing/buddydash/printer/PhomemoBluetoothPrinter.kt)
- Manages Bluetooth RFCOMM socket connections (`00001101-0000-1000-8000-00805F9B34FB`).
- Encodes Android Jetpack Compose bitmaps into ESC/POS & TSPL 1-bit raster binary blocks (`1D 76 30 00 ...`).

#### [NEW] [StickerRenderer.kt](file:///Users/anuragdeshpande/IdeaProjects/BuddyDash/app/src/main/java/com/chronoswing/buddydash/printer/StickerRenderer.kt)
- Uses ZXing (`com.google.zxing:core`) to render 240x240 px monochrome bitmaps for 30mm circular thermal labels.

#### [NEW] [QrCodeScannerActivity.kt](file:///Users/anuragdeshpande/IdeaProjects/BuddyDash/app/src/main/java/com/chronoswing/buddydash/ui/QrCodeScannerActivity.kt)
- CameraX + Google ML Kit Barcode Scanning integration for instant, offline QR code scanning.

---

## Part 5: Verification & Safety Checklist

- [ ] Verify ESC/POS raster byte generation for 203 DPI Phomemo printers.
- [ ] Verify offline CameraX QR scanning speed (< 100ms detection).
- [ ] Verify seamless server translation of QR URIs to `nfc_tag_scanned` Spoolman events.
- [ ] Ensure Bluetooth SPP permissions (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`) follow Android 12+ runtime prompt rules.
