import { createWarden } from 'vue-warden'

// One instance per request: createWarden keeps its state inside the instance,
// so concurrent SSR requests never share permissions.
export default defineNuxtPlugin((nuxtApp) => {
  const role = useCookie('role', { default: () => 'admin' })
  const requestFetch = useRequestFetch()

  const warden = createWarden({
    forbiddenRoute: 'forbidden',
    protect: 'marked',
    fetchPermissions: (key) =>
      requestFetch('/api/permissions', {
        method: 'POST',
        headers: { 'x-role': role.value },
        body: { pageKey: key }
      })
  })

  nuxtApp.vueApp.use(warden)
  warden.attachRouter(nuxtApp.$router as never)
})
