/**
 * Fetcher used by every example: POSTs the page key to the mock backend.
 * The active role travels in the `x-role` header.
 */
export async function fetchPermissions(
  key: string,
  { signal }: { signal: AbortSignal }
): Promise<unknown> {
  const response = await fetch('/api/permissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-role': localStorage.getItem('role') ?? 'admin'
    },
    body: JSON.stringify({ pageKey: key }),
    signal
  })
  if (!response.ok)
    throw new Error(`Permissions request failed: ${response.status}`)
  return response.json()
}
