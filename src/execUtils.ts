import {spawn, exec} from 'child_process'

const streamToString = async (stream: NodeJS.ReadableStream): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  return buffer.toString('utf-8')
}

export type ExecCommandResult = {
  stdout: string
  stderr: string
  exitCode: number | null
}

export const execCommand = async (command: string, args: string[]): Promise<ExecCommandResult> => {
  return new Promise(async resolve => {
    const child = spawn(command, args)
    const stderr = await streamToString(child.stderr)
    const stdout = await streamToString(child.stdout)

    child.on('close', exitCode => {
      resolve({stdout, stderr, exitCode})
    })
  })
}

export const execCommandPipeStderr = async (command: string, args: string[]): Promise<ExecCommandResult> => {
  return new Promise(async resolve => {
    const child = spawn(command, args)
    child.stderr.pipe(process.stderr)
    const stdout = await streamToString(child.stdout)

    child.on('close', exitCode => {
      resolve({stdout, stderr: '', exitCode})
    })
  })
}

export const execCommandPipeOutput = async (command: string, args: string[]): Promise<number> => {
  return new Promise(async resolve => {
    const child = spawn(command, args)
    child.stderr.pipe(process.stderr)
    child.stdout.pipe(process.stdout)

    child.on('close', exitCode => {
      if (exitCode === null) {
        throw new Error(`Exit code is null of '${command} ${args.join(' ')}'`)
      }
      resolve(exitCode)
    })
  })
}

export const execSh = async (command: string): Promise<ExecCommandResult> => {
  return new Promise(async resolve => {
    exec(command, (err, stdout, stderr) => {
      resolve({stdout, stderr, exitCode: err === undefined ? 0 : 1})
    })
  })
}
