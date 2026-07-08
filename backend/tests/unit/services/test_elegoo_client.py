import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio

from backend.app.services.elegoo_client import ElegooCentauriClient, is_elegoo_model
from backend.app.services.bambu_mqtt import PrinterState
from pycentauri.models import Status, Attributes, PrintInfo

def test_is_elegoo_model():
    assert is_elegoo_model("Centauri Carbon") is True
    assert is_elegoo_model("CC1") is True
    assert is_elegoo_model("CC2") is True
    assert is_elegoo_model("Elegoo CC2") is True
    assert is_elegoo_model("Bambu X1C") is False
    assert is_elegoo_model(None) is False

class TestElegooCentauriClient:
    @pytest.fixture
    def client(self):
        return ElegooCentauriClient(
            ip_address="192.168.1.150",
            serial_number="ELEGOO123",
            access_code="Abcd12",
            model="CC2",
        )

    def test_init(self, client):
        assert client.ip_address == "192.168.1.150"
        assert client.serial_number == "ELEGOO123"
        assert client.access_code == "Abcd12"
        assert client.model == "CC2"
        assert isinstance(client.state, PrinterState)
        assert client.connected is False

    @patch("backend.app.services.elegoo_client.connect_auto", new_callable=AsyncMock)
    @pytest.mark.asyncio
    async def test_async_connect(self, mock_connect, client):
        # Setup mocks
        mock_printer = MagicMock()
        mock_printer.attributes = AsyncMock(return_value=MagicMock(firmware_version="V1.0"))
        mock_connect.return_value = mock_printer
        
        # Connect client
        client._loop = asyncio.get_running_loop()
        await client._async_connect()
        
        assert client.state.connected is True
        assert client.state.firmware_version == "V1.0"
        mock_connect.assert_called_once_with(
            "192.168.1.150",
            access_code="Abcd12",
            enable_control=True
        )

    def test_update_state(self, client):
        # Construct mock status
        status_payload = {
            "TempOfNozzle": 210,
            "TempTargetNozzle": 220,
            "TempOfHotbed": 60,
            "TempTargetHotbed": 60,
            "CurrentFanSpeed": {
                "ModelFan": 80,
                "AuxiliaryFan": 50,
                "BoxFan": 0,
            },
            "LightStatus": {
                "SecondLight": 1,
            },
            "PrintInfo": {
                "Status": 13,  # Printing
                "Filename": "test_job.gcode",
                "Progress": 42,
                "CurrentLayer": 15,
                "TotalLayer": 150,
                "PrintSpeedPct": 100,
            }
        }
        status = Status.from_payload(status_payload)
        
        # Update client state
        client._update_state(status)
        
        # Verify telemetry mapping
        assert client.state.temperatures["nozzle"] == 210.0
        assert client.state.temperatures["nozzle_target"] == 220.0
        assert client.state.temperatures["bed"] == 60.0
        assert client.state.temperatures["bed_target"] == 60.0
        assert client.state.cooling_fan_speed == 80
        assert client.state.big_fan1_speed == 50
        assert client.state.big_fan2_speed == 0
        assert client.state.chamber_light is True
        assert client.state.current_print == "test_job.gcode"
        assert client.state.progress == 42.0
        assert client.state.layer_num == 15
        assert client.state.total_layers == 150
        assert client.state.speed_level == 2  # balanced
        assert client.state.state == "RUNNING"

    def test_control_commands(self, client):
        client._printer = MagicMock()
        client._printer.stop = AsyncMock()
        client._printer.pause = AsyncMock()
        client._printer.resume = AsyncMock()
        client._printer.set_print_speed = AsyncMock()
        client._printer.set_temperatures = AsyncMock()
        client._printer.set_fan_speed = AsyncMock()
        client._loop = MagicMock()
        
        # Test stop
        assert client.stop_print() is True
        client._loop.create_task.assert_called()
        
        # Test pause
        assert client.pause_print() is True
        
        # Test resume
        assert client.resume_print() is True
        
        # Test speed level (silent = 1 -> "silent")
        assert client.set_print_speed(1) is True
        
        # Test temp setting
        assert client.set_nozzle_temperature(230) is True
        assert client.set_bed_temperature(65) is True
        
        # Test fan speed mapping
        # fan_id=1 (part) -> model fan, pwm 128 -> ~50%
        assert client.set_fan_speed(1, 128) is True
