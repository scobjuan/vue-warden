import type { IPackageConfig } from './types/config'

let globalConfig: IPackageConfig | null = null

export function init(config: IPackageConfig): void {
  if (globalConfig) throw new Error('Package already initialized')

  globalConfig = config
}

export function getConfig() {
  if (!globalConfig)
    throw new Error('Package not initialized. Call init() first')

  return globalConfig
}
