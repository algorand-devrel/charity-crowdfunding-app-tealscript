import algosdk from 'algosdk'
import * as algokit from '@algorandfoundation/algokit-utils'

export async function mintRewardNft() {
  const algodClient = algokit.getAlgoClient()
  const creator = await algokit.getLocalNetDispenserAccount(algodClient)

  // example: ASSET_CREATE
  const suggestedParams = await algodClient.getTransactionParams().do()
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creator.addr,
    suggestedParams,
    defaultFrozen: false,
    unitName: 'POD',
    assetName: 'Proof of Donation',
    manager: creator.addr,
    reserve: creator.addr,
    freeze: creator.addr,
    clawback: creator.addr,
    assetURL: 'http://path/to/my/asset/details',
    total: 10000,
    decimals: 0,
  })

  const signedTxn = txn.signTxn(creator.sk)
  await algodClient.sendRawTransaction(signedTxn).do()
  const result = await algosdk.waitForConfirmation(algodClient, txn.txID().toString(), 3)

  const assetIndex = result['asset-index']
  console.log(`Asset ID created: ${assetIndex}`)
  // example: ASSET_CREATE

  // example: ASSET_INFO
  const assetInfo = await algodClient.getAssetByID(assetIndex).do()
  console.log(`Asset Name: ${assetInfo.params.name}`)
  console.log(`Asset Params: ${assetInfo.params}`)
  // example: ASSET_INFO

  return assetIndex
}
