from beaker import *
from beaker.lib.storage import BoxMapping
from beaker.consts import BOX_BYTE_MIN_BALANCE, BOX_FLAT_MIN_BALANCE, ASSET_MIN_BALANCE
from pyteal import *


class DonatorRecord(abi.NamedTuple):
    donation_amount: abi.Field[abi.Uint64]
    nft_claimed: abi.Field[abi.Bool]


BOX_MBR = (
    BOX_FLAT_MIN_BALANCE
    + (abi.size_of(DonatorRecord) + abi.size_of(abi.Address)) * BOX_BYTE_MIN_BALANCE
)


class CrowdfundingState:
    goal = GlobalStateValue(stack_type=TealType.uint64, descr="The Fundraiser's Goal")

    detail = GlobalStateBlob(
        keys=5,  # Description can be up to 635 Bytes excluding 5 Bytes for keys
        descr="The description of the fundraiser",
    )

    title = GlobalStateValue(stack_type=TealType.bytes, descr="Title of the fundraiser")

    fund_raised = GlobalStateValue(
        stack_type=TealType.uint64, default=Int(0), descr="Amount of Algos raised"
    )

    donator_num = GlobalStateValue(
        stack_type=TealType.uint64,
        default=Int(0),
        descr="Number of donators who donated",
    )

    min_donation = GlobalStateValue(
        stack_type=TealType.uint64,
        static=True,
        descr="minimum amount of donation people can donate",
    )

    active = GlobalStateValue(
        stack_type=TealType.uint64, default=Int(0), descr="Status of the Fundraiser"
    )

    reward_nft_id = GlobalStateValue(
        stack_type=TealType.uint64, descr="ID of the reward NFT"
    )

    donator_infos = BoxMapping(abi.Address, DonatorRecord)

    def __init__(self) -> None:
        self.box_mbr = Int(BOX_MBR)


app = Application("charity_crowdfunding_app", state=CrowdfundingState()).apply(
    unconditional_create_approval, initialize_global_state=True
)


"""
Mint reward NFT. This method can only be called once. Must be created before bootstrap is called.
"""


@app.external
def mintNFT(
    mbr_pay: abi.PaymentTransaction,
    asset_name: abi.String,
    unit_name: abi.String,
    nft_amount: abi.Uint64,
    asset_url: abi.String,
    *,
    output: abi.Uint64
) -> Expr:
    return Seq(
        Assert(
            app.state.reward_nft_id.exists() == Int(0),
            comment="Reward NFT already minted",
        ),
        Assert(
            mbr_pay.get().amount() == Int(ASSET_MIN_BALANCE),
            comment="Not enough Algos to cover Asset MBR",
        ),
        Assert(
            mbr_pay.get().receiver() == Global.current_application_address(),
            comment="MBR Payment receiver is not the app",
        ),
        Assert(
            mbr_pay.get().sender() == Txn.sender(),
            comment="MBR Payment sender is not the App call sender",
        ),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetConfig,
                TxnField.config_asset_total: nft_amount.get(),
                TxnField.config_asset_decimals: Int(0),
                TxnField.config_asset_unit_name: unit_name.get(),
                TxnField.config_asset_name: asset_name.get(),
                TxnField.config_asset_url: asset_url.get(),
                TxnField.config_asset_reserve: Global.current_application_address(),
                TxnField.fee: Int(0),
            }
        ),
        app.state.reward_nft_id.set(InnerTxn.created_asset_id()),
        output.set(InnerTxn.created_asset_id()),
    )


"""
Set fundraiser active, and set fundraise details. Reward NFT must be minted before this method is called.
"""


@app.external(authorize=Authorize.only(Global.creator_address()))
def bootstrap(
    title: abi.String,
    detail: abi.String,
    goal: abi.Uint64,
    min_donate: abi.Uint64,
) -> Expr:
    return Seq(
        Assert(app.state.reward_nft_id.exists()),
        app.state.title.set(title.get()),
        app.state.detail.write(Int(0), detail.get()),
        app.state.goal.set(goal.get()),
        app.state.min_donation.set(min_donate.get()),
        app.state.active.set(Int(1)),
    )


"""
The fund method will
- check if the sender sent the correct mbr_pay, and funded more than min_donation
- check if the fundraiser is active
- check if the sender has donated before
- if the sender has donated before, add the amount to the previous donation amount
- if the sender has not donated before, set donation amount and set donated to true

@param mbr_pay: The payment transaction that covers the Box MBR
@param fund_pay: The payment transaction that covers the donation amount
"""


@app.external
def fund(
    mbr_pay: abi.PaymentTransaction,
    fund_pay: abi.PaymentTransaction,
) -> Expr:
    fund_amount = abi.Uint64()
    fund_amount.set(fund_pay.get().amount())
    total_fund = app.state.fund_raised
    donation_amount = abi.Uint64()
    new_donation_amount = abi.Uint64()
    nft_claimed = abi.Bool()
    donator_record = DonatorRecord()

    return Seq(
        Assert(mbr_pay.get().receiver() == Global.current_application_address()),
        Assert(
            mbr_pay.get().amount() == app.state.box_mbr,
            comment="Payment amount not enough to cover Box MBR",
        ),
        Assert(app.state.active == Int(1), comment="Fundraiser is not active"),
        Assert(
            fund_pay.get().receiver() == Global.current_application_address(),
            comment="Fund Payment is not sent to the fundraiser Contract",
        ),
        Assert(
            fund_amount.get() >= app.state.min_donation,
            comment="Donation amount is less than the minimum donation amount",
        ),
        Seq(
            donator_record.decode(app.state.donator_infos[Txn.sender()].get()),
            donation_amount.set(donator_record.donation_amount),
            nft_claimed.set(donator_record.nft_claimed),
            If(donation_amount.get() > Int(0))
            .Then(
                Seq(
                    new_donation_amount.set(donation_amount.get() + fund_amount.get()),
                    donator_record.set(
                        new_donation_amount,
                        nft_claimed,
                    ),
                )
            )
            .Else(
                Seq(
                    donator_record.set(fund_amount, nft_claimed),
                    app.state.donator_num.increment(),
                )
            ),
            total_fund.set(total_fund.get() + fund_amount.get()),
            app.state.donator_infos[Txn.sender()].set(donator_record.encode()),
        ),
    )


"""
Donators can claim their NFTs if they have donated and have not claimed their NFTs.

@param optin: the optin transaction of the NFT
"""


@app.external
def claimNFT(optin: abi.AssetTransferTransaction) -> Expr:
    donator_box = app.state.donator_infos[Txn.sender()]
    claimed = abi.Bool()
    donation_amount = abi.Uint64()
    donator_record = DonatorRecord()

    return Seq(
        donator_record.decode(donator_box.get()),
        claimed.set(donator_record.nft_claimed),
        donation_amount.set(donator_record.donation_amount),
        Assert(
            donation_amount.get() > app.state.min_donation,
            comment="Donator has not donated",
        ),
        Assert(claimed.get() == Int(0), comment="NFT already claimed"),
        Assert(optin.get().asset_sender() == Txn.sender()),
        Assert(optin.get().asset_receiver() == Txn.sender()),
        Assert(optin.get().asset_amount() == Int(0)),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: Txn.sender(),
                TxnField.xfer_asset: app.state.reward_nft_id.get(),
            }
        ),
        claimed.set(True),
        donator_record.set(donation_amount, claimed),
        app.state.donator_infos[Txn.sender()].set(donator_record.encode()),
    )


"""
Used to claim the funds raised by the fundraiser. Only the creator can claim the funds.

@output: the amount of funds claimed
"""


@app.external(authorize=Authorize.only(Global.creator_address()))
def claimFund(*, output: abi.Uint64) -> Expr:
    total_funds = app.state.fund_raised
    return Seq(
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: total_funds,
                TxnField.receiver: Txn.sender(),
                TxnField.fee: Int(0),
            }
        ),
        app.state.active.set(Int(0)),
        output.set(total_funds),
        total_funds.set(Int(0)),
    )


"""
Delete the donator info box. Only the creator can delete the donator info.

@param donator: the donator address of the box to be deleted
"""


# Currently can delete box before donator claims NFT. For production include time constraint logic for claiming the reward nft.
@app.external(authorize=Authorize.only(Global.creator_address()))
def delete_donator_info(donator: abi.Account) -> Expr:
    donator_box = app.state.donator_infos[donator.address()]
    return Seq(
        Assert(app.state.active == Int(0)),
        Assert(donator_box.exists()),
        Pop(donator_box.delete()),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: app.state.box_mbr,
                TxnField.receiver: donator.address(),
                TxnField.fee: Int(0),
            }
        ),
    )


"""
delete the fundraiser contract. Only the creator can delete the fundraiser contract.
"""


# Should transfer remaining assets, remaing Algo to creator address before deleting for production
@app.delete(bare=True, authorize=Authorize.only(Global.creator_address()))
def deleteApp() -> Expr:
    return Seq(
        Assert(app.state.active == Int(0)),
        Assert(app.state.fund_raised == Int(0)),
    )


### Read Method ###

"""
get the fundraiser contract details

@output: the details of the fundraiser contract
"""


@app.external(read_only=True)
def get_details(*, output: abi.String) -> Expr:
    return output.set(
        app.state.detail.read(Int(0), app.state.detail.blob.max_bytes - Int(1))
    )
