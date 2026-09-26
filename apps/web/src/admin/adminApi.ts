import type {
  ContentBlockDTO,
  ContentBlockInput,
  TimelineItemDTO,
  TimelineItemInput,
  PostListItemDTO,
  PostDetailDTO,
  PostInput,
  GalleryPhotoDTO,
  GalleryPhotoInput,
  QuizQuestionInput,
  EncyclopediaEntryDTO,
  EncyclopediaEntryInput,
  MemberTagDTO,
  MemberTagInput,
  ForumTopicDTO,
  AwardDTO,
  AwardInput,
  AgendaEventDTO,
  AgendaEventInput,
  SocialLinkDTO,
  SocialLinkInput,
  MediaAssetDTO,
  MediaLibraryItemDTO,
  MediaUsageDTO,
  MediaQuery,
  UpdateMediaInput,
  Paginated,
  SettingDTO,
  SettingsBulkInput,
  ChangePasswordInput,
  AdminUserDTO,
  AdminUserInput,
  AdminUserCreateInput,
  SponsorDTO,
  SponsorInput,
  ContactMessageDTO,
  ContactQuery,
  ContactStatusInput,
  SeasonDTO,
  SeasonInput,
  ForumReportDTO,
  ForumReportStatusInput,
} from '@minerskills/shared';
import { api } from '../lib/api';

export interface DashboardStats {
  posts: { total: number; published: number };
  gallery: number;
  media: number;
  quiz: { questions: number; scores: number };
  encyclopedia: { members: number; robots: number };
  awards: number;
  agenda: number;
  forum: {
    pending: number;
    pendingTopics: number;
    pendingReplies: number;
    approvedTopics: number;
    /** Denúncias abertas. */
    reports: number;
  };
  sponsors: number;
  seasons: number;
  contact: { new: number };
}

export interface AdminQuizQuestion {
  id: string;
  question: string;
  explanation: string | null;
  active: boolean;
  order: number;
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
}

export interface ModerationReply {
  id: string;
  nickname: string;
  body: string;
  status: string;
  createdAt: string;
  topicId: string;
  topicTitle: string;
}

export interface ModerationQueue {
  topics: ForumTopicDTO[];
  replies: ModerationReply[];
}

export const adminApi = {
  dashboard: () => api.get<DashboardStats>('/admin/dashboard'),

  media: {
    /** Biblioteca paginada, com contagem de usos por item. */
    list: (query?: Partial<MediaQuery>) =>
      api.get<Paginated<MediaLibraryItemDTO>>('/admin/media', query),
    upload: (file: File, alt?: string) =>
      api.upload<MediaAssetDTO>('/admin/media', file, alt ? { alt } : undefined),
    usage: (id: string) => api.get<MediaUsageDTO>(`/admin/media/${id}/usage`),
    update: (id: string, data: UpdateMediaInput) =>
      api.patch<MediaAssetDTO>(`/admin/media/${id}`, data),
    /** Sem `force`, a API responde 409 quando a mídia está em uso. */
    remove: (id: string, force = false) =>
      api.del(`/admin/media/${id}${force ? '?force=1' : ''}`),
  },

  contentBlocks: {
    list: (page?: string) =>
      api.get<ContentBlockDTO[]>('/admin/content-blocks', page ? { page } : undefined),
    create: (data: ContentBlockInput) =>
      api.post<ContentBlockDTO>('/admin/content-blocks', data),
    update: (id: string, data: ContentBlockInput) =>
      api.put<ContentBlockDTO>(`/admin/content-blocks/${id}`, data),
    remove: (id: string) => api.del(`/admin/content-blocks/${id}`),
  },

  timeline: {
    list: () => api.get<TimelineItemDTO[]>('/admin/timeline'),
    create: (data: TimelineItemInput) =>
      api.post<TimelineItemDTO>('/admin/timeline', data),
    update: (id: string, data: TimelineItemInput) =>
      api.put<TimelineItemDTO>(`/admin/timeline/${id}`, data),
    remove: (id: string) => api.del(`/admin/timeline/${id}`),
  },

  posts: {
    list: () => api.get<PostListItemDTO[]>('/admin/posts'),
    get: (id: string) => api.get<PostDetailDTO>(`/admin/posts/${id}`),
    create: (data: PostInput) => api.post<PostDetailDTO>('/admin/posts', data),
    update: (id: string, data: PostInput) =>
      api.put<PostDetailDTO>(`/admin/posts/${id}`, data),
    remove: (id: string) => api.del(`/admin/posts/${id}`),
  },

  gallery: {
    list: () => api.get<GalleryPhotoDTO[]>('/gallery'),
    create: (data: GalleryPhotoInput) =>
      api.post<GalleryPhotoDTO>('/admin/gallery', data),
    update: (id: string, data: GalleryPhotoInput) =>
      api.put<GalleryPhotoDTO>(`/admin/gallery/${id}`, data),
    reorder: (ids: string[]) => api.put<void>('/admin/gallery/reorder', { ids }),
    remove: (id: string) => api.del(`/admin/gallery/${id}`),
  },

  quiz: {
    list: () => api.get<AdminQuizQuestion[]>('/admin/quiz/questions'),
    create: (data: QuizQuestionInput) =>
      api.post<AdminQuizQuestion>('/admin/quiz/questions', data),
    update: (id: string, data: QuizQuestionInput) =>
      api.put<AdminQuizQuestion>(`/admin/quiz/questions/${id}`, data),
    remove: (id: string) => api.del(`/admin/quiz/questions/${id}`),
    resetLeaderboard: () => api.del('/admin/quiz/leaderboard'),
  },

  encyclopedia: {
    list: () => api.get<EncyclopediaEntryDTO[]>('/admin/encyclopedia'),
    create: (data: EncyclopediaEntryInput) =>
      api.post<EncyclopediaEntryDTO>('/admin/encyclopedia', data),
    update: (id: string, data: EncyclopediaEntryInput) =>
      api.put<EncyclopediaEntryDTO>(`/admin/encyclopedia/${id}`, data),
    remove: (id: string) => api.del(`/admin/encyclopedia/${id}`),
  },

  memberTags: {
    list: () => api.get<MemberTagDTO[]>('/admin/member-tags'),
    create: (data: MemberTagInput) => api.post<MemberTagDTO>('/admin/member-tags', data),
    update: (id: string, data: MemberTagInput) =>
      api.put<MemberTagDTO>(`/admin/member-tags/${id}`, data),
    remove: (id: string) => api.del(`/admin/member-tags/${id}`),
  },

  forum: {
    moderation: () => api.get<ModerationQueue>('/admin/forum/moderation'),
    allTopics: () => api.get<ForumTopicDTO[]>('/admin/forum/topics'),
    setTopic: (id: string, status: string) =>
      api.patch(`/admin/forum/topics/${id}`, { status }),
    setReply: (id: string, status: string) =>
      api.patch(`/admin/forum/replies/${id}`, { status }),
    removeTopic: (id: string) => api.del(`/admin/forum/topics/${id}`),
    removeReply: (id: string) => api.del(`/admin/forum/replies/${id}`),
    reports: (status: 'open' | 'resolved' | 'all' = 'open') =>
      api.get<ForumReportDTO[]>(
        '/admin/forum/reports',
        status === 'all' ? undefined : { status },
      ),
    setReport: (id: string, data: ForumReportStatusInput) =>
      api.patch<ForumReportDTO>(`/admin/forum/reports/${id}`, data),
  },

  awards: {
    list: () => api.get<AwardDTO[]>('/awards'),
    create: (data: AwardInput) => api.post<AwardDTO>('/admin/awards', data),
    update: (id: string, data: AwardInput) =>
      api.put<AwardDTO>(`/admin/awards/${id}`, data),
    remove: (id: string) => api.del(`/admin/awards/${id}`),
  },

  agenda: {
    list: () => api.get<AgendaEventDTO[]>('/admin/agenda'),
    create: (data: AgendaEventInput) => api.post<AgendaEventDTO>('/admin/agenda', data),
    update: (id: string, data: AgendaEventInput) =>
      api.put<AgendaEventDTO>(`/admin/agenda/${id}`, data),
    remove: (id: string) => api.del(`/admin/agenda/${id}`),
  },

  social: {
    list: () => api.get<SocialLinkDTO[]>('/admin/social-links'),
    create: (data: SocialLinkInput) =>
      api.post<SocialLinkDTO>('/admin/social-links', data),
    update: (id: string, data: SocialLinkInput) =>
      api.put<SocialLinkDTO>(`/admin/social-links/${id}`, data),
    remove: (id: string) => api.del(`/admin/social-links/${id}`),
  },

  settings: {
    list: () => api.get<SettingDTO[]>('/admin/settings'),
    saveAll: (items: SettingsBulkInput) =>
      api.put<SettingDTO[]>('/admin/settings/bulk', items),
  },

  auth: {
    changePassword: (data: ChangePasswordInput) =>
      api.put<void>('/admin/auth/password', data),
  },

  sponsors: {
    list: () => api.get<SponsorDTO[]>('/admin/sponsors'),
    create: (data: SponsorInput) => api.post<SponsorDTO>('/admin/sponsors', data),
    update: (id: string, data: SponsorInput) =>
      api.put<SponsorDTO>(`/admin/sponsors/${id}`, data),
    reorder: (ids: string[]) => api.put<void>('/admin/sponsors/reorder', { ids }),
    remove: (id: string) => api.del(`/admin/sponsors/${id}`),
  },

  contact: {
    list: (query?: Partial<ContactQuery>) =>
      api.get<Paginated<ContactMessageDTO>>('/admin/contact', query),
    setStatus: (id: string, data: ContactStatusInput) =>
      api.patch<ContactMessageDTO>(`/admin/contact/${id}`, data),
    remove: (id: string) => api.del(`/admin/contact/${id}`),
  },

  seasons: {
    list: () => api.get<SeasonDTO[]>('/admin/seasons'),
    create: (data: SeasonInput) => api.post<SeasonDTO>('/admin/seasons', data),
    update: (id: string, data: SeasonInput) =>
      api.put<SeasonDTO>(`/admin/seasons/${id}`, data),
    remove: (id: string) => api.del(`/admin/seasons/${id}`),
  },

  admins: {
    list: () => api.get<AdminUserDTO[]>('/admin/admins'),
    create: (data: AdminUserCreateInput) => api.post<AdminUserDTO>('/admin/admins', data),
    update: (id: string, data: AdminUserInput) =>
      api.put<AdminUserDTO>(`/admin/admins/${id}`, data),
    remove: (id: string) => api.del(`/admin/admins/${id}`),
  },
};
