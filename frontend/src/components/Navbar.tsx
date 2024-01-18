import { useWallet } from '@txnlab/use-wallet'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConnectWallet from './ConnectWallet'

export function Navbar() {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }
  return (
    <div className="navbar bg-base-200 h-16">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
          AlgoCharity
        </Link>
      </div>
      <div className="navbar-center">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/create">Create Charity</Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end">
        <button
          className="btn m-2 bg-green-500 rounded border-none hover:bg-green-600 transition-colors duration-300"
          onClick={toggleWalletModal}
        >
          <p className="text-white">{activeAddress ? 'Disconnect' : 'Connect Wallet'} </p>
        </button>

        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      </div>
    </div>
  )
}
