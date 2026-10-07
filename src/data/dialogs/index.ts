/**
 * Dialogue scripts (design.md §2). Short English exchanges, 2–4 boxes per
 * encounter, text-only, advanced manually, never under attack.
 */
export type SpeakerStyle = 'pip' | 'veyr' | 'other';

export interface DialogueLine {
  speaker: string;
  style: SpeakerStyle;
  text: string;
}

export interface DialogueScript {
  id: string;
  lines: DialogueLine[];
}

const pip = (text: string): DialogueLine => ({ speaker: 'Pip', style: 'pip', text });
const veyr = (text: string): DialogueLine => ({ speaker: 'Veyr', style: 'veyr', text });
const other = (speaker: string, text: string): DialogueLine => ({ speaker, style: 'other', text });

export const DIALOGUES: Record<string, DialogueScript> = {
  stage1_open: {
    id: 'stage1_open',
    lines: [
      pip('You have the same mark as the door.'),
      veyr('Then leave both of us alone.'),
      pip('Can you open it?'),
      veyr('Not for a hero.'),
      pip("Good. I repair gutters. And I'm looking for my sister."),
    ],
  },
  stage1_preboss: {
    id: 'stage1_preboss',
    lines: [
      veyr('The caretaker is ahead. It remembers me.'),
      pip('You know it?'),
      veyr('It counted me as property once. Try not to swing me around like a flag.'),
    ],
  },
  stage1_bossdown: {
    id: 'stage1_bossdown',
    lines: [
      other('Bronze Caretaker', 'Stolen... property. The monument... weeps.'),
      veyr('It was always dramatic.'),
      pip('The road key is mine now. Someone left fresh bootprints past the mill.'),
      veyr('Do not call this a quest.'),
    ],
  },
  stage1_exit: {
    id: 'stage1_exit',
    lines: [
      veyr('One door opened. Nine guardians left.'),
      pip("One road closer to Mara. Let's go."),
    ],
  },
  /** Generic strings used outside combat dialogue (design.md §10). */
};

export function getDialogue(id: string): DialogueScript | undefined {
  return DIALOGUES[id];
}
