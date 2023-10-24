import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { CharityCrowdfundingAppClient } from '../contracts/charityCrowdfundingApp'
import { FormData } from '../interfaces/formData'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface FundraiseItemProps {
  submission: FormData
}

export function FundraiseItem({ submission }: FundraiseItemProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [donationAmount, setDonationAmount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  })

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription)
  }

  const handleDonationChange = (e: { target: { valueAsNumber: number } }) => {
    setDonationAmount(e.target.valueAsNumber)
  }

  const handleDonationSubmit = async () => {
    // Process the donation here
    setLoading(true)
    const currentDonationAmount = donationAmount // Capture the current value
    console.log('Check what submission is', submission)
    console.log('Donation Amount: ', currentDonationAmount)
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    const appID = submission.appID
    const signingAccount = { signer, addr: activeAddress } as TransactionSignerAccount

    const appClient = new CharityCrowdfundingAppClient(
      {
        resolveBy: 'id',
        id: appID,
        sender: signingAccount,
      },
      algodClient,
    )
    const sp = await algodClient.getTransactionParams().do()

    const optinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: activeAddress,
      suggestedParams: sp,
      to: activeAddress,
      amount: 0,
      assetIndex: submission.nftID,
    })

    // Donator optin to reward NFT
    await algokit
      .sendTransaction({ transaction: optinTxn, from: signingAccount, sendParams: { suppressLog: true } }, algodClient)
      .catch((e: Error) => {
        enqueueSnackbar(e.message, { variant: 'error' })
      })

    // Donate Algo
    const donateTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: activeAddress,
      suggestedParams: sp,
      to: algosdk.getApplicationAddress(appID),
      amount: currentDonationAmount * 1e6,
    })

    // Call fund method
    await appClient
      .fund(
        { fundPay: donateTxn },
        {
          sendParams: { fee: algokit.transactionFees(2), suppressLog: true },
          assets: [submission.nftID],
          boxes: [{ appId: appID, name: signingAccount }],
        },
      )
      .catch((e: Error) => {
        enqueueSnackbar(e.message, { variant: 'error' })
      })
    setDonationAmount(0)
    setLoading(false)
  }

  return (
    <div className="card w-96 bg-base-100 shadow-xl rounded-md mx-auto my-auto overflow-hidden h-full">
      <figure className="overflow-hidden h-40">
        <img src={submission.imageUrl} alt="Fundraiser" />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title">{submission.title}</h2>
        <p
          className={`mt-3 ${showFullDescription ? 'show-full' : 'show-truncated'}`}
          style={{
            overflow: 'hidden',
            maxHeight: showFullDescription ? 'none' : '3em',
            transition: 'max-height 0.5s ease',
          }}
        >
          {submission.detail}
        </p>
        {submission.detail.length > 100 && (
          <button
            onClick={toggleDescription}
            className="show-more"
            style={{
              color: '#777',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            {showFullDescription ? 'Show less' : 'Show more'}
          </button>
        )}
        <p> Minimum Donation: {submission.minDonate} ALGO</p>
        {/* <progress className="progress progress-success w-56" value={progressPercentage} max="100"></progress> */}
        <div className="card-actions join justify-end">
          <input
            className="input input-bordered join-item"
            placeholder="Donation Amount in ALGOs"
            onChange={handleDonationChange}
            type="number"
          />
          <button
            className="btn join-item rounded-r bg-green-500 border-none hover:bg-green-600 shadow-md transition-colors duration-300"
            onClick={handleDonationSubmit}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Donate'}
          </button>
        </div>
      </div>
    </div>
  )
}
