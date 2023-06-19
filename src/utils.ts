export const throwErr = (errorMessage: string): never => {
  throw new Error(errorMessage)
}

export const getWorkspacePath = (): string => {
  return process.env.GITHUB_WORKSPACE ?? throwErr("'GITHUB_WORKSPACE' env variable not found")
}

export async function logTimeTaken<T>(name: string, fn: () => Promise<T>): Promise<T> {
  console.time(name)
  const result = await fn()
  console.timeEnd(name)
  return result
}
