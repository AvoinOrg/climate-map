import type { AreaApiProblem } from 'applets/energy/common/types/areas'

export class AreaApiError extends Error {
  readonly problem: AreaApiProblem

  constructor(problem: AreaApiProblem) {
    super(problem.diagnostic)
    this.name = 'AreaApiError'
    this.problem = problem
  }
}
