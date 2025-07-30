import type { MovementTypes } from "../../domain/value-objects/Speed.js";
import type { WeaponRange } from "../../domain/value-objects/Weapon.js";

import { AbstractActorAdapter } from "../../application/adapters/AbstractActorAdapter.js";
import { Speed } from "../../domain/value-objects/Speed.js";
import { Weapon } from "../../domain/value-objects/Weapon.js";
import { getSetting } from "../../settings.js";
import { SETTINGS } from "../../config.js";

export class DnD5eActorAdapter extends AbstractActorAdapter {
  get id(): string | null {
    return this.actor.id ?? null;
  }

  get name(): string {
    return this.actor.name ?? 'Eldritch';
  }

  get type(): string {
    return this.actor.type;
  }

  get speeds(): ReadonlyArray<Speed> {
    const speeds: Speed[] = [];
    const movement = this.actor.system.attributes.movement;
    const units = movement.units || 'm';

    for (const [type, value] of Object.entries(movement)) {
      if (typeof value !== 'number') {
        continue;
      }

      speeds.push(Speed.create(value, units, type as MovementTypes));
    }

    return speeds;
  }

  fetchEquippedWeapons(): ReadonlyArray<Weapon> {
    const weapons: Weapon[] = [];
    const items = this.actor.items.filter(item => item.type === 'weapon' && item.system.equipped);

    const gridDistance = canvas.scene?.grid.distance;
    const rangeOverride = getSetting<number>(SETTINGS.MELEE_WEAPON_RANGE_OVERRIDE);

    for (const item of items) {
      const range = item.system.range;
      if (range) {
        const weaponRange: WeaponRange = {};
        weaponRange.minimum = 0;

        if (range.reach !== null && range.reach !== undefined) {
          let reach = range.reach;

          if (rangeOverride >= 0 && reach === gridDistance) {
            reach = rangeOverride;
          }

          weaponRange.melee = { min: 0, max: reach };
        }

        if (range.value !== null && range.value !== undefined) {
          weaponRange.effective = { min: 0, max: range.value };
          weaponRange.maximum = range.long ?? range.value;
        }

        if (weaponRange.melee && !weaponRange.effective) {
          weaponRange.effective = weaponRange.melee;
          weaponRange.maximum = weaponRange.melee.max;
        }

        weaponRange.units = range.units;

        weapons.push(new Weapon(
          item.name ?? 'Eldritch Weapon',
          item.img ?? 'icons/svg/sword.svg',
          weaponRange,
          item.system.equipped
        ));
      }
    }

    return weapons;
  }

  get health(): number {
    return this.actor.system.attributes.hp.value;
  }

  get maxHealth(): number {
    return this.actor.system.attributes.hp.max;
  }

  get tempHealth(): number {
    return this.actor.system.attributes.hp.temp;
  }

  get tempMaxHealth(): number {
    return this.actor.system.attributes.hp.tempMax;
  }

  get healthPercentage(): number {
    return this.actor.system.attributes.hp.pct;
  }
}