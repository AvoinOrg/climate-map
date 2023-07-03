import { getToken } from 'next-auth/jwt'

import type { NextApiRequest } from 'next'
import { NextResponse } from 'next/server'

const getDataFromUserInfo = (_req: NextApiRequest, token: {}) => {
  const userInfoEndpoint = `${process.env.ZITADEL_ISSUER}/oidc/v1/userinfo`

  return fetch(userInfoEndpoint, {
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    method: 'GET',
  })
    .then((resp) => {
      return NextResponse.json(resp)
    })
    .catch((error) => {
      return new Response(error, {
        status: 500,
      })
    })
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
      return getDataFromUserInfo(req, token?.accessToken)
    default:
      return new Response(null, {
        status: 405,
      })
  }
}

export { handler as GET }
