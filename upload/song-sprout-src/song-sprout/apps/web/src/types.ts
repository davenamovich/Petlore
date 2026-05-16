export interface Song {
  id: string;
  title: string;
  style?: string;
  coverUrl?: string;
  duration?: string;
  createdAt: Date;
  isGenerating?: boolean;
  audioUrl?: string;
  tags?: string[];
  isPublic?: boolean;
  likeCount?: number;
  viewCount?: number;
  userId?: string;
}
