# PrintBuddy Multi-Brand Feature & Protocol Compatibility Report

---

## Part 1: Elegoo CC1 Print Start Latency Analysis

### Why Elegoo CC1 Takes Longer to Start a Print Than BambuLab

Based on system execution timing and protocol traces, **Elegoo print start latency is driven by 3 protocol-level differences**:

1. **FTP vs. HTTP Chunked Multipart Upload**:
   - **BambuLab**: Uploads via FTPS/FTP in large binary streams.
   - **Elegoo CC1**: The Elegoo HTTP SDCP protocol requires uploading G-code files over HTTP POST in **1MB chunked multipart form uploads** (`/uploadFile/upload`). For large G-code files (e.g. 16.8MB `0384 - Rayquaza`), the system splits the file into 17 individual HTTP POST requests. Each POST chunk includes MD5 checksum computation, HTTP handshake overhead, and disk sync confirmation on the printer side.
   
2. **Sequential Pre-flight File Verification & SDCP State Ack**:
   - **BambuLab**: Uses asynchronous MQTT publish commands (`start_print`) which acknowledge instantly while the printer processes preheating in the background.
   - **Elegoo CC1**: Upon receiving the complete file upload, the HTTP endpoint verifies the file checksum and checks memory before acknowledging `code: "000000"`. Only after this HTTP cycle finishes does PrintBuddy issue the `start_print` SDCP command over WebSocket/HTTP.

3. **Preheat & Calibration Sequence Order**:
   - **Elegoo CC1**: Firmware executes strict synchronous preparation steps (`File Checking (10) -> Platform Auto Check (11) -> Bed Preheating (16) -> Bed Leveling (15)`). The printer status remains reported as `PREPARE` until all initial checks finish, making the print start appear delayed on the UI dashboard until motion starts.

---

## Part 2: PrintBuddy Feature Compatibility Matrix

The table below outlines **all out-of-the-box BambuLab features** supported in PrintBuddy mainline code, alongside their current compatibility status for **Elegoo** (Centauri Carbon / CC2) and **Flashforge** (Creator 5 / Multi-Toolhead).

| Feature / Capability | BambuLab | Elegoo (CC1/CC2) | Flashforge (Creator 5) | Implementation & Compatibility Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Real-time Telemetry (Nozzle/Bed/Chamber Temp)** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Multi-toolhead telemetry supported for Flashforge (T0/T1). |
| **Print Queue & Auto-Dispatch** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Queue dispatch works across all brands. |
| **FTP / File Storage Uploads** | ✅ FTPS / FTP | ⚠️ HTTP Multipart | ✅ HTTP REST (Port 8898) | Elegoo uses HTTP 1MB chunked upload. |
| **3MF Container & Metadata Parsing** | ✅ Fully Supported | ⚠️ Partial | ⚠️ Partial | Bambu embeds full 3MF `slice_info`. Elegoo/FF use `.gcode` headers for thumbnails. |
| **G-code Header Thumbnail Extraction** | N/A (`.3mf`) | ✅ Supported | ✅ Supported | Extract base64 PNGs directly from `; thumbnail begin` comments. |
| **Multi-Material / Color Slot Mapping** | ✅ AMS & AMS-HT | ❌ No AMS | ⚠️ Dual-Toolhead (T0/T1) | Flashforge maps T0/T1 nozzle swatches & active toolhead. |
| **Filament Inventory & Spoolman Sync** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Weight tracking & usage logging supported across all models. |
| **Bed Leveling / Flow / Vibration Prep Toggles** | ✅ Fully Supported | ⚠️ Auto-Managed | ⚠️ Auto-Managed | Bambu exposes explicit MQTT prep flags; Elegoo/FF handle in G-code. |
| **Live Camera Feed & MJPEG Streaming** | ✅ RTSP / Chamber | ✅ Web Camera | ✅ MJPEG Stream | Flashforge exposes MJPEG snapshot at `http://<ip>:8080/?action=snapshot`. |
| **Virtual Printer Discovery & Slicer Proxy** | ✅ SSDP + Proxy | ✅ Elegoo Link HTTP | ✅ Virtual Printer SSDP | Slicer direct send supported via virtual printer layer. |
| **Automatic SD Card Cleanup** | ✅ Supported | ❌ Not Needed | ❌ Not Needed | Bambu auto-cleans root SD card to prevent phantom prints. |
| **Stale Print Reconciliation** | ✅ Supported | ✅ Guarded | ✅ Guarded | Reconciliation protected against false cancels during heating/prep. |
| **Smart Plug Auto-Off Cooldown** | ✅ Fully Supported | ✅ Supported | ✅ Supported | Event-driven bed cooldown trigger works across all connected printers. |
| **HMS Error Code & Notification Relay** | ✅ Fully Supported | ⚠️ Basic Errors | ⚠️ Basic Errors | Bambu HMS code lookup database available. |

---

## Part 3: Recommended Optimizations for Elegoo Print Start Latency

1. **Parallel/Pipeline HTTP Uploads**: Increase the `httpx.AsyncClient` chunk upload concurrency or stream buffer size for Elegoo `/uploadFile/upload` POSTs to reduce transfer time on large files.
2. **Immediate Dashboard UI State Transition**: Update frontend queue card to reflect `Preheating / Transferring` state instantly upon queue dispatch rather than waiting for printer state feedback.
