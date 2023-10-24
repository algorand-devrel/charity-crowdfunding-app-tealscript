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
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface StartCreateComponentProps {
  onFormSubmit: (formData: FormData) => void
}

export function StartCreate({ onFormSubmit }: StartCreateComponentProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [w3s, setW3s] = useState<Web3Storage>()
  const [formData, setFormData] = useState<FormData>({
    title: '',
    detail: '',
    goal: 0,
    minDonate: 0,
    assetName: '',
    assetUnitName: '',
    nftAmount: 0,
    image: null,
    imageUrl: '',
    appID: 0,
    nftID: 0,
    organizer_address: '',
  })

  const { enqueueSnackbar } = useSnackbar()
  const { signer, activeAddress } = useWallet()

  const isFirstRender = useRef(true)
  useEffect(() => {
    const W3S_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN
    if (W3S_TOKEN === undefined) {
      enqueueSnackbar('Loading...', { variant: 'warning' })
      return
    }
    const w3s = new Web3Storage({ token: W3S_TOKEN })
    setW3s(w3s)
  }, [])

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  })

  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const indexer = algokit.getAlgoIndexerClient({
    server: indexerConfig.server,
    port: indexerConfig.port,
    token: indexerConfig.token,
  })

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

  const handleInputChange = (e: { target: { id: any; value: any } }) => {
    const { id, value } = e.target
    setFormData((prevFormData) => ({ ...prevFormData, [id]: value }))
  }

  const handleFileChange = (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prevFormData) => ({ ...prevFormData, image: file }))
      const reader = new FileReader()
      reader.onload = () => {
        setFormData((prevFormData) => ({ ...prevFormData, imageUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    if (!signer || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }
    console.log('W3S Token in handleSubmit', w3s)
    console.log('formData in handleSubmit: ', formData)

    const signingAccount = { signer, addr: activeAddress } as TransactionSignerAccount

    const appDetails = {
      resolveBy: 'creatorAndName',
      sender: signingAccount,
      creatorAddress: activeAddress,
      findExistingUsing: indexer,
    } as AppDetails

    const appClient = new CharityCrowdfundingAppClient(appDetails, algodClient)

    const app = await appClient.appClient.create().catch((e: Error) => {
      enqueueSnackbar(`Error deploying the contract: ${e.message}`, { variant: 'error' })
      setLoading(false)
      return
    })

    console.log('App created: ', app)

    if (!app) {
      enqueueSnackbar('App is Not Created!', { variant: 'warning' })
      return
    }

    const sp = await algodClient.getTransactionParams().do()

    const payMbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: activeAddress,
      to: app?.appAddress as string,
      amount: 200_000, // 0.1 ALGO to cover Asset MBR
      suggestedParams: sp,
    })

    const metadataRoot = await imageToArc3(formData.image)

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

    console.log('Bootstrap Output: ', bootstrapOutput)

    const rewardNftID = Number(bootstrapOutput?.return?.valueOf())
    console.log('The created Reward NFT ID is: ', rewardNftID)
    if (!app || !rewardNftID) {
      enqueueSnackbar('App and reward NFT is Not Created!', { variant: 'warning' })
      return
    }

    setFormData((prevFormData) => ({ ...prevFormData, appID: Number(app.appId), nftID: rewardNftID, organizer_address: activeAddress }))
  }
  useEffect(() => {
    if (isFirstRender.current || formData.appID === 0 || formData.nftID === 0) {
      isFirstRender.current = false
      return
    }

    console.log('formData in useEffect: ', formData)
    onFormSubmit(formData)

    setFormData({
      title: '',
      detail: '',
      goal: 0,
      minDonate: 0,
      assetName: '',
      assetUnitName: '',
      nftAmount: 0,
      image: null,
      imageUrl: '',
      appID: 0,
      nftID: 0,
      organizer_address: '',
    })
    setLoading(false)
  }, [formData.appID, formData.nftID])

  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <div className="form-control mx-auto py-8 text-center max-w-lg">
        <h1 className="text-2xl font-bold mb-4">Charity Details</h1>
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
            <input type="file" className="file-input rounded" id="image" onChange={handleFileChange} />
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
