import { Contract } from '@algorandfoundation/tealscript'

class charityCrowdfundingApp extends Contract {
  goal = GlobalStateKey<uint64>()
  detail = GlobalStateKey<string>() // Max 128 Bytes
  title = GlobalStateKey<string>()
  fundRaised = GlobalStateKey<uint64>()
  donatorNum = GlobalStateKey<uint64>()
  minDonation = GlobalStateKey<uint64>()
  active = GlobalStateKey<uint64>()
  rewardNftId = GlobalStateKey<Asset>()
  donatorInfo = LocalStateKey<uint64>()

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
    assert(mbrPay.amount >= globals.minBalance) // Asset Min Balance
    assert(mbrPay.receiver == this.app.address)
    assert(mbrPay.sender == this.app.creator)

    this.title.value = title
    this.detail.value = detail
    this.goal.value = goal
    this.minDonation.value = minDonation
    this.fundRaised.value = 0
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
    return btoi(itob(createdNft)) // Update when TEALScript supports Asset.value
  }

  @allow.bareCall('OptIn')
  optInToApplication(): void {
    this.donatorInfo(this.txn.sender).value = 0
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

    assert(this.txn.sender.isOptedInToApp(this.app))
    assert(this.active.value == 1)
    assert(fundPay.sender == this.txn.sender)
    assert(fundAmount >= this.minDonation.value)
    assert(fundPay.receiver == this.app.address)

    let newDonationAmount = this.donatorInfo(this.txn.sender).value + fundAmount
    this.donatorInfo(this.txn.sender).value = newDonationAmount
    this.donatorNum.value = this.donatorNum.value + 1
    this.fundRaised.value = totalFund + fundAmount

    const optedIn = this.txn.sender.hasAsset(this.rewardNftId.value)

    if (optedIn == 1) {
      const asaBalance = this.txn.sender.assetBalance(this.rewardNftId.value)
      if (asaBalance == 0) {
        sendAssetTransfer({
          xferAsset: this.rewardNftId.value,
          assetAmount: 1,
          assetReceiver: this.txn.sender,
          fee: 0,
        })
      }
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

  @allow.bareCall('DeleteApplication')
  deleteApplication(): void {
    this.authorizeCreator()
    assert(this.active.value == 0)
    assert(this.fundRaised.value == 0)
  }
}
