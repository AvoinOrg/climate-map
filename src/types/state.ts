export type VerificationStatus = 'unverified' | 'errored' | 'verified' | 'emailErrored' | 'emailSent'

export type ProfileState = 'none' | 'data' | 'dataIntegrate' | 'verification' | 'farmCarbon'

export type ModalState = 'none' | 'signup' | 'login' | 'profile'

export type RouteState = 'none' | 'allowed' | 'verify' | 'fetching' | 'denied' | 'login'
