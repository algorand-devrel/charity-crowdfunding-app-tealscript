export interface FormData {
  title: string
  detail: string
  goal: number
  minDonate: number
  assetName: string
  assetUnitName: string
  nftAmount: number
  image: File | null // Specify the Blob type here
  imageUrl: string
  appID: number
  nftID: number
  organizer_address: string
}
