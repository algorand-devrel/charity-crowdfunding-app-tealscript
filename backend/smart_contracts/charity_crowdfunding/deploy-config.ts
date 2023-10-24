import * as algokit from '@algorandfoundation/algokit-utils'
import { CharityCrowdfundingAppClient } from '../artifacts/charity_crowdfunding_app/client'
import algosdk from 'algosdk'

// Fundraiser Input Values (CHANGE THESE TO YOUR OWN)
const title = 'Releasing Children from Poverty'
const detail = 'Compassion International is a child sponsorship and Christian humanitarian aid organization.'
const goal = algokit.algos(60)
const minDonate = algokit.algos(10)

// Reward NFT Input Values (CHANGE THESE TO YOUR OWN)
const assetName = 'End Poverty Badge'
const assetUnitName = 'EPB'
const nftAmount = 2
const assetUrl = 'https://www.compassion.com/'

//Donation Amount (CHANGE TO YOUR OWN)
const donationAmount = algokit.algos(20).valueOf()

async function printBoxes(appClient: CharityCrowdfundingAppClient) {
  const boxes = await appClient.appClient.getBoxNames()
  console.log(`${boxes.length} boxes found`)
  for (const boxName of boxes) {
    const encodedName = algosdk.encodeAddress(boxName.nameRaw)
    console.log('box Name:', encodedName)
    const content = await appClient.appClient.getBoxValueFromABIType(boxName, new algosdk.ABIUintType(64))
    console.log('Donation Amount: ', Number(content) / 1_000_000, 'ALGO')
  }
}

export async function deploy() {
  console.log('=== Deploying CharityCrowdfunding ===')

  const algod = algokit.getAlgoClient()
  const indexer = algokit.getAlgoIndexerClient()
  const deployer = await algokit.getLocalNetDispenserAccount(algod)

  const appClient = new CharityCrowdfundingAppClient(
    {
      resolveBy: 'creatorAndName',
      findExistingUsing: indexer,
      sender: deployer,
      creatorAddress: deployer.addr,
    },
    algod,
  )

  const app = await appClient.appClient.create()

  algokit.transferAlgos(
    {
      amount: algokit.algos(0.1),
      from: deployer,
      to: app.appAddress,
    },
    algod,
  )

  /*
  Boostrap Fundraise
  - set title, description, fundraise goal, minimum donation amount
  - mint Reward NFT
  */
  let sp = await algod.getTransactionParams().do()

  const payAssetMbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: deployer.addr,
    to: app.appAddress,
    amount: 100_000, // 0.1 ALGO to cover Asset MBR
    suggestedParams: sp,
  })

  const bootstrapOutput = await appClient.bootstrap(
    {
      title: title,
      detail: detail,
      goal: goal.valueOf(),
      minDonation: minDonate.valueOf(),
      mbrPay: { transaction: payAssetMbrTxn, signer: deployer },
      assetName: assetName,
      unitName: assetUnitName,
      nftAmount: nftAmount,
      assetUrl: assetUrl,
    },
    { sendParams: { fee: algokit.transactionFees(2), suppressLog: true } },
  )
  const rewardNftID = Number(bootstrapOutput.return?.valueOf())
  console.log('The created Reward NFT ID is: ', rewardNftID)

  console.log('\tFundraiser Details after bootstrap')
  const global_state = await appClient.getGlobalState()
  console.log('\t Fundraise Title: ', global_state['title']?.asString())
  console.log('\t Fundraise Goal: ', global_state['goal']?.asNumber(), ' MicroAlgos')
  console.log('\t Minimum Donation: ', global_state['minDonation']?.asNumber(), ' MicroAlgos')

  // Prepare account 2 and 3 app client
  const donator1 = await algokit.getAccount(
    { config: algokit.getAccountConfigFromEnvironment('DONATOR1'), fundWith: algokit.algos(100) },
    algod,
  )

  await algokit.ensureFunded(
    {
      accountToFund: donator1,
      minSpendingBalance: algokit.algos(100),
      minFundingIncrement: algokit.algos(80),
    },
    algod,
  )

  console.log('donator1 address: ', donator1.addr)

  const donator2 = await algokit.getAccount(
    { config: algokit.getAccountConfigFromEnvironment('DONATOR2'), fundWith: algokit.algos(100) },
    algod,
  )

  await algokit.ensureFunded(
    {
      accountToFund: donator2,
      minSpendingBalance: algokit.algos(100),
      minFundingIncrement: algokit.algos(80),
    },
    algod,
  )

  await algokit.ensureFunded(
    {
      accountToFund: deployer,
      minSpendingBalance: algokit.algos(2),
      minFundingIncrement: algokit.algos(2),
    },
    algod,
  )
  console.log('donator2 address: ', donator2.addr)

  const appClient2 = new CharityCrowdfundingAppClient(
    {
      resolveBy: 'id',
      id: app.appId,
      sender: donator1,
    },
    algod,
  )

  const appClient3 = new CharityCrowdfundingAppClient(
    {
      resolveBy: 'id',
      id: app.appId,
      sender: donator2,
    },
    algod,
  )

  // Fund with donator1 and donator2

  /*
  First Donators need to opt in to the Reward NFT.

  Then atomically group 2 transactions to fund
  1. payment txn to fund the fundraiser. For first time donators, 0.0185 ALGO will be used for Box MBR. 
  2. App Call calling the fund method which will also send the reward NFT to the donator
  */

  const sp3 = await algod.getTransactionParams().do()
  const optinTxns: algosdk.Transaction[] = []

  for (const donator of [donator1, donator2]) {
    const optinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: donator.addr,
      suggestedParams: sp3,
      to: donator.addr,
      amount: 0,
      assetIndex: rewardNftID,
    })

    optinTxns.push(optinTxn)
  }

  // Donator 1 optin to reward NFT
  await algokit.sendTransaction({ transaction: optinTxns[0], from: donator1, sendParams: { suppressLog: true } }, algod)

  // Donate 1 Algo
  const donateTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: donator1.addr,
    suggestedParams: sp,
    to: app.appAddress,
    amount: donationAmount,
  })

  // Call fund method
  await appClient2.fund(
    { fundPay: donateTxn },
    {
      sendParams: { fee: algokit.transactionFees(2), suppressLog: true },
      assets: [rewardNftID],
      boxes: [{ appId: app.appId, name: donator1 }],
    },
  )

  // Do the same for donator2

  // Donator 2 optin to reward NFT
  await algokit.sendTransaction({ transaction: optinTxns[1], from: donator2, sendParams: { suppressLog: true } }, algod)

  // Donate
  const donateTxn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: donator2.addr,
    suggestedParams: sp,
    to: app.appAddress,
    amount: donationAmount,
  })

  // Call fund method
  await appClient3.fund(
    { fundPay: donateTxn2 },
    {
      sendParams: { fee: algokit.transactionFees(2), suppressLog: true },
      assets: [rewardNftID],
      boxes: [{ appId: app.appId, name: donator2 }],
    },
  )

  // Donator2 donates again. This time, no Box MBR is drained from the donation amount and the reward NFT is not sent again

  // Donate
  const donateTxn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: donator2.addr,
    suggestedParams: sp,
    to: app.appAddress,
    amount: donationAmount,
  })

  await appClient3.fund(
    { fundPay: donateTxn3 },
    {
      sendParams: { fee: algokit.transactionFees(2), suppressLog: true },
      assets: [rewardNftID],
      boxes: [{ appId: app.appId, name: donator2 }],
    },
  )

  console.log('Donator 2, 3 funded the fundraiser')

  // Check created Boxes
  await printBoxes(appClient)

  const donator1AssetInfo = await algod.accountAssetInformation(donator1.addr, rewardNftID).do()
  console.log(
    'Donator 1 received ',
    donator1AssetInfo['asset-holding'].amount,
    'asset with id ',
    donator1AssetInfo['asset-holding']['asset-id'],
  )

  const donator2AssetInfo = await algod.accountAssetInformation(donator2.addr, rewardNftID).do()
  console.log(
    'Donator 2 received ',
    donator2AssetInfo['asset-holding'].amount,
    'asset with id ',
    donator2AssetInfo['asset-holding']['asset-id'],
  )

  // Fundraiser creator claim all Funds
  const result = await appClient.claimFund({}, { sendParams: { fee: algokit.transactionFees(2) } })
  console.log('Total claimed Funds: ', Number(result.return) / 1_000_000, 'Algos')

  // Check that the remaining app address balance == minimum balance
  const appAcctInfo = await algod.accountInformation(app.appAddress).do()
  const resultMessage = appAcctInfo.amount === appAcctInfo['min-balance'] ? 'balance == min-bal' : 'balance != min-bal'
  console.log(resultMessage)

  // Delete boxes
  const boxes = await appClient.appClient.getBoxNames()
  for (const boxName of boxes) {
    const encodedName = algosdk.encodeAddress(boxName.nameRaw)
    await appClient.deleteDonatorInfo(
      { donator: encodedName },
      {
        sendParams: { fee: algokit.transactionFees(2), suppressLog: true },
        boxes: [{ appId: app.appId, name: boxName.nameRaw }],
      },
    )
    console.log('Box with name ', encodedName, 'is Deleted')
  }
  const boxes2 = await appClient.appClient.getBoxNames()
  console.log(boxes2.length, ' boxes found')

  // delete app
  const deployerOptinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: deployer.addr,
    suggestedParams: sp3,
    to: deployer.addr,
    amount: 0,
    assetIndex: rewardNftID,
  })

  algokit.sendTransaction({ transaction: deployerOptinTxn, from: deployer, sendParams: { suppressLog: true } }, algod)

  await appClient.appClient.delete({
    sendParams: { suppressLog: true },
  })
  console.log('App Deleted')
}
