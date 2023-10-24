import { Contract } from '@algorandfoundation/tealscript'

const BOXMBR = 2500 + (32 + 64) * 400

class charityCrowdfundingApp extends Contract {
  goal = GlobalStateKey<uint64>()
  detail = GlobalStateKey<string>() // Max 128 Bytes
  title = GlobalStateKey<string>()
  fundRaised = GlobalStateKey<uint64>()
  donatorNum = GlobalStateKey<uint64>()
  minDonation = GlobalStateKey<uint64>()
  active = GlobalStateKey<uint64>()
  rewardNftId = GlobalStateKey<Asset>()
  donatorInfo = BoxMap<Address, uint64>()

  authorizeCreator(): void {
    assert(this.app.creator == this.txn.sender)
  }

  optInAsset(assetId: Asset): void {
    this.authorizeCreator()
    sendAssetTransfer({
      assetAmount: 0,
      assetReceiver: this.app.address,
      fee: 0,
      xferAsset: assetId,
    })
  }

  @allow.bareCreate()
  createApplication(): void {
    this.fundRaised.value = 0
    this.donatorNum.value = 0
    this.active.value = 0
  }

  /*
  Mint Reward NFT, set fundraiser active, and set fundraise details.
  */

  bootstrap(
    title: string,
    detail: string,
    goal: uint64,
    minDonation: uint64,
    mbrPay: PayTxn,
    assetName: string,
    unitName: string,
    nftAmount: uint64,
    assetUrl: string,
  ): uint64 {
    this.authorizeCreator()
    assert(mbrPay.amount >= 100_000) // Asset Min Balance
    assert(mbrPay.receiver == this.app.address)
    assert(mbrPay.sender == this.app.creator)

    this.title.value = title
    this.detail.value = detail
    this.goal.value = goal
    this.minDonation.value = minDonation
    this.active.value = 1

    let createdNft = sendAssetCreation({
      configAssetDecimals: 0,
      configAssetName: assetName,
      configAssetTotal: nftAmount,
      configAssetURL: assetUrl,
      configAssetUnitName: unitName,
      fee: 0,
    })

    this.rewardNftId.value = createdNft
    return btoi(itob(createdNft))
  }

  /*
  The fund method will
  - check if the sender sent the correct mbr_pay, and funded more than min_donation
  - check if the fundraiser is active
  - check if the sender has donated before
  - if the sender has donated before, add the amount to the previous donation amount
  - if the sender has not donated before, set donation amount and send reward NFT

  @param mbr_pay: The payment transaction that covers the Box MBR
  @param fund_pay: The payment transaction that covers the donation amount
  */

  fund(fundPay: PayTxn): void {
    const fundAmount = fundPay.amount
    let totalFund = this.fundRaised.value
    let newDonationAmount = 0

    assert(fundAmount > BOXMBR)
    assert(this.active.value == 1)
    assert(fundPay.sender == this.txn.sender)
    assert(fundAmount >= this.minDonation.value)
    assert(fundPay.receiver == this.app.address)

    if (this.donatorInfo(this.txn.sender).exists) {
      newDonationAmount = this.donatorInfo(this.txn.sender).value + fundAmount
      this.donatorInfo(this.txn.sender).value = newDonationAmount
      totalFund = totalFund + fundAmount
    } else {
      this.donatorInfo(this.txn.sender).value = fundAmount

      sendAssetTransfer({
        xferAsset: this.rewardNftId.value,
        assetAmount: 1,
        assetReceiver: this.txn.sender,
        fee: 0,
      })
      this.donatorNum.value = this.donatorNum.value + 1
      totalFund = totalFund + fundAmount - BOXMBR
    }
  }

  /*
  Used to claim the funds raised by the fundraiser. Only the creator can claim the funds.

  @output: the amount of funds claimed
  */

  claimFund(): uint64 {
    this.authorizeCreator()

    const totalRaisedFunds = this.fundRaised.value

    sendPayment({
      amount: totalRaisedFunds,
      receiver: this.txn.sender,
      fee: 0,
    })

    this.active.value = 0
    this.fundRaised.value = 0
    return totalRaisedFunds
  }

  /*
  Delete the donator info box. Only the creator can delete the donator info.

  @param donator: the donator address of the box to be deleted
  */

  deleteDonatorInfo(donator: Account): void {
    this.authorizeCreator()

    assert(this.active.value == 0)
    assert(this.donatorInfo(donator).exists)

    this.donatorInfo(donator).delete()

    sendPayment({
      amount: BOXMBR,
      receiver: donator,
      fee: 0,
    })
  }

  @allow.bareCall('DeleteApplication')
  deleteApplication(): void {
    this.authorizeCreator()
    assert(this.active.value == 0)
    assert(this.fundRaised.value == 0)
  }
}
