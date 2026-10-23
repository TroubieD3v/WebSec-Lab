PAYLOAD = "<img src=x onerror=alert(1)>"
LAB = "stored-xss"


def post(labs, mode, author="Eve", text="hi"):
    return labs.post(f"/{LAB}/{mode}/comments", json={"author": author, "text": text})


def page(labs, mode):
    return labs.get(f"/{LAB}/{mode}/page")


def test_comments_are_shown_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert post(labs, mode, "Alice", "hello world").status_code == 201
        assert "hello world" in page(labs, mode).text


def test_payload_is_stored_verbatim_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        post(labs, mode, text=PAYLOAD)
        stored = labs.get(f"/{LAB}/{mode}/comments").json()["comments"]
        assert stored[-1]["text"] == PAYLOAD  # no input sanitising: encoding happens on output


def test_vulnerable_renders_stored_markup_for_every_visitor(labs):
    post(labs, "vulnerable", text=PAYLOAD)
    for _ in range(2):  # persists across page loads
        assert PAYLOAD in page(labs, "vulnerable").text
    assert "content-security-policy" not in page(labs, "vulnerable").headers


def test_vulnerable_author_field_is_also_injectable(labs):
    post(labs, "vulnerable", author="<script>alert(1)</script>")
    assert "<script>alert(1)</script>" in page(labs, "vulnerable").text


def test_fixed_encodes_text_and_author(labs):
    post(labs, "fixed", author="<script>alert(1)</script>", text=PAYLOAD)
    body = page(labs, "fixed").text
    assert PAYLOAD not in body and "<script>alert(1)" not in body
    assert "&lt;img src=x onerror=alert(1)&gt;" in body


def test_fixed_sends_csp(labs):
    csp = page(labs, "fixed").headers["content-security-policy"]
    assert "script-src 'self'" in csp and "default-src 'none'" in csp


def test_modes_have_separate_storage_and_clear_works(labs):
    post(labs, "vulnerable", text="only-here")
    assert "only-here" not in page(labs, "fixed").text
    labs.delete(f"/{LAB}/vulnerable/comments")
    assert "only-here" not in page(labs, "vulnerable").text


def test_comment_count_and_size_are_capped(labs):
    for i in range(40):
        post(labs, "fixed", text=f"c{i}")
    assert len(labs.get(f"/{LAB}/fixed/comments").json()["comments"]) == 30
    assert post(labs, "fixed", text="x" * 501).status_code == 422


def test_beacon_marks_challenge_only_in_vulnerable_mode(labs):
    labs.get(f"/{LAB}/fixed/beacon")
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    labs.get(f"/{LAB}/vulnerable/beacon")
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_lab_script_is_scoped_to_this_lab(labs):
    script = labs.get(f"/{LAB}/static/lab.js").text
    assert "'stored-xss'" in script and "/stored-xss/" in script


def test_reset_clears_comments(labs):
    post(labs, "vulnerable", text="gone")
    labs.post(f"/{LAB}/reset")
    assert labs.get(f"/{LAB}/vulnerable/comments").json()["comments"] == []
