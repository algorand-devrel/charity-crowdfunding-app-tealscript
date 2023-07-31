import * as algokit from '@algorandfoundation/algokit-utils'
import { CharityCrowdfundingAppClient } from '../artifacts/charity_crowdfunding_app/client'
import { AppClientCallCoreParams } from '@algorandfoundation/algokit-utils/types/app-client'
import { SendTransactionParams } from '@algorandfoundation/algokit-utils/types/transaction'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import algosdk from 'algosdk'
import { mintRewardNft } from './mint_nft'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying CharityCrowdfunding ===')

  const algod = algokit.getAlgoClient()
  const indexer = algokit.getAlgoIndexerClient()
  const deployer = await algokit.getLocalNetDispenserAccount(algod)
  // const deployer = await algokit.getAccount(
  //   { config: algokit.getAccountConfigFromEnvironment('DEPLOYER'), fundWith: algokit.algos(100) },
  //   algod,
  // )

  // await algokit.ensureFunded(
  //   {
  //     accountToFund: deployer,
  //     minSpendingBalance: algokit.algos(2),
  //     minFundingIncrement: algokit.algos(2),
  //   },
  //   algod,
  // )

  const appClient = new CharityCrowdfundingAppClient(
    {
      resolveBy: 'creatorAndName',
      findExistingUsing: indexer,
      sender: deployer,
      creatorAddress: deployer.addr,
    },
    algod,
  )
  // const app = await appClient.deploy({
  //   onSchemaBreak: 'replace',
  //   onUpdate: 'append',
  // })

  // // If app was just created fund the app account
  // if (['create', 'replace'].includes(app.operationPerformed)) {
  //   algokit.transferAlgos(
  //     {
  //       amount: algokit.algos(0.2),
  //       from: deployer,
  //       to: app.appAddress,
  //     },
  //     algod,
  //   )
  // }

  const app = await appClient.appClient.create()

  algokit.transferAlgos(
    {
      amount: algokit.algos(0.2),
      from: deployer,
      to: app.appAddress,
    },
    algod,
  )

  // Mint Reward NFT
  const reward_nft_id = await mintRewardNft()

  // Reward NFT Optin
  let sp = await algod.getTransactionParams().do()

  // const sendParams: SendTransactionParams = {
  //   suppressLog: false,
  //   fee: new AlgoAmount({ microAlgos: sp.minFee * 2 }),
  // }

  await appClient.optInAsset(
    { nft: reward_nft_id },
    {
      sendParams: {
        suppressLog: false,
        fee: algokit.transactionFees(2), //covers inner transaction
      },
    },
  )

  /*
  Boostrap Fundraise
  - set title, description, fundraise goal, minimum donation amount
  - transfer Reward NFT to smart contract
  */

  const title = 'Save The Planet Fundraiser'
  const detail = 'The world is getting sicker everyday and we need your help!'
  const goal = algokit.algos(2)
  const minDonate = algokit.algos(0.1) // 0.1 ALGO

  let sp2 = await algod.getTransactionParams().do()

  const rewardNftTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: deployer.addr,
    suggestedParams: sp2,
    to: app.appAddress,
    amount: 10000,
    assetIndex: reward_nft_id,
  })

  // const rewardNftTransferTxnSigner = await algokit.getTransactionWithSigner(rewardNftTransferTxn, deployer)

  console.log('Fundraiser Details Before Bootstrap')
  const global_states = await appClient.getGlobalState()
  console.log('\t Fundraise Title: ', global_states['title']?.asString())
  console.log('\t Fundraise Goal: ', global_states['goal']?.asNumber(), ' MicroAlgos')
  console.log('\t Minimum Donation: ', global_states['min_donation']?.asNumber(), ' MicroAlgos')

  await appClient.bootstrap({
    title: title,
    detail: detail,
    goal: goal.valueOf(),
    min_donate: minDonate.valueOf(),
    nft_transfer: { transaction: rewardNftTransferTxn, signer: deployer },
  })

  console.log('Fundraiser Details after bootstrap')
  const global_state2 = await appClient.getGlobalState()
  console.log('\t Fundraise Title: ', global_state2['title']?.asString())
  console.log('\t Fundraise Goal: ', global_state2['goal']?.asNumber(), ' MicroAlgos')
  console.log('\t Minimum Donation: ', global_state2['min_donation']?.asNumber(), ' MicroAlgos')

  //   // Prepare account 2 and 3 app client
  //   donator1 = accounts[1]
  //   donator2 = accounts[2]

  //   app_client2 = app_client.prepare(donator1.signer)
  //   app_client3 = app_client.prepare(donator2.signer)

  //   // Fund with donator1 and donator2
  //   sp = algod_client.suggested_params()

  //   /*
  //   atomically group 3 transactions to fund
  //   1. payment txn to cover box MBR
  //   2. payment txn to fund the fundraiser
  //   3. App Call calling the fund method
  //   */

  //   // Pay Box MBR
  //   box_mbr_txn1 = TransactionWithSigner(
  //       txn=PaymentTxn(
  //           sender=donator1.address,
  //           sp=sp,
  //           receiver=app_addr,
  //           amt=app.state.box_mbr.value,
  //       ),
  //       signer=donator1.signer,
  //   )

  //   // Fund 1 Algo
  //   fund_txn1 = TransactionWithSigner(
  //       txn=PaymentTxn(sender=donator1.address, sp=sp, receiver=app_addr, amt=1 * algo),
  //       signer=donator1.signer,
  //   )

  //   // Call fund method
  //   app_client2.call(
  //       fund,
  //       mbr_pay=box_mbr_txn1,
  //       fund_pay=fund_txn1,
  //       suggested_params=sp,
  //       boxes=[(appid, decode_address(donator1.address))],
  //   )

  //   // Do the same for donator2
  //   box_mbr_txn2 = TransactionWithSigner(
  //       txn=PaymentTxn(
  //           sender=donator2.address,
  //           sp=sp,
  //           receiver=app_addr,
  //           amt=app.state.box_mbr.value,
  //       ),
  //       signer=donator2.signer,
  //   )

  //   fund_txn2 = TransactionWithSigner(
  //       txn=PaymentTxn(sender=donator2.address, sp=sp, receiver=app_addr, amt=1 * algo),
  //       signer=donator2.signer,
  //   )

  //   app_client3.call(
  //       fund,
  //       mbr_pay=box_mbr_txn2,
  //       fund_pay=fund_txn2,
  //       suggested_params=sp,
  //       boxes=[(appid, decode_address(donator2.address))],
  //   )

  //   print("Donator 2, 3 funded the fundraiser")

  //   // Check created Boxes
  //   boxes = app_client.get_box_names()
  //   print(f"{len(boxes)} boxes found")
  //   for box_name in boxes:
  //       contents = app_client.get_box_contents(box_name)
  //       decoded = int.from_bytes(contents, byteorder="big")
  //       print(f"\t{encode_address(box_name)} => {decoded} microAlgos")

  //   // Donator 1 and 2 claim Reward NFT
  //   sp = algod_client.suggested_params()
  //   optin_txns: List[TransactionWithSigner] = []

  //   for donator in accounts[1:]:
  //       optin_txn = TransactionWithSigner(
  //           AssetTransferTxn(
  //               donator.address,
  //               sp=sp,
  //               receiver=donator.address,
  //               amt=0,
  //               index=reward_nft,
  //           ),
  //           donator.signer,
  //       )
  //       optin_txns.append(optin_txn)

  //   // cover txn fee of optin and the inner txn sending the nft to the account
  //   sp.fee = sp.min_fee * 2
  //   sp.flat_fee = True

  //   // Donator1 calls claimNFT
  //   app_client2.call(
  //       claimNFT,
  //       optin=optin_txns[0],
  //       nft=reward_nft,
  //       suggested_params=sp,
  //       boxes=[(appid, decode_address(donator1.address))],
  //   )
  //   asset_info1 = algod_client.account_asset_info(donator1.address, reward_nft)
  //   asset_holding1 = asset_info1["asset-holding"]
  //   print(
  //       f"Donator 1 received {asset_holding1['amount']} asset with id {asset_holding1['asset-id']}."
  //   )

  //   // Donator2 calls claimNFT
  //   app_client3.call(
  //       claimNFT,
  //       optin=optin_txns[1],
  //       nft=reward_nft,
  //       suggested_params=sp,
  //       boxes=[(appid, decode_address(donator2.address))],
  //   )
  //   asset_info2 = algod_client.account_asset_info(
  //       donator2.address,
  //       reward_nft,
  //   )
  //   asset_holding2 = asset_info2["asset-holding"]
  //   print(
  //       f"Donator 1 received {asset_holding2['amount']} asset with id {asset_holding2['asset-id']}."
  //   )

  //   // Fundraiser creator claim all Funds
  //   result = app_client.call(claimFund, suggested_params=sp)
  //   print(f"Total claimed Funds: {result.return_value}")

  //   // Check that the remaining app address balance == minimum balance
  //   app_acct_info = app_client.get_application_account_info()
  //   print(
  //       f"App Balance: {app_acct_info['amount']} | Min Balance: {app_acct_info['min-balance']}"
  //   )

  //   // Delete boxes
  //   for box_name in boxes:
  //       app_client.call(
  //           delete_donator_info, donator=box_name, boxes=[(appid, box_name)]
  //       )
  //       print("Box Deleted")
  //   boxes = app_client.get_box_names()
  //   print(f"{len(boxes)} boxes found")

  //   // delete app
  //   try:
  //       app_client.delete()
  //       print("Fundraiser Deleted")
  //   except AlgodHTTPError as e:
  //       print(e)

  //   const method = 'hello'
  //   const response = await appClient.hello({ name: 'world' })
  //   console.log(`Called ${method} on ${app.name} (${app.appId}) with name = world, received: ${response.return}`)
  // }
}
