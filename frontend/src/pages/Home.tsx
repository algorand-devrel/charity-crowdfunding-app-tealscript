import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FundraiseItem } from '../components/FundraiseItem'
import { CharityFormData } from '../interfaces/charityFormData'

interface HomeComponentProps {
  submissions: CharityFormData[]
}

export function Home({ submissions }: HomeComponentProps) {
  const [fundRaiserData, setFundRaiserData] = useState<CharityFormData[]>([])

  useEffect(() => {
    if (submissions.length > 0) {
      setFundRaiserData(submissions)
    }
  }, [submissions])

  return (
    <>
      <section className="hero-section">
        <div className="hero h-[500px]" style={{ backgroundImage: "url('../../public/imgs/hero.jpg')" }}>
          <div className="hero-overlay"></div>
          <div className="hero-content text-center text-neutral-content">
            <div className="max-w-md">
              <h1 className="mb-5 text-5xl font-bold">Welcome to AlgoCharity</h1>
              <p className="mb-5">
                A decentralized crowdfunding platform built on Algorand. Start your own charity or donate to listed charities.
              </p>
              <Link
                className="btn rounded bg-green-500 border-none hover:bg-green-600 shadow-md transition-colors duration-300"
                to="/create"
              >
                <p className="text-white">Start Charity</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="fundraisers-section">
        <div className="container mx-auto mt-10">
          <h2 className="text-3xl font-bold text-center">Browse nonprofit fundraisers</h2>
          <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10 px-10 pb-10">
            {fundRaiserData.map((submission: CharityFormData, index: number) => (
              <FundraiseItem key={index} submission={submission} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
