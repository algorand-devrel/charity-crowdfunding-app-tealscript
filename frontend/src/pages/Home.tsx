import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FundraiseItem } from '../components/FundraiseItem'
import { FormData } from '../interfaces/formData'

interface HomeComponentProps {
  submissions: FormData[]
}

export function Home({ submissions }: HomeComponentProps) {
  const [fundRaiserData, setFundRaiserData] = useState<any>([])

  // useEffect(() => {
  //   console.log('submissions in home: ', submissions)
  //   const processedData = submissions.map((submission: FormData) => {
  //     const fileReader = new FileReader()
  //     if (submission.image) {
  //       fileReader.onload = () => {
  //         setImageUrl(reader.result as string);
  //       };
  //       reader.readAsDataURL(file);
  //     fileReader.readAsDataURL(submission.image)
  //     fileReader.onload = (e) => {
  //       if (!e.target) return
  //       const imageSrc = e.target.result
  //       setFundRaiserData((prevData: any) => [...prevData, { ...submission, image: imageSrc }])
  //     }
  //     return fileReader
  //   }

  //     console.log('No image found in submission: ', submission)
  //   return () => {
  //     processedData.forEach((fileReader: FileReader) => {
  //       fileReader.abort()
  //     })
  //   }
  // }, [submissions])

  useEffect(() => {
    console.log('Received submissions in Home:', submissions)
    if (submissions.length > 0) {
      setFundRaiserData(submissions)
    }
  }, [submissions])

  return (
    <>
      <section className="hero-section">
        <div className="hero h-[500px]" style={{ backgroundImage: "url('../../public/imgs/hero.jpg')" }}>
          <div className="hero-overlay bg-opacity-60"></div>
          <div className="hero-content text-center text-neutral-content">
            <div className="max-w-md">
              <h1 className="mb-5 text-5xl font-bold">Hello there</h1>
              <p className="mb-5">
                AlgoCharity is a decentralized crowdfunding platform built on Algorand. Start your own charity or donate to listed
                charities.
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
          <div className="grid grid-cols-3 gap-4 grid-auto-rows-auto mt-10">
            {fundRaiserData.map((submission: object) => (
              <FundraiseItem submission={submission} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
