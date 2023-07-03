import { getToken } from 'next-auth/jwt'
import type { NextApiRequest } from 'next'
import { NextResponse } from 'next/server'
import axios from 'axios'

const getDataFromUserInfo = async (_req: NextApiRequest, token: {}) => {
  try {
    const response = await axios.get(`${process.env.ZITADEL_ISSUER}/oidc/v1/userinfo`, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
    })
    return NextResponse.json(response.data) // Axios automatically parses the JSON
  } catch (error) {
    console.error(error)

    return new Response(error?.toString() || null, {
      status: 500,
    })
  }
}

const handler = async (req: NextApiRequest) => {
  const token = await getToken({ req })
  if (!token?.accessToken) {
    return new Response(null, {
      status: 401,
    })
  }

  switch (req.method) {
    case 'GET':
      return await getDataFromUserInfo(req, token?.accessToken)
    default:
      return new Response(null, {
        status: 405,
      })
  }
}

export { handler as GET }
