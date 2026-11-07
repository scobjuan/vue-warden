# Testing your app

Create a Warden with a fake fetcher and load the page you need.

```ts
import { mount } from '@vue/test-utils'
import { createWarden } from 'vue-warden'

async function wardenFor(page: unknown) {
  const warden = createWarden({ fetchPermissions: () => Promise.resolve(page) })
  await warden.store.load('users') // fetch + normalize
  warden.store.current.value = 'users' // mark it as the current page
  return warden
}

it('hides the password field', async () => {
  const warden = await wardenFor({
    key: 'users',
    can_access: true,
    components: [
      {
        key: 'new-user',
        can_access: true,
        inputs: [{ key: 'password', can_view: false, can_edit: false }]
      }
    ]
  })

  const wrapper = mount(NewUserForm, { global: { plugins: [warden] } })
  expect(wrapper.find('[data-testid=password]').element.style.display).toBe(
    'none'
  )
})
```

Tips:

- With Vitest, alias `vue` to `vue/dist/vue.esm-bundler.js` if you mount
  components that use string templates.
- Use `onMissing: 'allow'` to render everything without describing every key.
- For end-to-end tests, mock the permissions endpoint with your test runner
  (for example Playwright `page.route`). The repository's own
  [e2e suite](../e2e) shows backend failures, slow responses and revocation.
