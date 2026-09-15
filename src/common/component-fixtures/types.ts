import type React from 'react'

import type { AppSxProps } from '#/common/style/theme'

export type ComponentFixtureStateId = string

export type ComponentFixtureStateMetadata = {
  id: ComponentFixtureStateId
  label: string
  locale?: string
  description?: string
  waitFor?: string
  maskSelectors?: string[]
}

export type ComponentFixtureMetadata = {
  id: string
  label: string
  locale?: string
  description?: string
  waitFor?: string
  maskSelectors?: string[]
  sourceGlobs: string[]
  states: ComponentFixtureStateMetadata[]
}

export type ComponentFixtureWrapper = React.ComponentType<{
  children: React.ReactNode
}>

export type ComponentFixtureState = ComponentFixtureStateMetadata & {
  canvasSx?: AppSxProps
  wrapper?: ComponentFixtureWrapper
  render: () => React.ReactNode
}

export type ComponentFixture = Omit<ComponentFixtureMetadata, 'states'> & {
  canvasSx?: AppSxProps
  wrapper?: ComponentFixtureWrapper
  states: ComponentFixtureState[]
}

export type ComponentFixtureStateLookup = {
  fixture: ComponentFixture
  state: ComponentFixtureState
}
