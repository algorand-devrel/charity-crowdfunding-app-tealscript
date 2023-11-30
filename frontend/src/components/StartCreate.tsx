import * as algokit from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { AppDetails } from '@algorandfoundation/algokit-utils/types/app-client'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { Web3Storage } from 'web3.storage'
import { CharityCrowdfundingAppClient } from '../contracts/charityCrowdfundingApp'
import { FormData } from '../interfaces/formData'
import { getAlgodClient, getIndexerClient } from '../utils/setupClients'

/**
 * Interface
 *
 * onFormSubmit - function to submit the form data and add to the submissions array in App.tsx
 * handleRemoveFundraiser - function to remove the fundraiser from the submissions array in App.tsx
 * submissions - array of submissions in App.tsx
 */

interface StartCreateComponentProps {
  onFormSubmit: (formData: FormData) => void
  handleRemoveFundraiser: (submission: FormData) => void
  submissions: FormData[]
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
  const [w3s, setW3s] = useState<Web3Storage>()
  const [formData, setFormData] = useState<FormData>({
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

  // Initialize Web3 Storage. Used to store the NFT image and metadata on IPFS
  useEffect(() => {
    const W3S_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN
    if (W3S_TOKEN === undefined) {
      enqueueSnackbar('Loading...', { variant: 'warning' })
      return
    }
    const w3s = new Web3Storage({ token: W3S_TOKEN })
    setW3s(w3s)
  }, [])

  // Set up algod, Indexer
  const algodClient = getAlgodClient()
  const indexer = getIndexerClient()

  // Function to convert the NFT image to Arc3 format (https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)
  async function imageToArc3(file: any) {
    if (!w3s) {
      enqueueSnackbar('Web3 Storage not initialized', { variant: 'warning' })
      return
    }

    const imageFile = new File([await file.arrayBuffer()], file.name, { type: file.type })
    const imageRoot = await w3s.put([imageFile], { name: file.name })

    const metadata = JSON.stringify({
      decimals: 0,
      name: formData.assetName,
      unitName: formData.assetUnitName,
      image: `ipfs://${imageRoot}/${file.name}`,
      image_mimetype: file.type,
      properties: {},
    })

    const metadataFile = new File([metadata], 'metadata.json', { type: 'text/plain' })
    const metadataRoot = await w3s.put([metadataFile], { name: 'metadata.json' })

    return metadataRoot
  }

  // store user form input to formData
  const handleInputChange = (e: { target: { id: any; value: any } }) => {
    const { id, value } = e.target
    setFormData((prevFormData) => ({ ...prevFormData, [id]: value }))
  }

  // store user charity image file upload to formData
  const handleCharityFileChange = (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prevFormData) => ({ ...prevFormData, charityImage: file }))
      const reader = new FileReader()
      reader.onload = () => {
        setFormData((prevFormData) => ({ ...prevFormData, charityImageUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  // store user nft image file upload to formData
  const handleNftFileChange = (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prevFormData) => ({ ...prevFormData, nftImage: file }))
      const reader = new FileReader()
      reader.onload = () => {
        setFormData((prevFormData) => ({ ...prevFormData, nftImageUrl: reader.result as string }))
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

    const metadataRoot = await imageToArc3(formData.nftImage).catch((e: Error) => {
      enqueueSnackbar(`Error Bootstraping the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    await imageToArc3(formData.charityImage).catch((e: Error) => {
      enqueueSnackbar(`Error Bootstraping the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    // Use the appClient to call the bootstrap contract method
    const bootstrapOutput = await appClient
      .bootstrap(
        {
          title: formData.title,
          detail: formData.detail,
          goal: Number(formData.goal) * 1e6,
          minDonation: Number(formData.minDonate) * 1e6,
          mbrPay: { transaction: payMbrTxn, signer: signingAccount },
          assetName: formData.assetName,
          unitName: formData.assetUnitName,
          nftAmount: Number(formData.nftAmount),
          assetUrl: `ipfs://${metadataRoot}/metadata.json#arc3`,
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

    setFormData((prevFormData) => ({ ...prevFormData, appID: Number(app.appId), nftID: rewardNftID, organizer_address: activeAddress }))
  }

  // Using useEffect to wait for formData to be updated and then add the formData to the submissions array in App.tsx
  useEffect(() => {
    if (isFirstRender.current || formData.appID === 0 || formData.nftID === 0) {
      isFirstRender.current = false
      return
    }

    console.log('formData after App Creation: ', formData)
    onFormSubmit(formData)
    enqueueSnackbar(`Charity Successfully Created!`, { variant: 'success' })

    // Reset the formData
    setFormData({
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
  }, [formData.appID, formData.nftID])

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
              value={formData.title}
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
                value={formData.goal}
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
                value={formData.minDonate}
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
              value={formData.detail}
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
              value={formData.assetName}
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
              value={formData.assetUnitName}
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
              value={formData.nftAmount}
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
