export interface Park {
  id: string;
  name: string;
}

export interface Land {
  id: string;
  parkId: string;
  name: string;
}

export interface Location {
  id: string;
  parkId?: string;
  landId?: string;
  attractionId?: string;
  resortId?: string;
  title: string;
  hint: string;
  story: string;
  difficulty: number; // 1-5
  latitude: number;
  longitude: number;
}

export interface Found {
  locationId: string;
  foundAt: number;
}
