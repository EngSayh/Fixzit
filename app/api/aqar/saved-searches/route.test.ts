/**
 * Tests for app/api/aqar/saved-searches/route.ts
 * Framework: Jest (TypeScript)
 * If using Vitest, replace jest.fn with vi.fn and adjust import mocks accordingly.
 */

import { NextRequest } from 'next/server'

// Import the route handlers. Adjust the path if your project structure differs.
import * as route from './route'

// Mock path aliases for db and models used by the route handlers.
jest.mock('@/src/db/mongoose', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/src/server/models/AqarSavedSearch', () => {
  const save = jest.fn()
  const mockDoc = function(this: any, data: any) {
    Object.assign(this, data)
    this.save = save
  } as unknown as { new(data: any): any }

  // Static methods to be stubbed in tests
  ;(mockDoc as any).find = jest.fn()
  ;(mockDoc as any).findOne = jest.fn()
  ;(mockDoc as any).findOneAndUpdate = jest.fn()
  return { AqarSavedSearch: mockDoc }
})

const { dbConnect } = jest.requireMock('@/src/db/mongoose')
const { AqarSavedSearch } = jest.requireMock('@/src/server/models/AqarSavedSearch')

/**
 * Utility to create a NextRequest with URL, method, headers and optional JSON body.
 */
function createRequest(method: string, url: string, body?: any, headers: Record<string,string> = {}) {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new NextRequest(new Request(url, init))
}

describe('Saved Searches API route', () => {
  const baseUrl = 'https://example.com/app/api/aqar/saved-searches'
  const defaultHeaders = {
    'x-tenant-id': 'tenant-1',
    'x-user-id': 'user-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns active saved searches sorted by updatedAt desc for given tenant/user', async () => {
      const lean = jest.fn().mockResolvedValue([
        { _id: '1', name: 'S1', isActive: true, updatedAt: new Date('2024-01-02') },
        { _id: '2', name: 'S2', isActive: true, updatedAt: new Date('2024-01-01') },
      ])
      const sort = jest.fn().mockReturnValue({ lean })
      ;(AqarSavedSearch.find as jest.Mock).mockReturnValue({ sort })

      const req = createRequest('GET', `${baseUrl}`, undefined, defaultHeaders)
      const res = await route.GET(req)
      const json = await res.json()

      expect(dbConnect).toHaveBeenCalled()

      expect(AqarSavedSearch.find).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        isActive: true,
      })
      expect(sort).toHaveBeenCalledWith({ updatedAt: -1 })
      expect(json).toEqual({
        success: true,
        data: [
          { _id: '1', name: 'S1', isActive: true, updatedAt: new Date('2024-01-02') },
          { _id: '2', name: 'S2', isActive: true, updatedAt: new Date('2024-01-01') },
        ],
      })
      expect(res.status).toBe(200)
    })

    it('handles errors and returns 500 with message', async () => {
      (AqarSavedSearch.find as jest.Mock).mockImplementation(() => {
        throw new Error('boom')
      })
      const req = createRequest('GET', `${baseUrl}`, undefined, defaultHeaders)
      const res = await route.GET(req)
      const json = await res.json()
      expect(res.status).toBe(500)
      expect(json).toMatchObject({ success: false, error: 'Failed to fetch saved searches' })
    })

    it('uses default tenant/user when headers are missing', async () => {
      const lean = jest.fn().mockResolvedValue([])
      const sort = jest.fn().mockReturnValue({ lean })
      ;(AqarSavedSearch.find as jest.Mock).mockReturnValue({ sort })

      const req = createRequest('GET', `${baseUrl}`)
      await route.GET(req)
      expect(AqarSavedSearch.find).toHaveBeenCalledWith({
        tenantId: 'default',
        userId: 'system',
        isActive: true,
      })
    })
  })

  describe('POST', () => {
    it('creates a saved search when valid and not duplicate', async () => {
      ;(AqarSavedSearch.findOne as jest.Mock).mockResolvedValue(null)

      const save = (AqarSavedSearch as any).prototype.save as jest.Mock
      save.mockResolvedValue(undefined)

      const reqBody = {
        name: 'New Search',
        description: 'Desc',
        criteria: { purpose: 'sale', city: 'Riyadh' },
        notifications: { enabled: true, frequency: 'daily', channels: ['email', 'sms'] },
      }
      const req = createRequest('POST', `${baseUrl}`, reqBody, defaultHeaders)
      const res = await route.POST(req)
      const json = await res.json()

      expect(dbConnect).toHaveBeenCalled()
      expect(AqarSavedSearch.findOne).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'New Search',
      })
      expect(save).toHaveBeenCalled()
      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      // Should echo back created doc (constructor uses provided data)
      expect(json.data).toMatchObject({
        name: 'New Search',
        tenantId: 'tenant-1',
        userId: 'user-1',
        createdBy: 'user-1',
        notifications: { enabled: true, frequency: 'daily', channels: ['email', 'sms'] },
      })
    })

    it('applies default notifications when not provided', async () => {
      ;(AqarSavedSearch.findOne as jest.Mock).mockResolvedValue(null)
      const save = (AqarSavedSearch as any).prototype.save as jest.Mock
      save.mockResolvedValue(undefined)

      const reqBody = {
        name: 'Default Notif',
        criteria: { purpose: 'rent' },
      }
      const req = createRequest('POST', `${baseUrl}`, reqBody, defaultHeaders)
      const res = await route.POST(req)
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.data).toMatchObject({
        notifications: {
          enabled: true,
          frequency: 'daily',
          channels: ['email'],
        },
      })
    })

    it('rejects when duplicate name exists (409)', async () => {
      ;(AqarSavedSearch.findOne as jest.Mock).mockResolvedValue({ _id: 'dup' })
      const reqBody = { name: 'Dup', criteria: {} }
      const req = createRequest('POST', `${baseUrl}`, reqBody, defaultHeaders)
      const res = await route.POST(req)
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json).toEqual({
        success: false,
        error: 'A saved search with this name already exists',
      })
    })

    it('returns 400 for zod validation error', async () => {
      // invalid name: too short
      const reqBody = { name: 'a', criteria: {} }
      const req = createRequest('POST', `${baseUrl}`, reqBody, defaultHeaders)
      const res = await route.POST(req)
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Validation error')
      expect(json.details).toBeDefined()
    })

    it('returns 500 for non-validation errors', async () => {
      ;(AqarSavedSearch.findOne as jest.Mock).mockImplementation(() => { throw new Error('db down') })
      const reqBody = { name: 'Err', criteria: {} }
      const req = createRequest('POST', `${baseUrl}`, reqBody, defaultHeaders)
      const res = await route.POST(req)
      const json = await res.json()
      expect(res.status).toBe(500)
      expect(json).toMatchObject({ success: false, error: 'Failed to create saved search' })
    })

    it('uses default tenant/user when headers missing', async () => {
      ;(AqarSavedSearch.findOne as jest.Mock).mockResolvedValue(null)
      const save = (AqarSavedSearch as any).prototype.save as jest.Mock
      save.mockResolvedValue(undefined)

      const reqBody = { name: 'No headers', criteria: {} }
      const req = createRequest('POST', `${baseUrl}`, reqBody)
      await route.POST(req)
      expect(AqarSavedSearch.findOne).toHaveBeenCalledWith({
        tenantId: 'default',
        userId: 'system',
        name: 'No headers',
      })
    })
  })

  describe('PUT', () => {
    it('updates saved search when id present and returns updated doc', async () => {
      const updated = { _id: '1', name: 'Updated' }
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue(updated)

      const reqBody = { description: 'New Desc' }
      const req = createRequest('PUT', `${baseUrl}?id=1`, reqBody, defaultHeaders)
      const res = await route.PUT(req)
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true, data: updated })
      expect(AqarSavedSearch.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'tenant-1', userId: 'user-1' },
        { description: 'New Desc', updatedBy: 'user-1' },
        { new: true }
      )
    })

    it('returns 400 when id is missing', async () => {
      const req = createRequest('PUT', `${baseUrl}`, { description: 'x' }, defaultHeaders)
      const res = await route.PUT(req)
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json).toEqual({ success: false, error: 'Search ID is required' })
    })

    it('returns 404 when document not found', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue(null)
      const req = createRequest('PUT', `${baseUrl}?id=missing`, { description: 'x' }, defaultHeaders)
      const res = await route.PUT(req)
      const json = await res.json()
      expect(res.status).toBe(404)
      expect(json).toEqual({ success: false, error: 'Saved search not found' })
    })

    it('returns 400 for zod validation error', async () => {
      // invalid field: name too short when using partial schema? partial allows name but still validates min length
      const req = createRequest('PUT', `${baseUrl}?id=1`, { name: 'a' }, defaultHeaders)
      const res = await route.PUT(req)
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error).toBe('Validation error')
      expect(json.details).toBeDefined()
    })

    it('returns 500 for unexpected errors', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockImplementation(() => { throw new Error('db err') })
      const req = createRequest('PUT', `${baseUrl}?id=1`, { description: 'x' }, defaultHeaders)
      const res = await route.PUT(req)
      const json = await res.json()
      expect(res.status).toBe(500)
      expect(json).toMatchObject({ success: false, error: 'Failed to update saved search' })
    })

    it('uses default tenant/user headers when not provided', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: '1' })
      const req = createRequest('PUT', `${baseUrl}?id=1`, { description: 'x' })
      await route.PUT(req)
      expect(AqarSavedSearch.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'default', userId: 'system' },
        { description: 'x', updatedBy: 'system' },
        { new: true }
      )
    })
  })

  describe('DELETE', () => {
    it('soft-deletes saved search by setting isActive=false', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: '1' })
      const req = createRequest('DELETE', `${baseUrl}?id=1`, undefined, defaultHeaders)
      const res = await route.DELETE(req)
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json).toEqual({ success: true, message: 'Saved search deleted successfully' })
      expect(AqarSavedSearch.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'tenant-1', userId: 'user-1' },
        { isActive: false, updatedBy: 'user-1' },
        { new: true }
      )
    })

    it('returns 400 when id missing', async () => {
      const req = createRequest('DELETE', `${baseUrl}`, undefined, defaultHeaders)
      const res = await route.DELETE(req)
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json).toEqual({ success: false, error: 'Search ID is required' })
    })

    it('returns 404 when document not found', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue(null)
      const req = createRequest('DELETE', `${baseUrl}?id=missing`, undefined, defaultHeaders)
      const res = await route.DELETE(req)
      const json = await res.json()
      expect(res.status).toBe(404)
      expect(json).toEqual({ success: false, error: 'Saved search not found' })
    })

    it('returns 500 when delete fails unexpectedly', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockImplementation(() => { throw new Error('oops') })
      const req = createRequest('DELETE', `${baseUrl}?id=1`, undefined, defaultHeaders)
      const res = await route.DELETE(req)
      const json = await res.json()
      expect(res.status).toBe(500)
      expect(json).toMatchObject({ success: false, error: 'Failed to delete saved search' })
    })

    it('uses default tenant/user when headers missing', async () => {
      ;(AqarSavedSearch.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: '1' })
      const req = createRequest('DELETE', `${baseUrl}?id=1`)
      await route.DELETE(req)
      expect(AqarSavedSearch.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'default', userId: 'system' },
        { isActive: false, updatedBy: 'system' },
        { new: true }
      )
    })
  })
})