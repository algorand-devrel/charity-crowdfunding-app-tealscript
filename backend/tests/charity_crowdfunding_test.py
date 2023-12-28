import pytest
from algokit_utils import (
    ApplicationClient,
    ApplicationSpecification,
    get_localnet_default_account,
)
from algosdk.v2client.algod import AlgodClient

from smart_contracts.charity_crowdfunding import (
    contract as charity_crowdfunding_contract,
)


@pytest.fixture(scope="session")
def charity_crowdfunding_app_spec(
    algod_client: AlgodClient,
) -> ApplicationSpecification:
    return charity_crowdfunding_contract.app.build(algod_client)


@pytest.fixture(scope="session")
def charity_crowdfunding_client(
    algod_client: AlgodClient, charity_crowdfunding_app_spec: ApplicationSpecification
) -> ApplicationClient:
    client = ApplicationClient(
        algod_client,
        app_spec=charity_crowdfunding_app_spec,
        signer=get_localnet_default_account(algod_client),
        template_values={"UPDATABLE": 1, "DELETABLE": 1},
    )
    client.create()
    return client


def test_says_hello(charity_crowdfunding_client: ApplicationClient) -> None:
    result = charity_crowdfunding_client.call(
        charity_crowdfunding_contract.hello, name="World"
    )

    assert result.return_value == "Hello, World"
