import { StartCreate } from '../components/StartCreate'
import { CharityFormData } from '../interfaces/charityFormData'

interface CreateComponentProps {
  onFormSubmit: (CharityFormData: CharityFormData) => void
  handleRemoveFundraiser: (submission: CharityFormData) => void
  submissions: CharityFormData[]
}

export function Create({ onFormSubmit, handleRemoveFundraiser, submissions }: CreateComponentProps) {
  return <StartCreate onFormSubmit={onFormSubmit} handleRemoveFundraiser={handleRemoveFundraiser} submissions={submissions} />
}
