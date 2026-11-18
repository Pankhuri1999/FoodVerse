import { createComponent, Types } from '@iwsdk/core';

export const KitchenStation = createComponent('KitchenStation', {
  role: { type: Types.String, default: 'counter' },
});

export const QuantumMixer = createComponent('QuantumMixer', {
  armed: { type: Types.Boolean, default: false },
  cooking: { type: Types.Boolean, default: false },
  count: { type: Types.Int8, default: 0 },
  temperature: { type: Types.String, default: 'neutral' },
  stir: { type: Types.Float32, default: 0 },
  stirring: { type: Types.Boolean, default: false },
  phase: { type: Types.String, default: 'idle' },
  transformT: { type: Types.Float32, default: 0 },
  pendingRecipe: { type: Types.String, default: '' },
});

export const HeatControl = createComponent('HeatControl', {
  active: { type: Types.Boolean, default: false },
});

export const CoolControl = createComponent('CoolControl', {
  active: { type: Types.Boolean, default: false },
});

export const StirWell = createComponent('StirWell', {
  armed: { type: Types.Boolean, default: false },
});

export const IngredientStation = createComponent('IngredientStation', {
  slot: { type: Types.Int8, default: 0 },
});

export const CookieKingdom = createComponent('CookieKingdom', {
  restored: { type: Types.Int8, default: 0 },
  ice: { type: Types.Boolean, default: false },
  grove: { type: Types.Boolean, default: false },
  water: { type: Types.Boolean, default: false },
  feast: { type: Types.Boolean, default: false },
  wafer: { type: Types.Boolean, default: false },
  cocoa: { type: Types.Boolean, default: false },
  foliage: { type: Types.Boolean, default: false },
});

export const GravityCore = createComponent('GravityCore', {
  mode: { type: Types.String, default: 'normal' },
  eventMode: { type: Types.String, default: 'zero-g' },
  eventT: { type: Types.Float32, default: 0 },
  fired: { type: Types.Boolean, default: false },
  reversed: { type: Types.Boolean, default: false },
  stabilizer: { type: Types.Boolean, default: false },
  stabilizeT: { type: Types.Float32, default: 0 },
  gx: { type: Types.Float32, default: 0 },
  gy: { type: Types.Float32, default: 0 },
  gz: { type: Types.Float32, default: 0 },
  incoming: { type: Types.Boolean, default: false },
  hit: { type: Types.Boolean, default: false },
  impactSide: { type: Types.String, default: '' },
  nextImpactT: { type: Types.Float32, default: 7 },
});

export const StabilizerControl = createComponent('StabilizerControl', {
  active: { type: Types.Boolean, default: false },
});

export const BuildPiece = createComponent('BuildPiece', {
  kind: { type: Types.String, default: 'cookie' },
  placed: { type: Types.Boolean, default: false },
});

export const MissionHud = createComponent('MissionHud', {
  visible: { type: Types.Boolean, default: true },
});

export const ComfortSettings = createComponent('ComfortSettings', {
  pinchEase: { type: Types.Float32, default: 0.5 },
  grabReach: { type: Types.Float32, default: 0.08 },
  volume: { type: Types.Float32, default: 0.7 },
  reducedMotion: { type: Types.Boolean, default: false },
  paused: { type: Types.Boolean, default: false },
  tutorialStep: { type: Types.Int8, default: -1 },
  tutorialSeen: { type: Types.Boolean, default: false },
});

export const Mission = createComponent('Mission', {
  stage: { type: Types.String, default: 'collect-ember' },
  index: { type: Types.Int8, default: 1 },
  allowedRecipe: { type: Types.String, default: 'ember-spark' },
  target: { type: Types.String, default: '' },
  notice: { type: Types.String, default: '' },
  noticeT: { type: Types.Float32, default: 0 },
  restored: { type: Types.Boolean, default: false },
});

export const Ingredient = createComponent('Ingredient', {
  id: { type: Types.String, default: '' },
  label: { type: Types.String, default: 'Ingredient' },
  inMixer: { type: Types.Boolean, default: false },
  heated: { type: Types.Boolean, default: false },
  consumed: { type: Types.Boolean, default: false },
  lockout: { type: Types.Float32, default: 0 },
  loose: { type: Types.Boolean, default: false },
  driftX: { type: Types.Float32, default: 0 },
  driftY: { type: Types.Float32, default: 0 },
  driftZ: { type: Types.Float32, default: 0 },
});

export const Creature = createComponent('Creature', {
  id: { type: Types.String, default: '' },
  recipeId: { type: Types.String, default: '' },
  hatched: { type: Types.Boolean, default: false },
  delivered: { type: Types.Boolean, default: false },
  spiral: { type: Types.Boolean, default: false },
});
