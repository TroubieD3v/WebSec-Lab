LAB = "file-upload"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
HTML = b"<h1>pwned</h1><script>parent.postMessage('x','*')</script>"


def upload(labs, mode, name, data, content_type):
    return labs.post(f"/{LAB}/{mode}/upload", files={"file": (name, data, content_type)})


def fetch(labs, mode, filename):
    return labs.get(f"/{LAB}/{mode}/uploads/{filename}")


def test_valid_png_can_be_uploaded_and_served_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        response = upload(labs, mode, "avatar.png", PNG, "image/png")
        assert response.status_code == 201
        served = fetch(labs, mode, response.json()["filename"])
        assert served.status_code == 200 and served.content == PNG
        assert served.headers["content-type"].startswith("image/png")


def test_vulnerable_serves_html_with_the_attacker_chosen_type(labs):
    name = upload(labs, "vulnerable", "evil.html", HTML, "text/html").json()["filename"]
    served = fetch(labs, "vulnerable", name)
    assert served.headers["content-type"].startswith("text/html") and b"<script>" in served.content
    assert "content-disposition" not in served.headers


def test_vulnerable_keeps_the_client_filename_and_accepts_svg(labs):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'
    assert upload(labs, "vulnerable", "x.svg", svg, "image/svg+xml").json()["filename"] == "x.svg"
    assert fetch(labs, "vulnerable", "x.svg").headers["content-type"].startswith("image/svg+xml")


def test_fixed_rejects_active_content_by_extension(labs):
    for name, data, ctype in (("evil.html", HTML, "text/html"), ("x.svg", b"<svg/>", "image/svg+xml"), ("run.js", b"alert(1)", "text/javascript")):
        assert upload(labs, "fixed", name, data, ctype).status_code == 415


def test_fixed_rejects_a_polyglot_with_a_fake_extension_and_type(labs):
    assert upload(labs, "fixed", "avatar.png", HTML, "image/png").status_code == 415
    assert upload(labs, "fixed", "avatar.PNG.html", PNG, "image/png").status_code == 415


def test_fixed_uses_random_server_side_names_and_hardened_headers(labs):
    first = upload(labs, "fixed", "../../etc/avatar.png", PNG, "image/png").json()["filename"]
    second = upload(labs, "fixed", "avatar.png", PNG, "image/png").json()["filename"]
    assert first != second and "/" not in first and first.endswith(".png") and len(first) == 20
    headers = fetch(labs, "fixed", first).headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["content-disposition"] == "attachment" and "sandbox" in headers["content-security-policy"]


def test_fixed_serves_the_stored_type_not_the_declared_one(labs):
    name = upload(labs, "fixed", "a.jpg", b"\xff\xd8\xff" + b"0" * 10, "text/html").json()["filename"]
    assert fetch(labs, "fixed", name).headers["content-type"].startswith("image/jpeg")


def test_oversized_uploads_are_rejected_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert upload(labs, mode, "big.png", PNG + b"0" * 40_000, "image/png").status_code == 413


def test_storage_is_capped_and_modes_are_separate(labs):
    for i in range(45):
        upload(labs, "vulnerable", f"f{i}.png", PNG, "image/png")
    assert len(labs.get(f"/{LAB}/vulnerable/files").json()["files"]) == 40
    assert labs.get(f"/{LAB}/fixed/files").json()["files"] == []


def test_nothing_is_written_to_disk(labs, tmp_path, monkeypatch):
    import os

    monkeypatch.chdir(tmp_path)
    upload(labs, "vulnerable", "evil.html", HTML, "text/html")
    upload(labs, "fixed", "ok.png", PNG, "image/png")
    assert list(tmp_path.iterdir()) == [] and not os.path.exists("evil.html")


def test_challenge_solved_only_when_active_content_is_served(labs):
    name = upload(labs, "vulnerable", "evil.html", HTML, "text/html").json()["filename"]
    assert labs.get(f"/{LAB}/status").json()["solved"] is False  # uploading alone is not enough
    png = upload(labs, "vulnerable", "ok.png", PNG, "image/png").json()["filename"]
    fetch(labs, "vulnerable", png)
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    fetch(labs, "vulnerable", name)
    assert labs.get(f"/{LAB}/status").json()["solved"] is True
