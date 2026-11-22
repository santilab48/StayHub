import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parse } = require('pg-connection-string')
const source = readFileSync(new URL('../lib/db/postgres.ts', import.meta.url), 'utf8')
assert.match(source, /url\.searchParams\.set\('sslmode', 'verify-full'\)/)
assert.match(source, /url\.hostname\.endsWith\('\.neon\.tech'\)/)

// Regression: a previously disabled TLS setting must be overridden before pg
// parses the URL. No real credentials or network connection are used here.
const url = new URL('postgresql://test:placeholder@ep-example.neon.tech/neondb?sslmode=disable')
url.searchParams.set('sslmode', 'verify-full')
const config = parse(url.toString())
assert.notEqual(config.ssl, false)
assert.notEqual(config.ssl?.rejectUnauthorized, false)
assert.equal(config.sslmode, 'verify-full')
console.log('P2.8-C/D Neon TLS transport regression: PASS')
