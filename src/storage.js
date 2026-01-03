// src/storage.js - Persistent key and VC storage
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STORAGE_DIR = path.join(__dirname, '../.storage')
const ISSUER_KEY_FILE = path.join(STORAGE_DIR, 'issuer-key.json')
const VCS_DIR = path.join(STORAGE_DIR, 'credentials')

// Ensure storage directories exist
export function initializeStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
  if (!fs.existsSync(VCS_DIR)) {
    fs.mkdirSync(VCS_DIR, { recursive: true })
  }
}

// Save issuer identity
export function saveIssuerKey(issuerData) {
  initializeStorage()
  fs.writeFileSync(ISSUER_KEY_FILE, JSON.stringify(issuerData, null, 2))
}

// Load issuer identity
export function loadIssuerKey() {
  if (fs.existsSync(ISSUER_KEY_FILE)) {
    const data = fs.readFileSync(ISSUER_KEY_FILE, 'utf-8')
    return JSON.parse(data)
  }
  return null
}

// Save verifiable credential
export function saveVC(studentId, vc) {
  initializeStorage()
  const filename = `${studentId}.json`
  const filepath = path.join(VCS_DIR, filename)
  
  const vcData = {
    studentId,
    credential: vc,
    jwt: vc.proof.jwt,
    issuedAt: new Date().toISOString(),
    status: 'active'
  }
  
  fs.writeFileSync(filepath, JSON.stringify(vcData, null, 2))
  return filepath
}

// Load verifiable credential by student ID
export function loadVC(studentId) {
  const filename = `${studentId}.json`
  const filepath = path.join(VCS_DIR, filename)
  
  if (fs.existsSync(filepath)) {
    const data = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(data)
  }
  return null
}

// List all credentials
export function listAllVCs() {
  initializeStorage()
  const files = fs.readdirSync(VCS_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const data = fs.readFileSync(path.join(VCS_DIR, f), 'utf-8')
    return JSON.parse(data)
  })
}

// Update credential status
export function updateVCStatus(studentId, status) {
  const vcData = loadVC(studentId)
  if (vcData) {
    vcData.status = status
    vcData.statusUpdatedAt = new Date().toISOString()
    const filename = `${studentId}.json`
    const filepath = path.join(VCS_DIR, filename)
    fs.writeFileSync(filepath, JSON.stringify(vcData, null, 2))
    return true
  }
  return false
}
