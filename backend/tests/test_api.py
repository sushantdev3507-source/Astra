import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png_bytes(width=10, height=10) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(255, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


def test_health_check():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "astra-backend"


def test_upload_valid_png():
    files = {"file": ("test.png", _png_bytes(20, 15), "image/png")}
    resp = client.post("/api/assets/upload", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["asset"]["type"] == "image"
    assert body["asset"]["width"] == 20
    assert body["asset"]["height"] == 15
    assert body["asset"]["name"] == "test.png"

    # File should now be retrievable
    asset_id = body["asset"]["id"]
    file_resp = client.get(f"/api/assets/{asset_id}/file")
    assert file_resp.status_code == 200


def test_upload_invalid_extension():
    files = {"file": ("malware.exe", b"not an image", "application/octet-stream")}
    resp = client.post("/api/assets/upload", files=files)
    assert resp.status_code == 400
    assert "Unsupported file extension" in resp.json()["detail"]


def test_upload_spoofed_extension():
    # .png extension but not actually valid image bytes
    files = {"file": ("fake.png", b"this is not really a png", "image/png")}
    resp = client.post("/api/assets/upload", files=files)
    assert resp.status_code == 400
    assert "valid image" in resp.json()["detail"]


def test_upload_empty_file():
    files = {"file": ("empty.png", b"", "image/png")}
    resp = client.post("/api/assets/upload", files=files)
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"]


def test_get_nonexistent_asset():
    resp = client.get("/api/assets/asset_doesnotexist/file")
    assert resp.status_code == 404


def test_path_traversal_rejected():
    resp = client.get("/api/assets/..%2F..%2Fetc%2Fpasswd/file")
    # FastAPI/starlette will treat this as an id with slashes -> our guard returns 404
    assert resp.status_code in (404, 400)


def test_v1_health_check():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_v1_upload_and_metadata_lookup():
    files = {"file": ("meta.png", _png_bytes(64, 48), "image/png")}
    upload_resp = client.post("/api/v1/assets/upload", files=files)
    assert upload_resp.status_code == 200
    asset_id = upload_resp.json()["asset"]["id"]

    meta_resp = client.get(f"/api/v1/assets/{asset_id}")
    assert meta_resp.status_code == 200
    body = meta_resp.json()
    assert body["success"] is True
    assert body["asset"]["name"] == "meta.png"
    assert body["asset"]["width"] == 64
    assert body["asset"]["height"] == 48


def test_metadata_lookup_nonexistent():
    resp = client.get("/api/v1/assets/asset_doesnotexist")
    assert resp.status_code == 404


def test_save_edit_result():
    files = {"file": ("source.png", _png_bytes(30, 30), "image/png")}
    upload_resp = client.post("/api/v1/assets/upload", files=files)
    asset_id = upload_resp.json()["asset"]["id"]

    result_files = {"file": ("edited.png", _png_bytes(30, 30), "image/png")}
    result_resp = client.post(f"/api/v1/assets/{asset_id}/result", files=result_files)
    assert result_resp.status_code == 200
    body = result_resp.json()
    assert body["assetId"] == asset_id
    assert body["status"] == "saved"
    assert body["resultAssetId"] != asset_id

    # The saved result should itself be fetchable as a file.
    file_resp = client.get(f"/api/v1/assets/{body['resultAssetId']}/file")
    assert file_resp.status_code == 200
