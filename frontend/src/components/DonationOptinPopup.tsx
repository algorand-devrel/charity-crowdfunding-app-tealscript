import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { CharityFormData } from '../interfaces/charityFormData'
import { getAlgodClient } from '../utils/setupClients'

interface DonationPopupProps {
  openModal: boolean
  closeModal: () => void
  submission: CharityFormData
}

export function DonationOptinPopup({ openModal, closeModal, submission }: DonationPopupProps) {
  const [loading, setLoading] = useState<boolean>(false)

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const algodClient = getAlgodClient()

  const handleYesClick = async () => {
    setLoading(true)

    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    const signingAccount = { signer, addr: activeAddress } as TransactionSignerAccount

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
        setLoading(false)
      })

    enqueueSnackbar('Successfully opted in to the reward NFT', { variant: 'success' })
    setLoading(false)
    closeModal()
  }

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <p>Do you want to opt in to the reward NFT to receive the NFT for donating to this charity?</p>
        <p className="font-bold">(Minimum balance increases by 0.1 ALGO)</p>
        <div className="flex justify-center gap-40 pt-5">
          <button
            className="btn w-1/4 rounded-r bg-green-500 border-none hover:bg-green-600 text-white shadow-md transition-colors duration-300"
            onClick={handleYesClick}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Yes'}
          </button>
          <button
            className="btn w-1/4 rounded-r bg-red-500 border-none hover:bg-red-600 text-white shadow-md transition-colors duration-300"
            onClick={() => {
              closeModal()
            }}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'No'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
