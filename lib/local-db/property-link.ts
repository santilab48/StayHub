import { requestValue, withTransaction } from './connection'
import { validateId } from './schema'

export interface PropertyLink { localPropertyId: string; serverPropertyId: string; accountId: string; linkedAt: string }
export function getPropertyLink(localPropertyId: string): Promise<PropertyLink | undefined> {
  validateId(localPropertyId)
  return withTransaction(['workspaces'], 'readonly', tx => requestValue(tx.objectStore('workspaces').get(`server-property:${localPropertyId}`)))
}
export function savePropertyLink(link: PropertyLink): Promise<void> {
  validateId(link.localPropertyId)
  validateId(link.serverPropertyId)
  validateId(link.accountId)
  return withTransaction(['workspaces'], 'readwrite', async tx => {
    await requestValue(tx.objectStore('workspaces').put(link, `server-property:${link.localPropertyId}`))
  })
}
