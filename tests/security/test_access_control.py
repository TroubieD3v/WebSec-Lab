LAB = "broken-access-control"
ALICE = {"Authorization": "Bearer alice-demo-token"}
ADMIN = {"Authorization": "Bearer admin-demo-token"}


def users(labs, mode, headers):
    return labs.get(f"/{LAB}/{mode}/admin/users", headers=headers)


def patch(labs, mode, body, headers=ALICE):
    return labs.patch(f"/{LAB}/{mode}/profile", json=body, headers=headers)


def test_admin_can_list_users_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert len(users(labs, mode, ADMIN).json()["users"]) == 3


def test_authentication_required_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert users(labs, mode, {}).status_code == 401
        assert patch(labs, mode, {"display_name": "x"}, {}).status_code == 401


def test_vulnerable_admin_endpoint_only_checks_login(labs):
    response = users(labs, "vulnerable", ALICE)
    assert response.status_code == 200
    assert {u["email"] for u in response.json()["users"]} >= {"root@example.test"}


def test_fixed_admin_endpoint_requires_admin_role(labs):
    assert users(labs, "fixed", ALICE).status_code == 403


def test_user_can_edit_display_name_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert patch(labs, mode, {"display_name": "Ally"}).json()["display_name"] == "Ally"


def test_vulnerable_mass_assignment_grants_admin_role(labs):
    assert patch(labs, "vulnerable", {"role": "admin"}).json()["role"] == "admin"
    assert users(labs, "vulnerable", ALICE).status_code == 200


def test_fixed_rejects_privileged_fields_and_role_is_unchanged(labs):
    response = patch(labs, "fixed", {"display_name": "Ally", "role": "admin"})
    assert response.status_code == 400 and "role" in response.json()["detail"]
    assert labs.get(f"/{LAB}/fixed/me", headers=ALICE).json()["role"] == "user"
    assert users(labs, "fixed", ALICE).status_code == 403


def test_challenge_solved_by_function_level_bypass(labs):
    users(labs, "vulnerable", ADMIN)  # a legitimate admin request is not an exploit
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    users(labs, "vulnerable", ALICE)
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_challenge_solved_by_mass_assignment(labs):
    patch(labs, "vulnerable", {"display_name": "Ally"})
    assert labs.get(f"/{LAB}/status").json()["solved"] is False
    patch(labs, "vulnerable", {"role": "admin"})
    assert labs.get(f"/{LAB}/status").json()["solved"] is True


def test_reset_restores_roles(labs):
    patch(labs, "vulnerable", {"role": "admin"})
    labs.post(f"/{LAB}/reset")
    assert labs.get(f"/{LAB}/vulnerable/me", headers=ALICE).json()["role"] == "user"
