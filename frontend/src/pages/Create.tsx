import { StartCreate } from '../components/StartCreate'
import { FormData } from '../interfaces/formData'

interface CreateComponentProps {
  onFormSubmit: (formData: FormData) => void
  handleRemoveFundraiser: (submission: FormData) => void
  submissions: FormData[]
}

export function Create({ onFormSubmit, handleRemoveFundraiser, submissions }: CreateComponentProps) {
  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ height: '80vh', maxWidth: '400px' }}>
      <StartCreate onFormSubmit={onFormSubmit} handleRemoveFundraiser={handleRemoveFundraiser} submissions={submissions} />
    </div>
  )
}
