import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { CharityCrowdfundingAppClient } from '../contracts/charityCrowdfundingApp'
import { CharityFormData } from '../interfaces/charityFormData'
import { getAlgodClient } from '../utils/setupClients'

import { DonationOptinPopup } from './DonationOptinPopup'

interface FundraiseItemProps {
  submission: CharityFormData
}

export function FundraiseItem({ submission }: FundraiseItemProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [donationAmount, setDonationAmount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [openOptinModal, setOptinModal] = useState<boolean>(false)

  const prevOpenOptinModal = useRef(openOptinModal)

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const algodClient = getAlgodClient()

  const handleDonateClick = async () => {
    setLoading(true)
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setDonationAmount(0)
      setLoading(false)
      return
    }
    try {
      await algodClient.accountAssetInformation(activeAddress, submission.nftID).do()
      donateToCharity()
    } catch (e) {
      toggleOptinModal()
    }
    setLoading(false)
  }

  const donateToCharity = async () => {
    // Process the donation here
    const currentDonationAmount = donationAmount // Capture the current value
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setDonationAmount(0)
      setLoading(false)
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

    const accountInfo = await algodClient.accountInformation(activeAddress).do()

    const optedInToApp = accountInfo['apps-local-state'].filter((app: { id: number }) => app.id === appID)

    // Optin to charity smart contract
    if (optedInToApp.length === 0) {
      await appClient.appClient.optIn().catch((e: Error) => {
        enqueueSnackbar(e.message, { variant: 'error' })
        setDonationAmount(0)
        setLoading(false)
      })
    }

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
        },
      )
      .catch((e: Error) => {
        enqueueSnackbar(e.message, { variant: 'error' })
        setDonationAmount(0)
        setLoading(false)
      })
    setDonationAmount(0)
    enqueueSnackbar(`You've successfully donated ${currentDonationAmount} ALGOs to this charity!`, { variant: 'success' })
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

  useEffect(() => {
    if (prevOpenOptinModal.current === true && openOptinModal === false) {
      donateToCharity()
    }
    prevOpenOptinModal.current = openOptinModal
  }, [openOptinModal])

  return (
    <div className="card shadow-xl rounded-md">
      <figure className="h-40">
        <img src={submission.charityImageUrl} alt="Fundraiser" />
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
        <div className="flex flex-row">
          <input
            className="input input-bordered w-3/4"
            placeholder="Donation Amount in ALGOs"
            onChange={handleDonationChange}
            value={donationAmount == 0 ? '' : donationAmount}
            type="number"
          />
          <button
            className="btn w-1/4 rounded-r bg-green-500 border-none hover:bg-green-600 text-white shadow-md transition-colors duration-300"
            onClick={handleDonateClick}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Donate'}
          </button>
          <DonationOptinPopup openModal={openOptinModal} closeModal={toggleOptinModal} submission={submission} />
        </div>
      </div>
    </div>
  )
}
