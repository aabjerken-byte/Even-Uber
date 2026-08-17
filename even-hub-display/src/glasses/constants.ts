/**
 * Geometry and hard limits for the G2 glasses page.
 *
 * The React tree in `src/components` is a *phone-side preview*. It never
 * reaches the glasses. Rendering to the G2 goes through the Even Hub SDK's
 * container model: absolutely positioned text/image/list containers created
 * once, then updated in place. Everything in this folder implements that.
 */

/** Display size per eye, from BUILD_SPEC. */
export const DISPLAY_WIDTH = 576
export const DISPLAY_HEIGHT = 288

/**
 * Limits taken from the SDK's own type declarations, not the README — the
 * README omits the image-object cap.
 *
 *   CreateStartUpPageContainer.containerTotalNum  1~12
 *   textObject                                    max_count 8
 *   imageObject                                   max_count 4
 *   ImageContainerProperty.width                  20~288
 *   ImageContainerProperty.height                 20~144
 */
export const LIMITS = {
  maxContainers: 12,
  minContainers: 1,
  maxTextContainers: 8,
  maxImageContainers: 4,
  image: { minWidth: 20, maxWidth: 288, minHeight: 20, maxHeight: 144 }
} as const

/** Stable container identity. IDs must be unique; names are used on update. */
export const CONTAINERS = {
  driver: { id: 1, name: 'driver' },
  vehicle: { id: 2, name: 'vehicle' },
  plate: { id: 3, name: 'plate' },
  eta: { id: 4, name: 'eta' },
  status: { id: 5, name: 'status' },
  map: { id: 6, name: 'map' }
} as const

export type ContainerKey = keyof typeof CONTAINERS

/** Map image size — kept inside the SDK's 288×144 ceiling. */
export const MAP_WIDTH = 280
export const MAP_HEIGHT = 144
