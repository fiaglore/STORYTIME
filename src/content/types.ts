export interface ChapterEndingMeta {
  id: string;
  title: string;
  bookCanon: boolean;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  protagonist: string;
  location: string;
  storyTime: string;
  color: string;
  contentNote: string;
  inkFile: string;
  free: boolean;
  endings: ChapterEndingMeta[];
}
