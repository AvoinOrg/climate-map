import axios, { AxiosError } from 'axios'
import { type NextRequest } from 'next/server'

const API_URL = process.env.HIILIKARTTA_API_URL

const withErrorHandler = (handler: (req: NextRequest) => Promise<Response>) => {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as AxiosError // type-cast error to AxiosError

        if (axiosError.response) {
          // The request was made and the server responded with a status code outside of the 2xx range
          return new Response(JSON.stringify(axiosError.response.data), {
            status: axiosError.response.status,
          })
        } else if (axiosError.request) {
          // The request was made but no response was received
          return new Response('No response from server', { status: 500 })
        }
      }
      // Something happened in setting up the request that triggered an Error
      return new Response('Request setup error', { status: 500 })
    }
  }
}

const GET = withErrorHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams
  const id = searchParams.get('id')
  const res = await axios.get(`${API_URL}/calculation`, { params: { id } })

  const data = res.data

  return new Response(JSON.stringify(data), { status: res.status })
})

const POST = withErrorHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams
  const id = searchParams.get('id')
  const formData = await req.formData()
  const res = await axios.post(`${API_URL}/calculation`, formData, {
    params: { id },
  })
  return new Response(JSON.stringify(res.data), { status: res.status })
})

export { GET, POST }
