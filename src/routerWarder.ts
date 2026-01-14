import { getConfig } from './config'
import { setPermissions } from './stores/permissions.store'

import type { IPermissionPage as IPermissions } from './types/permission_store'
import type {
  Router,
  NavigationGuardNext,
  RouteLocationNormalized
} from 'vue-router'

export function routerWarder(router: Router): any /* RouterLike */ {
  const config = getConfig()

  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      from

      const permissionResponse: Readonly<IPermissions | null | undefined> =
        await config.axiosInstance({
          method: config.permissionApiMethod,
          url: config.permissionsApiUrl,
          data: {
            pageKey: to.name
          }
        })

      setPermissions(permissionResponse)

      if (
        !permissionResponse?.can_access &&
        to.name !== config.forbiddenNameRoute
      )
        next({ name: config.forbiddenNameRoute })

      next()
    }
  )
}
