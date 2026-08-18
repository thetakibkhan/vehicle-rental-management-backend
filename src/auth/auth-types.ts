import type { AuthenticatedStaff } from './authenticated-staff.js'

declare module 'express-serve-static-core' {
  interface Request {
    authenticatedStaff?: AuthenticatedStaff
  }
}

export {}
