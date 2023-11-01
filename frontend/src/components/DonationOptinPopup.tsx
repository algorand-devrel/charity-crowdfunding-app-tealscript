export function DonationPopup({ show, onClose }) {
  return (
    <div className={`popup ${show ? 'active' : ''}`}>
      <div className="popup-content">
        <p>Do you want to opt in to the reward NFT to receive the NFT for donating to this charity?</p>
        <div className="button-container">
          <button className="green-button" onClick={() => console.log('Yes clicked')}>
            Yes
          </button>
          <button className="red-button" onClick={() => onClose()}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}
