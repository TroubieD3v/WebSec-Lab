ALICE = {"Authorization": "Bearer alice-demo-token"}
BOB = {"Authorization": "Bearer bob-demo-token"}


def get(labs, mode, booking, headers):
    return labs.get(f"/idor/{mode}/bookings/{booking}", headers=headers)


def test_owner_can_read_own_booking_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert get(labs, mode, 101, ALICE).json()["owner"] == "alice"


def test_authentication_is_required_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert get(labs, mode, 101, {}).status_code == 401
        assert get(labs, mode, 101, {"Authorization": "Bearer nope"}).status_code == 401


def test_vulnerable_exposes_other_users_booking(labs):
    response = get(labs, "vulnerable", 102, ALICE)
    assert response.status_code == 200 and response.json()["owner"] == "bob"
    assert get(labs, "vulnerable", 101, BOB).json()["owner"] == "alice"


def test_fixed_denies_other_users_booking(labs):
    assert get(labs, "fixed", 102, ALICE).status_code == 403
    assert get(labs, "fixed", 101, BOB).status_code == 403


def test_missing_booking_is_404_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert get(labs, mode, 999, ALICE).status_code == 404


def test_listing_only_shows_own_bookings(labs):
    for mode in ("vulnerable", "fixed"):
        listing = labs.get(f"/idor/{mode}/bookings", headers=ALICE).json()["bookings"]
        assert {b["owner"] for b in listing} == {"alice"}


def test_challenge_solved_after_cross_user_read(labs):
    get(labs, "vulnerable", 101, ALICE)
    assert labs.get("/idor/status").json()["solved"] is False
    get(labs, "vulnerable", 102, ALICE)
    assert labs.get("/idor/status").json()["solved"] is True
