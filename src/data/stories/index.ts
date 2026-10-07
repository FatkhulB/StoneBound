export interface StoryData {
  id: number;
  title: string;
  subtitle: string;
  playable: boolean;
}

/**
 * Future story titles are working placeholders (design.md §16) — they must show as
 * non-playable "Coming Soon" cards and promise no release date.
 */
export const STORIES: StoryData[] = [
  {
    id: 1,
    title: 'The Sword That Hated Heroes',
    subtitle: 'Story 1: The Buried Road',
    playable: true,
  },
  { id: 2, title: 'Story 2', subtitle: 'A sealed network stirs beneath the harbor', playable: false },
  { id: 3, title: 'Story 3', subtitle: 'The furnaces were never allowed to cool', playable: false },
];
