import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

const DATA_FILE = path.resolve('server-data.json')

function dataPlugin(): Plugin {
  return {
    name: 'data-api',
    configureServer(server) {
      if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ menu: [], beans: [], runs: [], transactions: [], activeRunId: null, mode: 'operational' }), 'utf-8')
      }

      function migrateData(data: any) {
        if (data?.runs) {
          data.runs = data.runs.map((r: any) => {
            if (!r.weatherLogs && r.weather !== undefined) {
              r.weatherLogs = r.weather ? [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: new Date().toISOString(), ...r.weather }] : []
            }
            if (!r.weatherLogs) r.weatherLogs = []
            if (!r.operatorState) r.operatorState = null
            if (!r.actionPoints) r.actionPoints = null
            if (!r.note) r.note = ''
            delete r.weather
            return r
          })
        }
        return data
      }

      server.middlewares.use('/api/data', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8')
            const data = migrateData(JSON.parse(raw))
            fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          } catch {
            res.statusCode = 500
            res.end('{}')
          }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              fs.writeFileSync(DATA_FILE, body, 'utf-8')
              res.end('ok')
            } catch {
              res.statusCode = 500
              res.end('fail')
            }
          })
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), dataPlugin()],
  base: '/blacklistbrewercommandcenter-/',
  server: {
    port: 3000,
  },
})
