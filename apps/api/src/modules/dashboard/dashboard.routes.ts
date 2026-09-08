import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAdmin } from '../../middleware/auth.js';

export const dashboardAdminRouter = Router();
dashboardAdminRouter.use(requireAdmin);

dashboardAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [
      posts,
      publishedPosts,
      gallery,
      media,
      quizQuestions,
      quizScores,
      members,
      robots,
      awards,
      agenda,
      pendingTopics,
      pendingReplies,
      approvedTopics,
      sponsors,
      seasons,
      contactNew,
      forumReports,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { published: true } }),
      prisma.galleryPhoto.count(),
      prisma.mediaAsset.count(),
      prisma.quizQuestion.count(),
      prisma.quizScore.count(),
      prisma.encyclopediaEntry.count({ where: { kind: 'member' } }),
      prisma.encyclopediaEntry.count({ where: { kind: 'robot' } }),
      prisma.award.count(),
      prisma.agendaEvent.count(),
      prisma.forumTopic.count({ where: { status: 'pending' } }),
      prisma.forumReply.count({ where: { status: 'pending' } }),
      prisma.forumTopic.count({ where: { status: 'approved' } }),
      prisma.sponsor.count(),
      prisma.season.count(),
      prisma.contactMessage.count({ where: { status: 'new' } }),
      prisma.forumReport.count({ where: { status: 'open' } }),
    ]);

    res.json({
      posts: { total: posts, published: publishedPosts },
      gallery,
      media,
      quiz: { questions: quizQuestions, scores: quizScores },
      encyclopedia: { members, robots },
      awards,
      agenda,
      forum: {
        pending: pendingTopics + pendingReplies,
        pendingTopics,
        pendingReplies,
        approvedTopics,
        reports: forumReports,
      },
      sponsors,
      seasons,
      contact: { new: contactNew },
    });
  }),
);
