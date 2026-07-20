import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio

from backend.app.services.flashforge_client import FlashforgeClient, is_flashforge_model
from backend.app.services.bambu_mqtt import PrinterState

def test_is_flashforge_model():
    assert is_flashforge_model("Flashforge Creator 5") is True
    assert is_flashforge_model("Creator 5") is True
    assert is_flashforge_model("FF-C5") is True
    assert is_flashforge_model("Adventurer 5M") is True
    assert is_flashforge_model("Bambu X1C") is False
    assert is_flashforge_model("Elegoo CC1") is False
    assert is_flashforge_model(None) is False

class TestFlashforgeClient:
    @pytest.fixture
    def client(self):
        return FlashforgeClient(
            ip_address="192.168.1.180",
            serial_number="FF500A123",
            access_code="CheckCode123",
            model="Creator 5",
        )

    def test_init(self, client):
        assert client.ip_address == "192.168.1.180"
        assert client.serial_number == "FF500A123"
        assert client.access_code == "CheckCode123"
        assert client.model == "Creator 5"
        assert isinstance(client.state, PrinterState)
        assert client.connected is False
        assert len(client.state.nozzles) == 2

    def test_update_state_multi_toolhead(self, client):
        payload = {
            "machine_status": "BUILDING",
            "nozzle_temp_0": 215.0,
            "nozzle_target_0": 220.0,
            "nozzle_temp_1": 210.0,
            "nozzle_target_1": 210.0,
            "bed_temp": 60.0,
            "bed_target": 60.0,
            "chamber_temp": 45.0,
            "chamber_target": 50.0,
            "active_extruder": 1,
            "tool0_material": "PLA",
            "tool0_color": "FF0000",
            "tool1_material": "PETG",
            "tool1_color": "00FF00",
            "cooling_fan": 100,
            "aux_fan": 50,
            "chamber_light": True,
            "print_filename": "dual_color_riser.gcode",
            "progress": 45.5,
            "current_layer": 22,
            "total_layers": 100,
            "remaining_time_min": 35,
        }

        client._update_state(payload)

        assert client.state.connected is True
        assert client.state.state == "RUNNING"
        assert client.state.stg_cur == 0
        assert client.state.temperatures["nozzle_0"] == 215.0
        assert client.state.temperatures["nozzle_1"] == 210.0
        assert client.state.temperatures["bed"] == 60.0
        assert client.state.temperatures["chamber"] == 45.0
        assert client.state.active_extruder == 1
        assert client.state.ams_exists is True
        assert len(client.state.ams[0]["tray"]) == 2
        assert client.state.ams[0]["tray"][0]["tray_color"] == "FF0000FF"
        assert client.state.ams[0]["tray"][1]["tray_color"] == "00FF00FF"
        assert client.state.cooling_fan_speed == 100
        assert client.state.chamber_light is True
        assert client.state.current_print == "dual_color_riser.gcode"
        assert client.state.progress == 45.5
        assert client.state.layer_num == 22
        assert client.state.remaining_time == 35

    def test_update_state_preparation_stages(self, client):
        payload = {
            "machine_status": "PREPARE_HEATING",
            "nozzle_temp_0": 120.0,
            "nozzle_target_0": 220.0,
            "bed_temp": 40.0,
            "bed_target": 60.0,
            "print_filename": "prep_test.gcode",
        }

        client._update_state(payload)

        assert client.state.state == "PREPARE"
        assert client.state.stg_cur == 2  # Heatbed preheating

    def test_control_commands(self, client):
        with patch.object(client, "_send_command", return_value=True) as mock_send:
            assert client.start_print("test.gcode") is True
            mock_send.assert_called_with({"cmd": "start_print", "file": "test.gcode"})

            assert client.pause_print() is True
            mock_send.assert_called_with({"cmd": "pause_print"})

            assert client.resume_print() is True
            mock_send.assert_called_with({"cmd": "resume_print"})

            assert client.stop_print() is True
            mock_send.assert_called_with({"cmd": "cancel_print"})

            assert client.set_nozzle_temperature(230, nozzle_index=1) is True
            mock_send.assert_called_with({"cmd": "set_temperature", "nozzle_index": 1, "target": 230})

            assert client.set_bed_temperature(65) is True
            mock_send.assert_called_with({"cmd": "set_temperature", "type": "bed", "target": 65})

            assert client.set_fan_speed(1, 255) is True
            mock_send.assert_called_with({"cmd": "set_fan", "fan_id": 1, "speed": 100})

            assert client.select_toolhead(1) is True
            mock_send.assert_called_with({"cmd": "select_tool", "tool": 1})
