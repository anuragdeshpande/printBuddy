import asyncio
import json
import logging
import time
import websockets

logger = logging.getLogger(__name__)


class ElegooSDCPServer:
    """Async WebSocket server operating on port 3030 for OrcaSlicer Elegoo Link (SDCP) protocol.

    OrcaSlicer's Elegoo Link client connects to ws://<host>:3030/websocket after uploading
    a print file to issue the start-print command and check SDCP printer status.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 3030):
        self.host = host
        self.port = port
        self._server = None

    async def _handle_connection(self, websocket, path: str = ""):
        remote = getattr(websocket, "remote_address", "unknown")
        logger.info("Elegoo SDCP WebSocket client connected from %s (path=%s)", remote, path)
        try:
            async for message in websocket:
                logger.info("Elegoo SDCP WS received: %s", message)
                try:
                    data = json.loads(message)
                    req_data = data.get("Data", {})
                    cmd = req_data.get("Cmd")
                    req_id = req_data.get("RequestID", "")
                    mainboard_id = req_data.get("MainboardID") or "20P90A391800002"

                    if cmd == 0:  # ELEGOO_GET_STATUS
                        resp = {
                            "Id": req_id,
                            "Status": {
                                "CurrentStatus": [0],
                                "PrintStatus": 0,
                            },
                            "Data": {
                                "Cmd": 0,
                                "Data": {"Ack": 0},
                                "RequestID": req_id,
                                "MainboardID": mainboard_id,
                                "TimeStamp": int(time.time() * 1000),
                            },
                            "Topic": f"sdcp/response/{mainboard_id}",
                        }
                        await websocket.send(json.dumps(resp))

                    elif cmd == 128:  # ELEGOO_START_PRINT
                        file_info = req_data.get("Data", {})
                        filename = file_info.get("Filename", "")
                        logger.info("Elegoo SDCP Start Print command for file %s", filename)

                        resp = {
                            "Id": req_id,
                            "Data": {
                                "Cmd": 128,
                                "Data": {
                                    "Ack": 0
                                },
                                "RequestID": req_id,
                                "MainboardID": mainboard_id,
                                "TimeStamp": int(time.time() * 1000),
                            },
                            "Topic": f"sdcp/response/{mainboard_id}",
                        }
                        await websocket.send(json.dumps(resp))
                    else:
                        resp = {
                            "Id": req_id,
                            "Status": {"CurrentStatus": [0]},
                            "Data": {
                                "Cmd": cmd or 0,
                                "Data": {"Ack": 0},
                                "RequestID": req_id,
                                "MainboardID": mainboard_id,
                                "TimeStamp": int(time.time() * 1000),
                            },
                            "Topic": f"sdcp/response/{mainboard_id}",
                        }
                        await websocket.send(json.dumps(resp))
                except Exception as e:
                    logger.error("Error processing Elegoo SDCP WS message: %s", e)
        except Exception as e:
            logger.info("Elegoo SDCP WS client disconnected: %s", e)

    async def start(self):
        try:
            self._server = await websockets.serve(self._handle_connection, self.host, self.port)
            logger.info("Elegoo SDCP WebSocket server listening on %s:%d", self.host, self.port)
        except Exception as e:
            logger.error("Failed to start Elegoo SDCP WebSocket server on port %d: %s", self.port, e)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            logger.info("Elegoo SDCP WebSocket server stopped")


elegoo_sdcp_server = ElegooSDCPServer()
