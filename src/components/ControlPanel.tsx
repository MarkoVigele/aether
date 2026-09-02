import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { randomForceMatrix, resizeEatMatrix, resizeMatrix } from '@/simulation/settings'
import { paletteList } from '@/simulation/palettes'
import type {
  BoundaryMode,
  GravityMode,
  MouseMode,
  PaletteId,
  QualityLevel,
  SimSettings,
} from '@/simulation/types'
import { useState, type ReactNode } from 'react'
import { useIsNarrow } from '@/lib/media'
import { EatMatrix, ForceMatrix, speciesColors } from './ForceMatrix'
import { DisplayFpsField } from './DisplayFpsField'
import { Section } from './Section'
import { SliderRow } from './SliderRow'
import { ToggleRow } from './ToggleRow'

type ControlPanelProps = {
  settings: SimSettings
  onChange: (settings: SimSettings) => void
  onRandomForces: () => void
  exclusive?: boolean
  exclusiveOpen?: string | null
  onExclusiveOpen?: (id: string | null) => void
}

function patch(settings: SimSettings, partial: Partial<SimSettings>): SimSettings {
  return { ...settings, ...partial }
}

export function ControlPanel({
  settings,
  onChange,
  onRandomForces,
  exclusive,
  exclusiveOpen,
  onExclusiveOpen,
}: ControlPanelProps) {
  const colors = speciesColors(settings.palette, settings.speciesCount)
  const narrow = useIsNarrow()
  const oneOpen = exclusive ?? narrow
  const [openId, setOpenId] = useState<string | null>('world')
  const set = (partial: Partial<SimSettings>) => onChange(patch(settings, partial))
  const activeId = oneOpen ? (exclusiveOpen ?? openId) : openId

  const setSection = (id: string | null) => {
    setOpenId(id)
    onExclusiveOpen?.(id)
  }

  const sectionProps = (id: string, desktopDefault = false) =>
    oneOpen
      ? {
          open: activeId === id,
          onOpenChange: (next: boolean) => setSection(next ? id : null),
        }
      : { defaultOpen: desktopDefault }

  return (
    <div className="grid gap-1">
      <Section title="World" {...sectionProps('world', true)}>
        <SliderRow
          label="Population cap"
          value={settings.particleCount}
          min={40}
          max={2400}
          step={10}
          format={(v) => String(Math.round(v))}
          onChange={(particleCount) => set({ particleCount })}
        />
        <SliderRow
          label="Species"
          value={settings.speciesCount}
          min={2}
          max={8}
          step={1}
          format={(v) => String(Math.round(v))}
          onChange={(raw) => {
            const speciesCount = Math.round(raw)
            set({
              speciesCount,
              forceMatrix: resizeMatrix(settings.forceMatrix, speciesCount),
              eatMatrix: resizeEatMatrix(settings.eatMatrix, speciesCount),
            })
          }}
        />
        <SliderRow
          label="Time scale"
          value={settings.timeScale}
          min={0.15}
          max={2.4}
          step={0.05}
          onChange={(timeScale) => set({ timeScale })}
        />
      </Section>

      <Section title="Physics" {...sectionProps('physics')}>
        <SliderRow
          label="Friction"
          value={settings.friction}
          min={0}
          max={1}
          onChange={(friction) => set({ friction })}
        />
        <SliderRow
          label="Max speed"
          value={settings.maxSpeed}
          min={40}
          max={480}
          step={5}
          format={(v) => String(Math.round(v))}
          onChange={(maxSpeed) => set({ maxSpeed })}
        />
        <SliderRow
          label="Force radius"
          value={settings.forceRadius}
          min={20}
          max={220}
          step={1}
          format={(v) => String(Math.round(v))}
          onChange={(forceRadius) => set({ forceRadius })}
        />
        <SliderRow
          label="Force strength"
          value={settings.forceStrength}
          min={0}
          max={900}
          step={5}
          format={(v) => String(Math.round(v))}
          onChange={(forceStrength) => set({ forceStrength })}
        />
        <SliderRow
          label="Close repulsion"
          value={settings.repulsion}
          min={0}
          max={1600}
          step={10}
          format={(v) => String(Math.round(v))}
          onChange={(repulsion) => set({ repulsion })}
        />
        <SliderRow
          label="Collisions"
          value={settings.collision}
          min={0}
          max={1}
          onChange={(collision) => set({ collision })}
        />
        <SliderRow
          label="Restitution"
          value={settings.restitution}
          min={0}
          max={1}
          onChange={(restitution) => set({ restitution })}
        />
        <SliderRow
          label="Temperature"
          value={settings.temperature}
          min={0}
          max={60}
          step={0.5}
          onChange={(temperature) => set({ temperature })}
        />
        <SliderRow
          label="Viscosity"
          value={settings.viscosity}
          min={0}
          max={0.4}
          step={0.01}
          onChange={(viscosity) => set({ viscosity })}
        />
        <SliderRow
          label="Gravity"
          value={settings.gravity}
          min={0}
          max={80}
          step={1}
          format={(v) => String(Math.round(v))}
          onChange={(gravity) => set({ gravity })}
        />
        <Field label="Gravity field">
          <Select
            value={settings.gravityMode}
            onValueChange={(gravityMode) => set({ gravityMode: gravityMode as GravityMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="down">Down</SelectItem>
              <SelectItem value="center">Toward center</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Boundary">
          <Select
            value={settings.boundary}
            onValueChange={(boundary) => set({ boundary: boundary as BoundaryMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wrap">Wrap</SelectItem>
              <SelectItem value="bounce">Bounce</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <SliderRow
          label="Bounce damping"
          value={settings.bounceDamping}
          min={0.1}
          max={1}
          onChange={(bounceDamping) => set({ bounceDamping })}
        />
      </Section>

      <Section title="Forces" {...sectionProps('forces', true)}>
        <ForceMatrix
          matrix={settings.forceMatrix}
          colors={colors}
          onChange={(forceMatrix) => set({ forceMatrix })}
        />
        <Button type="button" variant="secondary" size="sm" onClick={onRandomForces}>
          Shuffle forces
        </Button>
      </Section>

      <Section title="Life" {...sectionProps('life')}>
        <ToggleRow
          label="Living agents"
          checked={settings.lifeEnabled}
          onChange={(lifeEnabled) => set({ lifeEnabled })}
        />
        <ToggleRow
          label="Eating"
          checked={settings.eatEnabled}
          onChange={(eatEnabled) => set({ eatEnabled })}
        />
        <ToggleRow
          label="Reproduction"
          checked={settings.reproduceEnabled}
          onChange={(reproduceEnabled) => set({ reproduceEnabled })}
        />
        <SliderRow
          label="Metabolism"
          value={settings.energyDecay}
          min={0}
          max={0.6}
          step={0.01}
          onChange={(energyDecay) => set({ energyDecay })}
        />
        <SliderRow
          label="Photosynthesis"
          value={settings.photosynthesis}
          min={0}
          max={0.8}
          step={0.01}
          onChange={(photosynthesis) => set({ photosynthesis })}
        />
        <SliderRow
          label="Bite radius"
          value={settings.eatRadius}
          min={4}
          max={28}
          step={0.5}
          onChange={(eatRadius) => set({ eatRadius })}
        />
        <SliderRow
          label="Bite rate"
          value={settings.eatRate}
          min={0}
          max={2}
          step={0.02}
          onChange={(eatRate) => set({ eatRate })}
        />
        <SliderRow
          label="Digest efficiency"
          value={settings.eatEfficiency}
          min={0.1}
          max={1.2}
          step={0.02}
          onChange={(eatEfficiency) => set({ eatEfficiency })}
        />
        <SliderRow
          label="Split energy"
          value={settings.reproduceEnergy}
          min={0.8}
          max={2.8}
          step={0.05}
          onChange={(reproduceEnergy) => set({ reproduceEnergy })}
        />
        <SliderRow
          label="Mutation"
          value={settings.mutationRate}
          min={0}
          max={0.8}
          step={0.01}
          onChange={(mutationRate) => set({ mutationRate })}
        />
        <SliderRow
          label="Max age"
          value={settings.maxAge}
          min={6}
          max={120}
          step={1}
          format={(v) => `${Math.round(v)}s`}
          onChange={(maxAge) => set({ maxAge })}
        />
        <SliderRow
          label="Abiogenesis"
          value={settings.abiogenesis}
          min={0}
          max={1}
          step={0.01}
          onChange={(abiogenesis) => set({ abiogenesis })}
        />
        <EatMatrix
          matrix={settings.eatMatrix}
          colors={colors}
          onChange={(eatMatrix) => set({ eatMatrix })}
        />
      </Section>

      <Section title="Agent mind" {...sectionProps('mind')}>
        <ToggleRow
          label="Steering AI"
          checked={settings.aiEnabled}
          onChange={(aiEnabled) => set({ aiEnabled })}
        />
        <SliderRow
          label="AI strength"
          value={settings.aiStrength}
          min={0}
          max={1.8}
          step={0.02}
          onChange={(aiStrength) => set({ aiStrength })}
        />
        <SliderRow
          label="Perception"
          value={settings.perception}
          min={16}
          max={180}
          step={1}
          format={(v) => String(Math.round(v))}
          onChange={(perception) => set({ perception })}
        />
        <SliderRow
          label="Separation"
          value={settings.separation}
          min={0}
          max={1.6}
          step={0.02}
          onChange={(separation) => set({ separation })}
        />
        <SliderRow
          label="Alignment"
          value={settings.alignment}
          min={0}
          max={1.6}
          step={0.02}
          onChange={(alignment) => set({ alignment })}
        />
        <SliderRow
          label="Cohesion"
          value={settings.cohesion}
          min={0}
          max={1.6}
          step={0.02}
          onChange={(cohesion) => set({ cohesion })}
        />
        <SliderRow
          label="Seek prey"
          value={settings.seek}
          min={0}
          max={1.8}
          step={0.02}
          onChange={(seek) => set({ seek })}
        />
        <SliderRow
          label="Flee predators"
          value={settings.flee}
          min={0}
          max={1.8}
          step={0.02}
          onChange={(flee) => set({ flee })}
        />
        <SliderRow
          label="Wander"
          value={settings.wander}
          min={0}
          max={1.4}
          step={0.02}
          onChange={(wander) => set({ wander })}
        />
      </Section>

      <Section title="Look" {...sectionProps('look')}>
        <DisplayFpsField
          value={settings.displayFps}
          onChange={(displayFps) => set({ displayFps })}
        />
        <Field label="Quality">
          <Select
            value={settings.quality}
            onValueChange={(quality) => set({ quality: quality as QualityLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="beautiful">Beautiful</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Palette">
          <Select
            value={settings.palette}
            onValueChange={(palette) => set({ palette: palette as PaletteId })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paletteList().map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <SliderRow
          label="Trails"
          value={settings.trail}
          min={0}
          max={0.97}
          step={0.01}
          onChange={(trail) => set({ trail })}
        />
        <SliderRow
          label="Glow"
          value={settings.glow}
          min={0.4}
          max={2.2}
          step={0.02}
          onChange={(glow) => set({ glow })}
        />
        <SliderRow
          label="Particle size"
          value={settings.particleSize}
          min={1.2}
          max={8}
          step={0.1}
          onChange={(particleSize) => set({ particleSize })}
        />
        <SliderRow
          label="Link distance"
          value={settings.linkDistance}
          min={8}
          max={80}
          step={1}
          format={(v) => String(Math.round(v))}
          onChange={(linkDistance) => set({ linkDistance })}
        />
        <ToggleRow
          label="Size by energy"
          checked={settings.sizeByEnergy}
          onChange={(sizeByEnergy) => set({ sizeByEnergy })}
        />
        <ToggleRow
          label="Constellation links"
          checked={settings.showLinks}
          onChange={(showLinks) => set({ showLinks })}
        />
        <ToggleRow
          label="Energy arcs"
          checked={settings.showEnergy}
          onChange={(showEnergy) => set({ showEnergy })}
        />
      </Section>

      <Section title="Pointer" {...sectionProps('pointer')}>
        <Field label="Drag action">
          <Select
            value={settings.mouseMode}
            onValueChange={(mouseMode) => set({ mouseMode: mouseMode as MouseMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attract">Attract</SelectItem>
              <SelectItem value="repel">Repel</SelectItem>
              <SelectItem value="spawn">Spawn</SelectItem>
              <SelectItem value="off">Off</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <SliderRow
          label="Pointer radius"
          value={settings.mouseRadius}
          min={30}
          max={280}
          step={2}
          format={(v) => String(Math.round(v))}
          onChange={(mouseRadius) => set({ mouseRadius })}
        />
        <SliderRow
          label="Pointer strength"
          value={settings.mouseStrength}
          min={40}
          max={1200}
          step={10}
          format={(v) => String(Math.round(v))}
          onChange={(mouseStrength) => set({ mouseStrength })}
        />
      </Section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function makeRandomForces(settings: SimSettings): SimSettings {
  return {
    ...settings,
    forceMatrix: randomForceMatrix(settings.speciesCount, (Math.random() * 1e9) | 0),
  }
}
