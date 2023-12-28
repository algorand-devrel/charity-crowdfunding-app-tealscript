import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { AppDetails } from '@algorandfoundation/algokit-utils/types/app-client'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { CharityCrowdfundingAppClient } from '../contracts/charityCrowdfundingApp'
import { CharityFormData } from '../interfaces/CharityFormData'
import { pinFileToIPFS, pinJSONToIPFS } from '../utils/pinata'
import { getAlgodClient, getIndexerClient } from '../utils/setupClients'

/**
 * Interface
 *
 * onFormSubmit - function to submit the form data and add to the submissions array in App.tsx
 * handleRemoveFundraiser - function to remove the fundraiser from the submissions array in App.tsx
 * submissions - array of submissions in App.tsx
 */

interface StartCreateComponentProps {
  onFormSubmit: (CharityFormData: CharityFormData) => void
  handleRemoveFundraiser: (submission: CharityFormData) => void
  submissions: CharityFormData[]
}

/**
 * StartCreate Component Explained
 *
 * This component is used to create a new fundraiser. It is rendered in the Create page.
 * Also contains the Withdraw Funds feature. If the connected wallet created a fundraiser, the Withdraw Funds button will appear.
 */

export function StartCreate({ onFormSubmit, handleRemoveFundraiser, submissions }: StartCreateComponentProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [currentFundraiserBalance, setCurrentFundraiserBalance] = useState<number>(0)
  const [CharityFormData, setCharityFormData] = useState<CharityFormData>({
    title: '',
    detail: '',
    goal: 0,
    minDonate: 0,
    assetName: '',
    assetUnitName: '',
    nftAmount: 0,
    nftImage: null,
    charityImage: null,
    nftImageUrl: '',
    charityImageUrl: '',
    appID: 0,
    nftID: 0,
    organizer_address: '',
  })

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const isFirstRender = useRef(true)

  const imageToArc3 = async (file: File): Promise<string> => {
    const ipfsHash = await pinFileToIPFS(file)
    const metadataRoot = await pinJSONToIPFS(CharityFormData.assetName, CharityFormData.assetUnitName, String(ipfsHash), file)

    console.log(metadataRoot)
    return String(metadataRoot)
  }

  // Set up algod, Indexer
  const algodClient = getAlgodClient()
  const indexer = getIndexerClient()

  // store user form input to CharityFormData
  const handleInputChange = (e: { target: { id: any; value: any } }) => {
    const { id, value } = e.target
    setCharityFormData((prevCharityFormData) => ({ ...prevCharityFormData, [id]: value }))
  }

  // store user charity image file upload to CharityFormData
  const handleCharityFileChange = (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (file) {
      setCharityFormData((prevCharityFormData) => ({ ...prevCharityFormData, charityImage: file }))
      const reader = new FileReader()
      reader.onload = () => {
        setCharityFormData((prevCharityFormData) => ({ ...prevCharityFormData, charityImageUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  // store user nft image file upload to CharityFormData
  const handleNftFileChange = (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (file) {
      setCharityFormData((prevCharityFormData) => ({ ...prevCharityFormData, nftImage: file }))
      const reader = new FileReader()
      reader.onload = () => {
        setCharityFormData((prevCharityFormData) => ({ ...prevCharityFormData, nftImageUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * handleSubmit
   *
   * This function does multiple things
   * 1. Deploy the CharityCrowdfundingApp contract
   * 2. Bootstrap the contract with the following:
   *  - App Details
   *   * Title
   *   * Detail
   *   * Goal
   *   * Minimum Donation
   *   * Asset Name
   *   * Unit Name
   *   * NFTAmount
   *   * Asset URL
   *  - Send 0.2 ALGO to the contract to cover the MBR
   *  - Create the Reward NFT
   */
  const handleSubmit = async () => {
    setLoading(true)
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    const signingAccount = { signer, addr: activeAddress } as TransactionSignerAccount

    // Initialize the CharityCrowdfundingAppClient
    const appDetails = {
      resolveBy: 'creatorAndName',
      sender: signingAccount,
      creatorAddress: activeAddress,
      findExistingUsing: indexer,
    } as AppDetails

    const appClient = new CharityCrowdfundingAppClient(appDetails, algodClient)

    //Use the appClient to deploy the contract
    const app = await appClient.appClient.create().catch((e: Error) => {
      enqueueSnackbar(`Error deploying the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    const sp = await algodClient.getTransactionParams().do()

    // Create a payment transaction to send 0.2 ALGO to the contract to cover the MBR
    const payMbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: activeAddress,
      to: app?.appAddress as string,
      amount: 200_000, // 0.2 ALGO to cover Asset MBR and contract MBR
      suggestedParams: sp,
    })

    if (!CharityFormData.nftImage || !CharityFormData.charityImage) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    const metadataRoot = await imageToArc3(CharityFormData.nftImage).catch((e: Error) => {
      enqueueSnackbar(`Error Bootstraping the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })
    console.log('metadataRoot outside: ', metadataRoot)

    await imageToArc3(CharityFormData.charityImage).catch((e: Error) => {
      enqueueSnackbar(`Error Bootstraping the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    // Use the appClient to call the bootstrap contract method
    const bootstrapOutput = await appClient
      .bootstrap(
        {
          title: CharityFormData.title,
          detail: CharityFormData.detail,
          goal: Number(CharityFormData.goal) * 1e6,
          minDonation: Number(CharityFormData.minDonate) * 1e6,
          mbrPay: { transaction: payMbrTxn, signer: signingAccount },
          assetName: CharityFormData.assetName,
          unitName: CharityFormData.assetUnitName,
          nftAmount: Number(CharityFormData.nftAmount),
          assetUrl: `ipfs://${metadataRoot}/#arc3`,
        },
        { sendParams: { fee: algokit.transactionFees(2) } },
      )
      .catch((e: Error) => {
        enqueueSnackbar(`Error Bootstraping the contract: ${e.message}`, { variant: 'error' })
        setLoading(false)
        return
      })

    const rewardNftID = Number(bootstrapOutput?.return?.valueOf())
    console.log('The created Reward NFT ID is: ', rewardNftID)

    if (!app || !rewardNftID) {
      enqueueSnackbar('App and reward NFT is Not Created!', { variant: 'warning' })
      return
    }

    setCharityFormData((prevCharityFormData) => ({
      ...prevCharityFormData,
      appID: Number(app.appId),
      nftID: rewardNftID,
      organizer_address: activeAddress,
    }))
  }

  // Using useEffect to wait for CharityFormData to be updated and then add the CharityFormData to the submissions array in App.tsx
  useEffect(() => {
    if (isFirstRender.current || CharityFormData.appID === 0 || CharityFormData.nftID === 0) {
      isFirstRender.current = false
      return
    }

    console.log('CharityFormData after App Creation: ', CharityFormData)
    onFormSubmit(CharityFormData)
    enqueueSnackbar(`Charity Successfully Created!`, { variant: 'success' })

    // Reset the CharityFormData
    setCharityFormData({
      title: '',
      detail: '',
      goal: 0,
      minDonate: 0,
      assetName: '',
      assetUnitName: '',
      nftAmount: 0,
      nftImage: null,
      charityImage: null,
      nftImageUrl: '',
      charityImageUrl: '',
      appID: 0,
      nftID: 0,
      organizer_address: '',
    })
    setLoading(false)
  }, [CharityFormData.appID, CharityFormData.nftID])

  //################## Withdraw Funds Feature ##################

  // Check if the current wallet has created a fundraiser
  function checkCurrentFundraiser() {
    for (let i = 0; i < submissions.length; i++) {
      if (activeAddress === submissions[i].organizer_address) {
        return submissions[i]
      }
    }
    return null
  }

  const currentFundraiser = checkCurrentFundraiser()

  // Get the current fundraiser balance
  async function getCurrentFundraiserBalance() {
    setLoading(true)

    if (!currentFundraiser) {
      enqueueSnackbar('This wallet did not create a fundraiser', { variant: 'warning' })
      setLoading(false)
      return
    }

    const appAddr = await algosdk.getApplicationAddress(currentFundraiser.appID)

    const fundraiserBalance = await algodClient
      .accountInformation(appAddr)
      .do()
      .catch((e: Error) => {
        enqueueSnackbar(`Error getting the contract balance: ${e.message}`, { variant: 'error' })
        setLoading(false)
        return
      })

    setCurrentFundraiserBalance(fundraiserBalance?.amount / 1_000_000)
    setLoading(false)
  }

  // Using useEffect to wait for currentFundraiser to be updated and then get the current fundraiser balance
  useEffect(() => {
    if (isFirstRender.current || !currentFundraiser) {
      isFirstRender.current = false
      return
    }
    getCurrentFundraiserBalance()
  }, [currentFundraiser])

  // Withdraw the funds from the fundraiser
  async function handleWithdraw() {
    setLoading(true)
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    if (!currentFundraiser) {
      enqueueSnackbar('This wallet did not create a fundraiser', { variant: 'warning' })
      setLoading(false)
      return
    }

    const signingAccount = { signer, addr: activeAddress } as TransactionSignerAccount

    // Initialize the CharityCrowdfundingAppClient with the current fundraiser appID
    const appID = currentFundraiser?.appID
    const appClient = new CharityCrowdfundingAppClient(
      {
        resolveBy: 'id',
        id: appID,
        sender: signingAccount,
      },
      algodClient,
    )

    // Use the appClient to call the claimFund contract method
    const claimedFunds = await appClient.claimFund({}, { sendParams: { fee: algokit.transactionFees(2) } }).catch((e: Error) => {
      enqueueSnackbar(`Error withdrawing the funds: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    enqueueSnackbar(`Successfully withdrew ${Number(claimedFunds?.return) / 1_000_000} ALGOs`, { variant: 'success' })

    handleRemoveFundraiser(currentFundraiser)
    setLoading(false)
  }

  return (
    <div className="flex justify-center items-center h-screen w-screen mt-10">
      <div className="form-control mx-auto py-8 text-center max-w-lg mt-10">
        {activeAddress === currentFundraiser?.organizer_address && (
          <div className="form-control max-w-lg">
            <h1 className="text-2xl font-bold mb-4 mt-10">Withdraw Funds</h1>
            <h2 className="mb-4 max-w-lg">Total Raised Funds: {currentFundraiserBalance - 0.2} ALGOs</h2>
            <button
              className="btn join-item rounded-r bg-green-500 border-none hover:bg-green-600 shadow-md transition-colors duration-300"
              onClick={handleWithdraw}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner" /> : <p className="text-white">Withdraw funds</p>}
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-4 mt-4">Charity Details</h1>
        <div className="flex flex-wrap -mx-2 mb-4">
          <div className=" form-control w-full md:w-1/ px-2 mb-4">
            <label className="label">
              <span className="label-text">Charity Title</span>
            </label>
            <input
              type="text"
              placeholder="Type here"
              className="input input-bordered w-full rounded"
              id="title"
              value={CharityFormData.title}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-control flex w-full md:w-1/2 px-2 mb-4">
            <label className="label">
              <span className="label-text">Fund Goal</span>
            </label>
            <div className="relative flex">
              <input
                type="number"
                placeholder="ALGO"
                className="input input-bordered rounded-l w-3/4"
                id="goal"
                value={CharityFormData.goal}
                onChange={handleInputChange}
              />
              <span className="flex items-center  border border-l-0 border-r rounded-r border-neutral-300 px-3 py-[0.25rem] text-center text-base bg-gray-200 text-gray-600 font-semibold">
                ALGO
              </span>
            </div>
          </div>
          <div className="form-control flex w-full md:w-1/2 px-2 mb-4">
            <label className="label">
              <span className="label-text">Minimum Donation</span>
            </label>
            <div className="relative flex">
              <input
                type="number"
                placeholder="ALGO"
                className="input input-bordered rounded-l w-3/4"
                id="minDonate"
                value={CharityFormData.minDonate}
                onChange={handleInputChange}
              />
              <span className="flex items-center  border border-l-0 border-r rounded-r border-neutral-300 px-3 py-[0.25rem] text-center text-base bg-gray-200 text-gray-600 font-semibold">
                ALGO
              </span>
            </div>
          </div>
          <div className="form-control w-full md:w-1/ px-2 mb-4">
            <label className="label">
              <span className="label-text">Charity Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24 rounded"
              placeholder="Describe what the charity is about"
              id="detail"
              value={CharityFormData.detail}
              onChange={handleInputChange}
            ></textarea>
          </div>
          <div className="form-control w-full md:w-1/2 px-2 mb-4">
            <input type="file" className="file-input rounded" id="image" onChange={handleCharityFileChange} />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Proof of Donation NFT Details</h1>
        <div className="flex flex-wrap -mx-2 mb-4">
          <div className="form-control w-full md:w-1/ px-2 mb-4">
            <label className="label">
              <span className="label-text">Reward NFT Name</span>
            </label>
            <input
              type="text"
              placeholder="Type here"
              className="input input-bordered w-full rounded"
              id="assetName"
              value={CharityFormData.assetName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-control w-full md:w-1/2 px-2 mb-4">
            <label className="label">
              <span className="label-text">NFT Unit Name</span>
            </label>
            <input
              type="text"
              placeholder="Type here"
              className="input input-bordered w-full rounded"
              id="assetUnitName"
              value={CharityFormData.assetUnitName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-control w-full md:w-1/2 px-2 mb-4">
            <label className="label">
              <span className="label-text">Total Amount</span>
            </label>
            <input
              type="number"
              placeholder="Type here"
              className="input input-bordered w-full rounded"
              id="nftAmount"
              value={CharityFormData.nftAmount}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-control w-full md:w-1/2 px-2 mb-4">
            <input type="file" className="file-input rounded" id="image" onChange={handleNftFileChange} />
          </div>
        </div>
        <button
          className="btn join-item rounded-r bg-green-500 border-none hover:bg-green-600 shadow-md transition-colors duration-300"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <span className="loading loading-spinner" /> : <p className="text-white">Create Fundraiser</p>}
        </button>
      </div>
    </div>
  )
}
