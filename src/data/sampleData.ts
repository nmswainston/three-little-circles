import { Park, Land, Location } from '../types/models';

export const parks: Park[] = [
  { id: 'park1', name: 'Magic Kingdom' },
  { id: 'park2', name: 'Epcot' },
];

export const lands: Land[] = [
  { id: 'land1', parkId: 'park1', name: 'Adventureland' },
  { id: 'land2', parkId: 'park1', name: 'Fantasyland' },
  { id: 'land3', parkId: 'park2', name: 'World Showcase' },
  { id: 'land4', parkId: 'park2', name: 'Future World' },
];

export const locations: Location[] = [
  {
    id: 'loc1',
    parkId: 'park1',
    landId: 'land1',
    title: 'The Tree of Life',
    hint: 'Look for the ancient guardian',
    story: 'An ancient tree stands as a silent witness to countless adventures. The magic hides in plain sight among its roots. (Approximate coordinates)',
    difficulty: 2,
    latitude: 28.4177,
    longitude: -81.5812,
  },
  {
    id: 'loc2',
    parkId: 'park1',
    landId: 'land1',
    title: 'The Hidden Oasis',
    hint: 'Where water meets mystery',
    story: 'A quiet corner where water flows gently. The sound of adventure whispers in the breeze. (Approximate coordinates)',
    difficulty: 3,
    latitude: 28.4185,
    longitude: -81.5820,
  },
  {
    id: 'loc3',
    parkId: 'park1',
    landId: 'land2',
    title: 'The Enchanted Garden',
    hint: 'Where dreams take root',
    story: 'A magical garden where stories come to life. Every corner holds a secret waiting to be discovered. (Approximate coordinates)',
    difficulty: 1,
    latitude: 28.4190,
    longitude: -81.5830,
  },
  {
    id: 'loc4',
    parkId: 'park2',
    landId: 'land3',
    title: 'The Globe Fountain',
    hint: 'Around the world in one view',
    story: 'A fountain that celebrates the world we share. Look closely and find the hidden details. (Approximate coordinates)',
    difficulty: 2,
    latitude: 28.3747,
    longitude: -81.5494,
  },
  {
    id: 'loc5',
    parkId: 'park2',
    landId: 'land3',
    title: 'The Hidden Passage',
    hint: 'Between worlds, a secret path',
    story: 'A narrow passage that connects different realms. The magic is in the journey, not just the destination. (Approximate coordinates)',
    difficulty: 4,
    latitude: 28.3755,
    longitude: -81.5500,
  },
  {
    id: 'loc6',
    parkId: 'park2',
    landId: 'land4',
    title: 'The Future Portal',
    hint: 'Where tomorrow begins',
    story: 'A gateway to possibilities. The future is built on the magic of imagination. (Approximate coordinates)',
    difficulty: 3,
    latitude: 28.3760,
    longitude: -81.5510,
  },
];
