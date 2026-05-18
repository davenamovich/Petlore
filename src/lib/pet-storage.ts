// ─── Pet Storage — localStorage helpers ──────────────────────────────────────
// All data is per-browser. No server sync yet.

export type SavedPhoto = {
  id: string;
  petName: string;
  style: string;
  styleLabel: string;
  url: string; // base64 data URL
  timestamp: number;
  profile: Record<string, unknown> | null;
};

export type PetCharacter = {
  name: string;
  species: string;
  breed: string;
  personality: string;
  flaw: string;        // the main character flaw that drives every episode
  catchphrase: string;
  photoUrl: string | null;
  furColors: string[];
  eyeColor: string;
  markings: string;
};

export type EpisodeScene = {
  n: number;
  dur: number;
  setting: string;
  action: string;
  dialogue: string;
  gag: string;
  cam: string;
};

export type Episode = {
  episode: number;
  title: string;
  premise: string;
  scenes: EpisodeScene[];
  cliffhanger: string;
  socialCaption: string;
  nextEpisodeTeaser: string;
  videoPrompts: { main: string; thumbnail: string };
  createdAt: number;
};

// ─── Keys ────────────────────────────────────────────────────────────────────

const GALLERY_KEY  = 'pvpa_gallery';
const PET_CHAR_KEY = 'pae_pet_character';
const EPISODES_KEY = 'pae_episodes';
const MAX_PHOTOS   = 3; // localStorage limit safeguard

// ─── Gallery ─────────────────────────────────────────────────────────────────

export function loadGallery(): SavedPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePhoto(photo: Omit<SavedPhoto, 'id' | 'timestamp'>): SavedPhoto {
  const saved: SavedPhoto = {
    ...photo,
    id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  let gallery = loadGallery();
  gallery.unshift(saved); // newest first
  if (gallery.length > MAX_PHOTOS) gallery = gallery.slice(0, MAX_PHOTOS);

  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
  } catch {
    // Storage full — drop oldest and retry
    gallery = gallery.slice(0, 1);
    try { localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery)); } catch { /* silent */ }
  }

  return saved;
}

export function deletePhoto(id: string): void {
  const gallery = loadGallery().filter(p => p.id !== id);
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
}

// ─── Pet character ────────────────────────────────────────────────────────────

export function loadPetCharacter(): PetCharacter | null {
  try {
    const raw = localStorage.getItem(PET_CHAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePetCharacter(char: PetCharacter): void {
  localStorage.setItem(PET_CHAR_KEY, JSON.stringify(char));
}

export function clearPetCharacter(): void {
  localStorage.removeItem(PET_CHAR_KEY);
}

// ─── Episodes ─────────────────────────────────────────────────────────────────

export function loadEpisodes(): Episode[] {
  try {
    return JSON.parse(localStorage.getItem(EPISODES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveEpisode(episode: Episode): void {
  const episodes = loadEpisodes();
  const idx = episodes.findIndex(e => e.episode === episode.episode);
  if (idx >= 0) {
    episodes[idx] = episode;
  } else {
    episodes.push(episode);
  }
  episodes.sort((a, b) => a.episode - b.episode);
  localStorage.setItem(EPISODES_KEY, JSON.stringify(episodes));
}

export function clearEpisodes(): void {
  localStorage.removeItem(EPISODES_KEY);
}
