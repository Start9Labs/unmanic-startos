import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

const variant = process.env.VARIANT || 'generic'

const unmanicVersion = '0.4.1'

export const manifest = setupManifest({
  id: 'unmanic',
  title: 'Unmanic',
  license: 'GPL-3.0',
  packageRepo: 'https://github.com/Start9Labs/unmanic-startos',
  upstreamRepo: 'https://github.com/Unmanic/unmanic',
  marketingUrl: 'https://docs.unmanic.app',
  donationUrl: null,
  description: { short, long },
  volumes: ['startos', 'main', 'cache'],
  images: {
    unmanic: {
      source: { dockerTag: `josh5/unmanic:${unmanicVersion}` },
      arch: ['x86_64', 'aarch64'],
      nvidiaContainer: variant === 'nvidia',
    },
  },
  // Uniform across variants: the registry rejects a variant whose metadata differs.
  hardwareAcceleration: true,
  hardwareRequirements: {
    device:
      variant === 'nvidia'
        ? [
            {
              class: 'display',
              product: null,
              vendor: null,
              driver: 'nvidia',
              description: 'An NVIDIA GPU',
            },
          ]
        : [],
  },
})
