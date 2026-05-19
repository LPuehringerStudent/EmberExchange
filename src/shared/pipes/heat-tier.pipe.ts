import { Pipe, PipeTransform } from '@angular/core';

export type HeatTier = 'inferno' | 'blazing' | 'glowing' | 'smoldering' | 'extinguished';

export function getHeatTier(heatLevel: number): HeatTier {
  if (heatLevel <= 0.07) return 'inferno';
  if (heatLevel <= 0.15) return 'blazing';
  if (heatLevel <= 0.38) return 'glowing';
  if (heatLevel <= 0.45) return 'smoldering';
  return 'extinguished';
}

export function getHeatTierLabel(heatLevel: number): string {
  const tier = getHeatTier(heatLevel);
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

@Pipe({
  name: 'heatTier',
  standalone: true
})
export class HeatTierPipe implements PipeTransform {
  transform(heatLevel: number): string {
    return getHeatTierLabel(heatLevel);
  }
}

@Pipe({
  name: 'heatTierClass',
  standalone: true
})
export class HeatTierClassPipe implements PipeTransform {
  transform(heatLevel: number): string {
    return getHeatTier(heatLevel);
  }
}
