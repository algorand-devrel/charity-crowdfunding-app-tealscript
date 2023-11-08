interface DonationPopupProps {
  openModal: boolean
  closeModal: () => void
}

export function DonationOptinPopup({ openModal, closeModal }: DonationPopupProps) {
  const handleYesClick = () => {
    console.log('Yes Clicked')
    closeModal()
  }

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <p>Do you want to opt in to the reward NFT to receive the NFT for donating to this charity?</p>
        <div className="button-container">
          <button className="btn bg-green-600 border-1  m-2" onClick={handleYesClick}>
            Yes
          </button>
          <button
            className="btn bg-red-500 border-1  m-2"
            onClick={() => {
              closeModal()
            }}
          >
            No
          </button>
        </div>
      </form>
    </dialog>
  )
}
