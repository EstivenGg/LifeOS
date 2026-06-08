import { spawn } from 'node:child_process'
import process from 'node:process'

const host = '127.0.0.1'
const port = '4173'
const baseUrl = `http://${host}:${port}`

const servidor = spawn(process.execPath, [
  './node_modules/vite/bin/vite.js',
  'preview',
  '--configLoader',
  'runner',
  '--host',
  host,
  '--port',
  port,
], {
  stdio: 'inherit',
})

try {
  await esperarServidor(baseUrl)

  const pruebas = spawn(process.execPath, [
    './node_modules/@playwright/test/cli.js',
    'test',
  ], {
    stdio: 'inherit',
  })

  const codigo = await esperarSalida(pruebas)
  process.exitCode = codigo
} finally {
  servidor.kill('SIGTERM')
  await Promise.race([
    esperarSalida(servidor),
    esperar(3_000).then(() => servidor.kill('SIGKILL')),
  ])
}

async function esperarServidor(url) {
  const limite = Date.now() + 30_000

  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(url)
      if (respuesta.ok) return
    } catch {
      // El servidor todavía está iniciando.
    }

    await esperar(250)
  }

  throw new Error(`El servidor E2E no respondió en ${url}`)
}

function esperarSalida(proceso) {
  return new Promise(resolve => {
    proceso.once('exit', codigo => resolve(codigo ?? 1))
  })
}

function esperar(milisegundos) {
  return new Promise(resolve => setTimeout(resolve, milisegundos))
}
