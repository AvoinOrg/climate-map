import 'next-auth'

declare module 'next-auth' {
  /**
   * Extends the built-in session types with custom properties.
   */
  interface Session {
    // Add the accessToken property to the Session type
    accessToken?: string
    user?: {
      id: string
      name: string
      email: string
      image: string
    }
  }
}
