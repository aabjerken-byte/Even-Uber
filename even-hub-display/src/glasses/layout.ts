import {
  CONTAINERS,
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH,
  LIMITS,
  MAP_HEIGHT,
  MAP_WIDTH
} from './constants'

/**
 * Container definitions, kept free of any SDK imports so they can be validated
 * and unit tested without a bridge (or a browser).
 */
export interface TextSpec {
  containerID: number
  containerName: string
  xPosition: number
  yPosition: number
  width: number
  height: number
  zOrderIndex: number
  isEventCapture: number
  content: string
}

export interface ImageSpec {
  containerID: number
  containerName: string
  xPosition: number
  yPosition: number
  width: number
  height: number
  zOrderIndex: number
}

export interface PageLayout {
  containerTotalNum: number
  textObject: TextSpec[]
  imageObject: ImageSpec[]
}

/**
 * The Even Uber glasses page.
 *
 * Left column carries the ride facts, right column the map. Laid out for the
 * 576×288 panel with the map inside the SDK's 288×144 image ceiling.
 *
 * `content` here is only the initial value — `GlassesRenderer` pushes real
 * values with `textContainerUpgrade` once the page exists.
 */
export function buildPageLayout(): PageLayout {
  const pad = 10
  const columnWidth = DISPLAY_WIDTH - MAP_WIDTH - pad * 3

  const textObject: TextSpec[] = [
    {
      ...CONTAINERS.driver,
      containerID: CONTAINERS.driver.id,
      containerName: CONTAINERS.driver.name,
      xPosition: pad,
      yPosition: pad,
      width: columnWidth,
      height: 34,
      zOrderIndex: 1,
      // Exactly one container must capture events, per the SDK rules.
      isEventCapture: 1,
      content: ''
    },
    {
      containerID: CONTAINERS.vehicle.id,
      containerName: CONTAINERS.vehicle.name,
      xPosition: pad,
      yPosition: 50,
      width: columnWidth,
      height: 28,
      zOrderIndex: 2,
      isEventCapture: 0,
      content: ''
    },
    {
      containerID: CONTAINERS.plate.id,
      containerName: CONTAINERS.plate.name,
      xPosition: pad,
      yPosition: 82,
      width: columnWidth,
      height: 28,
      zOrderIndex: 3,
      isEventCapture: 0,
      content: ''
    },
    {
      containerID: CONTAINERS.eta.id,
      containerName: CONTAINERS.eta.name,
      xPosition: pad,
      yPosition: 124,
      width: columnWidth,
      height: 48,
      zOrderIndex: 4,
      isEventCapture: 0,
      content: ''
    },
    {
      containerID: CONTAINERS.status.id,
      containerName: CONTAINERS.status.name,
      xPosition: pad,
      yPosition: 178,
      width: columnWidth,
      height: 28,
      zOrderIndex: 5,
      isEventCapture: 0,
      content: ''
    }
  ]

  const imageObject: ImageSpec[] = [
    {
      containerID: CONTAINERS.map.id,
      containerName: CONTAINERS.map.name,
      xPosition: DISPLAY_WIDTH - MAP_WIDTH - pad,
      yPosition: DISPLAY_HEIGHT - MAP_HEIGHT - pad,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      zOrderIndex: 6
    }
  ]

  return {
    containerTotalNum: textObject.length + imageObject.length,
    textObject,
    imageObject
  }
}

/**
 * Check a layout against the SDK's constraints before we hand it over.
 *
 * The SDK rejects an invalid page with a bare `StartUpPageCreateResult.invalid`,
 * which tells you nothing about what was wrong. Failing here instead gives an
 * actionable message, and lets the rules be unit tested without a device.
 */
export function validateLayout(layout: PageLayout): string[] {
  const errors: string[] = []
  const { textObject, imageObject, containerTotalNum } = layout
  const total = textObject.length + imageObject.length

  if (containerTotalNum !== total) {
    errors.push(`containerTotalNum ${containerTotalNum} does not match ${total} containers`)
  }
  if (total < LIMITS.minContainers || total > LIMITS.maxContainers) {
    errors.push(`container count ${total} outside 1..${LIMITS.maxContainers}`)
  }
  if (textObject.length > LIMITS.maxTextContainers) {
    errors.push(`${textObject.length} text containers exceeds max ${LIMITS.maxTextContainers}`)
  }
  if (imageObject.length > LIMITS.maxImageContainers) {
    errors.push(`${imageObject.length} image containers exceeds max ${LIMITS.maxImageContainers}`)
  }

  const captures = textObject.filter((t) => t.isEventCapture === 1).length
  if (captures !== 1) {
    errors.push(`exactly one container must set isEventCapture=1 (found ${captures})`)
  }

  const ids = [...textObject, ...imageObject].map((c) => c.containerID)
  if (new Set(ids).size !== ids.length) {
    errors.push('containerID values must be unique')
  }

  // zOrderIndex is all-or-none, and unique when present.
  const zs = [...textObject, ...imageObject].map((c) => c.zOrderIndex)
  const withZ = zs.filter((z) => z !== undefined)
  if (withZ.length !== 0 && withZ.length !== zs.length) {
    errors.push('zOrderIndex must be set on every container or none')
  }
  if (new Set(withZ).size !== withZ.length) {
    errors.push('zOrderIndex values must be unique')
  }

  for (const image of imageObject) {
    const { minWidth, maxWidth, minHeight, maxHeight } = LIMITS.image
    if (image.width < minWidth || image.width > maxWidth) {
      errors.push(`image "${image.containerName}" width ${image.width} outside ${minWidth}..${maxWidth}`)
    }
    if (image.height < minHeight || image.height > maxHeight) {
      errors.push(`image "${image.containerName}" height ${image.height} outside ${minHeight}..${maxHeight}`)
    }
  }

  for (const c of [...textObject, ...imageObject]) {
    if (c.xPosition < 0 || c.yPosition < 0) {
      errors.push(`container "${c.containerName}" has a negative position`)
    }
    if (c.xPosition + c.width > DISPLAY_WIDTH || c.yPosition + c.height > DISPLAY_HEIGHT) {
      errors.push(
        `container "${c.containerName}" extends past the ${DISPLAY_WIDTH}×${DISPLAY_HEIGHT} panel`
      )
    }
  }

  return errors
}
