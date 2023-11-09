export interface FormData {
  title: string
  detail: string
  goal: number
  minDonate: number
  assetName: string
  assetUnitName: string
  nftAmount: number
  nftImage: File | null // Specify the Blob type here
  charityImage: File | null // Specify the Blob type here
  nftImageUrl: string
  charityImageUrl: string
  appID: number
  nftID: number
  organizer_address: string
}
