import { StartCreate } from '../components/StartCreate'
import { CharityFormData } from '../interfaces/CharityFormData'

interface CreateComponentProps {
  onFormSubmit: (CharityFormData: CharityFormData) => void
  handleRemoveFundraiser: (submission: CharityFormData) => void
  submissions: CharityFormData[]
}

export function Create({ onFormSubmit, handleRemoveFundraiser, submissions }: CreateComponentProps) {
  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ height: '80vh', maxWidth: '400px' }}>
      <StartCreate onFormSubmit={onFormSubmit} handleRemoveFundraiser={handleRemoveFundraiser} submissions={submissions} />
    </div>
  )
}
