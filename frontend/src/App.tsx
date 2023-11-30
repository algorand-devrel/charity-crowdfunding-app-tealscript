/* eslint-disable @typescript-eslint/no-explicit-any */
import { DeflyWalletConnect } from '@blockshake/defly-connect'
import { DaffiWalletConnect } from '@daffiwallet/connect'
import { PeraWalletConnect } from '@perawallet/connect'
import { PROVIDER_ID, ProvidersArray, WalletProvider, useInitializeProviders } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import { SnackbarProvider } from 'notistack'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { FormData } from './interfaces/formData'
import { Create } from './pages/Create'
import { Home } from './pages/Home'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let providersArray: ProvidersArray
if (import.meta.env.VITE_ALGOD_NETWORK === '') {
  providersArray = [{ id: PROVIDER_ID.KMD }]
} else {
  providersArray = [
    { id: PROVIDER_ID.DEFLY, clientStatic: DeflyWalletConnect },
    { id: PROVIDER_ID.PERA, clientStatic: PeraWalletConnect },
    { id: PROVIDER_ID.DAFFI, clientStatic: DaffiWalletConnect },
    { id: PROVIDER_ID.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const [submissions, setSubmissions] = useState<any>([])

  const handleFormSubmit = (formData: FormData) => {
    const newSubmission = formData
    setSubmissions((prevSubmissions: any) => [...prevSubmissions, newSubmission])
  }

  const handleRemoveFundraiser = (submission: FormData) => {
    const newSubmissions = submissions.filter((s: FormData) => s !== submission)
    setSubmissions(newSubmissions)
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletProviders = useInitializeProviders({
    providers: providersArray,
    nodeConfig: {
      network: algodConfig.network,
      nodeServer: algodConfig.server,
      nodePort: String(algodConfig.port),
      nodeToken: String(algodConfig.token),
    },
    algosdkStatic: algosdk,
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider value={walletProviders}>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home submissions={submissions} />} />
            <Route
              path="/create"
              element={<Create onFormSubmit={handleFormSubmit} handleRemoveFundraiser={handleRemoveFundraiser} submissions={submissions} />}
            />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}
