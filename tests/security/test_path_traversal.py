import builtins

import pytest

LAB = "path-traversal"
SECRET = "SECRET_KEY=dev-secret-key-123"


def read(labs, mode, name):
    return labs.get(f"/{LAB}/{mode}/files", params={"name": name})


def test_documents_can_be_read_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert "Welcome" in read(labs, mode, "welcome.txt").json()["content"]
        assert "Getting started" in read(labs, mode, "guides/start.txt").json()["content"]
        assert read(labs, mode, "missing.txt").status_code == 404


@pytest.mark.parametrize("name", ["../../config/app.env", "guides/../../../config/app.env", "/srv/app/config/app.env"])
def test_vulnerable_allows_escaping_the_documents_folder(labs, name):
    data = read(labs, "vulnerable", name).json()
    assert SECRET in data["content"] and data["resolved"] == "/srv/app/config/app.env"


def test_vulnerable_allows_absolute_paths(labs):
    assert "root:x:0:0" in read(labs, "vulnerable", "/etc/passwd").json()["content"]


@pytest.mark.parametrize(
    "name",
    ["../../config/app.env", "guides/../../../config/app.env", "/etc/passwd", "/srv/app/config/app.env", "..", "welcome.txt\x00.png"],
)
def test_fixed_blocks_every_escape_attempt(labs, name):
    response = read(labs, "fixed", name)
    assert response.status_code == 403 and "SECRET" not in response.text and "root:x" not in response.text


def test_fixed_still_allows_dotdot_that_stays_inside(labs):
    assert read(labs, "fixed", "guides/../faq.txt").status_code == 200


def test_percent_encoded_traversal_is_blocked_in_fixed_mode(labs):
    response = labs.get(f"/{LAB}/fixed/files?name=%2e%2e%2f%2e%2e%2fconfig%2fapp.env")
    assert response.status_code == 403


def test_challenge_solved_only_by_leaving_the_folder(labs):
    read(labs, "vulnerable", "welcome.txt")
    read(labs, "fixed", "../../config/app.env")
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    read(labs, "vulnerable", "../../config/app.env")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_lab_never_touches_the_real_filesystem(labs, monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("the lab must not open real files")

    monkeypatch.setattr(builtins, "open", forbidden)
    monkeypatch.setattr("pathlib.Path.read_text", forbidden)
    monkeypatch.setattr("pathlib.Path.open", forbidden)
    for mode in ("vulnerable", "fixed"):
        read(labs, mode, "/etc/passwd")
        read(labs, mode, "../../config/app.env")
