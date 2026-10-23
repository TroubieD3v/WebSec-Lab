import asyncio

import httpx
import pytest

from main import app

LAB = "race-condition"
BODY = {"code": "WELCOME10"}


@pytest.fixture()
def client():
    async def make():
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://lab")

    return make


async def burst(client, mode, n=10):
    async with await client() as http:
        await http.post("/reset-all")
        responses = await asyncio.gather(*(http.post(f"/{LAB}/{mode}/redeem", json=BODY) for _ in range(n)))
        wallet = (await http.get(f"/{LAB}/{mode}/wallet")).json()
        solved = (await http.get(f"/{LAB}/status")).json()["solved"]
        await http.post("/reset-all")
    return [r.status_code for r in responses], wallet, solved


def test_single_redemption_works_in_both_modes(labs):
    for mode in ("vulnerable", "fixed"):
        assert labs.post(f"/{LAB}/{mode}/redeem", json=BODY).json() == {"balance": 10, "redemptions": 1}
        assert labs.post(f"/{LAB}/{mode}/redeem", json=BODY).status_code == 409
        assert labs.get(f"/{LAB}/{mode}/wallet").json()["balance"] == 10


def test_unknown_coupon_is_rejected(labs):
    assert labs.post(f"/{LAB}/vulnerable/redeem", json={"code": "NOPE"}).status_code == 404


def test_vulnerable_concurrent_requests_redeem_the_coupon_many_times(client):
    codes, wallet, solved = asyncio.run(burst(client, "vulnerable"))
    assert codes.count(200) > 1
    assert wallet["balance"] == 10 * wallet["redemptions"] > 10
    assert solved is True


def test_fixed_concurrent_requests_redeem_exactly_once(client):
    codes, wallet, solved = asyncio.run(burst(client, "fixed", n=20))
    assert codes.count(200) == 1 and codes.count(409) == 19
    assert wallet == {"balance": 10, "redemptions": 1}
    assert solved is False


def test_sequential_requests_are_not_an_exploit(labs):
    for _ in range(3):
        labs.post(f"/{LAB}/vulnerable/redeem", json=BODY)
    assert labs.get(f"/{LAB}/status").json()["solved"] is False


def test_modes_have_separate_wallets_and_reset_clears_them(labs):
    labs.post(f"/{LAB}/vulnerable/redeem", json=BODY)
    assert labs.get(f"/{LAB}/fixed/wallet").json()["balance"] == 0
    labs.post(f"/{LAB}/reset")
    assert labs.get(f"/{LAB}/vulnerable/wallet").json() == {"balance": 0, "redemptions": 0}


def test_wallet_can_be_reset_per_mode(labs):
    labs.post(f"/{LAB}/vulnerable/redeem", json=BODY)
    labs.post(f"/{LAB}/fixed/redeem", json=BODY)
    assert labs.post(f"/{LAB}/vulnerable/wallet/reset").json() == {"balance": 0, "redemptions": 0}
    assert labs.get(f"/{LAB}/vulnerable/wallet").json()["balance"] == 0
    assert labs.get(f"/{LAB}/fixed/wallet").json()["balance"] == 10
