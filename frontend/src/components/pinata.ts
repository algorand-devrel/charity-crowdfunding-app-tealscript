import pinataSDK from '@pinata/sdk'

const pinataJWT = import.meta.env.VITE_PINATA_JWT
const pinata = new pinataSDK({ pinataJWTKey: pinataJWT })

async function testAuthentication() {
  const res = await pinata.testAuthentication()
  console.log(res)
}

const WEB3STORAGE_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN
console.log(WEB3STORAGE_TOKEN)
// testAuthentication()
