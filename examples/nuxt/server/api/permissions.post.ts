import { permissionsFor } from '@vue-warden/example-shared/permissions'

export default defineEventHandler(async (event) => {
  const { pageKey } = await readBody<{ pageKey: string }>(event)
  const role = getRequestHeader(event, 'x-role') ?? 'viewer'
  return permissionsFor(role, pageKey)
})
