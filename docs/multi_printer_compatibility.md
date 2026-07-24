# Comprehensive PrintBuddy Multi-Brand Architectural Audit & Feature Matrix

---

## 1. Executive System Overview

This report provides a full audit of all features in the PrintBuddy codebase, evaluating out-of-the-box BambuLab capabilities against current support for **Elegoo** (Centauri Carbon / CC2) and **Flashforge** (Creator 5 / Multi-Toolhead).

---

## 2. Complete Module-by-Module Feature Matrix

### Module 1: Print Queue & Scheduling Core

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Architectural Details & Implementation Status |
| :--- | :---: | :---: | :---: | :--- |
| **Multi-Queue Priority & Shortest Job First (SJF)** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Brand-agnostic queue scheduling algorithms. |
| **Automatic Job Dispatch & Manual Start Gating** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Manual start gating & queue auto-dispatch works for all printers. |
| **Plate-Level Granular Dispatch (`plate_id`)** | ✅ Fully Supported | ⚠️ Single Plate | ⚠️ Single Plate | Multi-plate 3MF dispatches each plate sequentially; G-code files dispatch as single-plate jobs. |
| **Workflow Toggles (Bed Leveling, Flow Cali, Vibration)** | ✅ Fully Supported | ⚠️ Firmware Managed | ⚠️ Firmware Managed | Bambu exposes explicit MQTT prep flags; Elegoo & Flashforge manage pre-flight routines in firmware/gcode. |
| **G-code Injection (Start/End Snippets)** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Pre/post-print custom G-code snippets inject cleanly into G-code streams. |
| **Bed Cooldown Gate & Plate Clear Waiter** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Event-driven bed temp monitoring delays next queue item until bed cools down below threshold. |

---

### Module 2: File Uploads, Archives & Metadata Extraction

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Architectural Details & Implementation Status |
| :--- | :---: | :---: | :---: | :--- |
| **File Transfer Transport Protocol** | ✅ FTPS / FTP | ✅ Optimized HTTP | ✅ HTTP REST (Port 8898) | **Optimized**: Elegoo HTTP chunk size increased to 2MB with persistent connection pooling (`httpx.Limits`). |
| **3MF Container Extraction & `slice_info.config`** | ✅ Fully Supported | ⚠️ G-code Header Fallback | ⚠️ G-code Header Fallback | Bambu parses internal ZIP XMLs; Elegoo/FF extract parameters directly from comment headers. |
| **Cover & Thumbnail Generation** | ✅ `Metadata/plate_N.png` | ✅ Embedded G-code PNGs | ✅ Embedded G-code PNGs | `extract_gcode_thumbnail` parses base64 comment blocks for G-code uploads. |
| **Automatic Duplicate Hash Detection (SHA-256)** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Hashes destination files for exact duplicate group warnings. |
| **Soft Delete, Batch Purge & Restores** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Archive database operations work identically across all brands. |

---

### Module 3: Filament Inventory, Spoolman & AMS Integration

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Architectural Details & Implementation Status |
| :--- | :---: | :---: | :---: | :--- |
| **AMS & AMS-HT Multi-Slot State Sync** | ✅ 4-Slot Trays + AMS-HT | ❌ Single Extruder | ⚠️ Dual Toolhead (T0/T1) | Flashforge tracks T0/T1 nozzle swatches & active toolhead; Elegoo reports single slot. |
| **Color & Material Matching (`ams_mapping`)** | ✅ Dynamic Slot Mapping | ❌ Direct Feed | ⚠️ Toolhead Swatches | Slicer `ams_mapping` popups pass slot choices dynamically. |
| **Spoolman API & Inventory Sync** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Spool tracking, weight deduction, and vendor sync work across all brands. |
| **Filament Deficit Pre-Dispatch Blocker** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Checks estimated print grams against remaining spool weight before starting. |
| **Automatic Spool Weight Deduction** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Deducts used grams from database spools upon print completion. |

---

### Module 4: Print History, Analytics & Energy Monitoring

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Architectural Details & Implementation Status |
| :--- | :---: | :---: | :---: | :--- |
| **Print Log Entries & User Attribution** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Tracks print history, print time, material used, and creator ID. |
| **Smart Plug Power Monitoring & kWh Cost** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Integrates with Tasmota/Kasa plugs to record energy usage per print. |
| **Smart Plug Auto Power-Off Cooldown** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Automatically powers off smart plug after bed cools down. |
| **Analytics Dashboard & Cost Reports** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Aggregates material cost, electricity cost, success rate, and total print time. |

---

### Module 5: Virtual Printer, Slicer Direct-Send & Connectivity

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Architectural Details & Implementation Status |
| :--- | :---: | :---: | :---: | :--- |
| **SSDP Network Discovery** | ✅ SSDP Server | ✅ Elegoo Link Host | ✅ SSDP Discovery | Slicers discover virtual printers on the local network. |
| **Slicer Direct Upload Intake (`/api/upload`)** | ✅ Virtual FTPS/MQTT | ✅ Elegoo Link HTTP | ✅ VP SSDP Intake | Direct "Send to Printer" from OrcaSlicer / Elegoo Link supported. |
| **Camera Stream Passthrough** | ✅ RTSP / Chamber | ✅ Web Camera | ✅ MJPEG Stream | Flashforge exposes MJPEG snapshot at `http://<ip>:8080/?action=snapshot`. |

---

## 3. Implemented Elegoo Latency Optimization

### Upload Throughput Enhancement (`upload_elegoo_file_async`)

We upgraded the Elegoo HTTP chunked transport layer in `backend/app/services/print_scheduler.py`:
- **Buffer Size Upgrade**: Doubled the chunk buffer size from **1 MB to 2 MB**, halving the total number of HTTP POST requests required per print.
- **Persistent HTTP Connection Pooling**: Configured `httpx.Limits(max_keepalive_connections=5, max_connections=10)` with a 30s timeout to reuse TCP sockets across chunk uploads, eliminating per-chunk socket handshake latency.
