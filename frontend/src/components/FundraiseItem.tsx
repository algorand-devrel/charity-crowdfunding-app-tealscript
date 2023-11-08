import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { CharityCrowdfundingAppClient } from '../contracts/charityCrowdfundingApp'
import { FormData } from '../interfaces/formData'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { DonationOptinPopup } from './DonationOptinPopup'

interface FundraiseItemProps {
  submission: FormData
}

export function FundraiseItem({ submission }: FundraiseItemProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [donationAmount, setDonationAmount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [openOptinModal, setOptinModal] = useState<boolean>(false)

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  })

  const donateToCharity = async () => {
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
    //TODO: check if user has already opted in to reward NFT. If yes, skip this step.

    // // Ask if user wants to optin to reward NFT
    // setOptinModal(true, () => {
    //   // After the state has been updated, continue with your code
    //   waitForPopupToClose().then(() => {
    //     // Continue with your code after the popup is closed
    //   });
    // });

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

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription)
  }

  const handleDonationChange = (e: { target: { valueAsNumber: number } }) => {
    setDonationAmount(e.target.valueAsNumber)
  }

  const toggleOptinModal = () => {
    setOptinModal(!openOptinModal)
  }

  const handleDonationClick = async () => {
    setOptinModal(true)

    const waitForPopupToClose = () => {
      if (openOptinModal === false) {
        console.log('Popup closed')
        donateToCharity()
      } else {
        console.log('Waiting for popup to close')
        setTimeout(waitForPopupToClose, 100)
      }
    }

    waitForPopupToClose()
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
            onClick={handleDonationClick}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Donate'}
          </button>
          <DonationOptinPopup openModal={openOptinModal} closeModal={toggleOptinModal} />
        </div>
      </div>
    </div>
  )
}
