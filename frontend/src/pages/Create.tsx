import { StartCreate } from '../components/CreateCharity'
import { FormData } from '../interfaces/formData'

interface CreateComponentProps {
  onFormSubmit: (formData: FormData) => void
}

export function Create({ onFormSubmit }: CreateComponentProps) {
  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ height: '80vh', maxWidth: '400px' }}>
      <StartCreate onFormSubmit={onFormSubmit} />
    </div>
  )
}
