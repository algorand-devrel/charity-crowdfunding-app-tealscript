from typing import Literal
from beaker import *
from beaker.lib.storage import BoxMapping
from beaker.consts import (
    BOX_BYTE_MIN_BALANCE,
    BOX_FLAT_MIN_BALANCE,
)
from pyteal import *

BOX_MBR = BOX_FLAT_MIN_BALANCE + (abi.size_of(abi.Address) + 8) * BOX_BYTE_MIN_BALANCE


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

    donator_info = BoxMapping(abi.Address, abi.Uint64)

    def __init__(self) -> None:
        self.box_mbr = Int(BOX_MBR)


app = Application("charity_crowdfunding_app", state=CrowdfundingState()).apply(
    unconditional_create_approval, initialize_global_state=True
)


@app.external(authorize=Authorize.only(Global.creator_address()))
def opt_in_asset(nft: abi.Asset) -> Expr:
    return InnerTxnBuilder.Execute(  # optin to Proof of Donation NFT
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_amount: Int(0),
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.xfer_asset: nft.asset_id(),
        }
    )


# Bootstrap will: receive Proof of Donation NFT, make fundraiser active, and set fundraise details
@app.external(authorize=Authorize.only(Global.creator_address()))
def bootstrap(
    title: abi.String,
    detail: abi.String,
    goal: abi.Uint64,
    min_donate: abi.Uint64,
    nft_transfer: abi.AssetTransferTransaction,
) -> Expr:
    return Seq(
        Assert(
            nft_transfer.get().asset_receiver() == Global.current_application_address()
        ),
        Assert(nft_transfer.get().asset_amount() > Int(0)),
        app.state.title.set(title.get()),
        app.state.detail.write(Int(0), detail.get()),
        app.state.goal.set(goal.get()),
        app.state.min_donation.set(min_donate.get()),
        app.state.active.set(Int(1)),
    )


@app.external
def fund(mbr_pay: abi.PaymentTransaction, fund_pay: abi.PaymentTransaction) -> Expr:
    amount = fund_pay.get().amount()
    total_fund = app.state.fund_raised

    return Seq(
        Assert(app.state.active == Int(1)),
        Assert(fund_pay.get().receiver() == Global.current_application_address()),
        Assert(amount >= app.state.min_donation),
        app.state.donator_info[Txn.sender()].set(Itob(amount)),
        app.state.donator_num.increment(),
        total_fund.set(total_fund + fund_pay.get().amount()),
    )


@app.external
def claimNFT(optin: abi.AssetTransferTransaction, nft: abi.Asset) -> Expr:
    donator_box = app.state.donator_info[Txn.sender()]
    return Seq(
        Assert(donator_box.exists()),
        Assert(Btoi(donator_box.get()) > Int(0)),
        Assert(optin.get().asset_receiver() == Txn.sender()),
        Assert(optin.get().asset_amount() == Int(0)),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: Txn.sender(),
                TxnField.xfer_asset: nft.asset_id(),
            }
        ),
    )


@app.external(authorize=Authorize.only(Global.creator_address()))
def claimFund(*, output: abi.Uint64) -> Expr:
    total_funds = app.state.fund_raised
    return Seq(
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: total_funds,
                TxnField.receiver: Txn.sender(),
            }
        ),
        app.state.active.set(Int(0)),
        output.set(total_funds),
        total_funds.set(Int(0)),
    )


# Currently can delete box before donator claims NFT. For production include time constraint logic for claiming the reward nft.
@app.external(authorize=Authorize.only(Global.creator_address()))
def delete_donator_info(donator: abi.Account) -> Expr:
    donator_box = app.state.donator_info[donator.address()]
    return Seq(
        Assert(app.state.active == Int(0)),
        Assert(donator_box.exists()),
        Pop(donator_box.delete()),
    )


# Should transfer remaining assets, remaing Algo to creator address before deleting for production
@app.delete(bare=True, authorize=Authorize.only(Global.creator_address()))
def delete() -> Expr:
    return Seq(
        Assert(app.state.active == Int(0)),
        Assert(app.state.fund_raised == Int(0)),
    )


### Read Method ###
@app.external
def get_details(*, output: abi.String) -> Expr:
    return output.set(
        app.state.detail.read(Int(0), app.state.detail.blob.max_bytes - Int(1))
    )
