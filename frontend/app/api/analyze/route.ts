import { NextResponse } from 'next/server'
import { RequestSchema } from '../../../../backend/schemas/request'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation error',
        },
        { status: 400 }
      )
    }

    const inputData = parsed.data

    // Path to the Python orchestrator script
    // Since Next.js is in frontend/, we go up one directory to AI-agents
    const scriptDir = path.resolve(process.cwd(), '../AI-agents')
    const scriptPath = path.resolve(scriptDir, 'agent_orchestrator.py')

    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: scriptDir, // Ensure python executes starting from AI-agents directory so local modules resolve properly
        env: {
          ...process.env,
        }
      })

      let dataBuffer = ''
      let errorBuffer = ''

      pythonProcess.stdout.on('data', (chunk) => {
        dataBuffer += chunk.toString()
      })

      pythonProcess.stderr.on('data', (chunk) => {
        errorBuffer += chunk.toString()
      })

      pythonProcess.on('close', (code) => {
        if (code !== 0 && !dataBuffer.trim()) {
          reject(new Error(`Python process failed with code ${code}\nError trace: ${errorBuffer}`))
          return
        }
        
        try {
          // Resolve JSON from stdout cleanly
          const jsonString = dataBuffer.trim()
          if (!jsonString) {
            reject(new Error(`No JSON output received.\nError trace: ${errorBuffer}`))
            return
          }
          const parsedOutput = JSON.parse(jsonString)
          if (parsedOutput.error && Object.keys(parsedOutput).length === 1) {
            reject(new Error(parsedOutput.error))
          } else {
            resolve(parsedOutput)
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python Output as JSON.\nRaw output: ${dataBuffer}\nError trace: ${errorBuffer}`))
        }
      })

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`))
      })

      // Send the strict JSON input over sys.stdin
      pythonProcess.stdin.write(JSON.stringify(inputData))
      pythonProcess.stdin.end()
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
