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
      quizQuestions,
      quizScores,
      members,
      robots,
      awards,
      agenda,
      pendingTopics,
      pendingReplies,
      approvedTopics,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { published: true } }),
      prisma.galleryPhoto.count(),
      prisma.quizQuestion.count(),
      prisma.quizScore.count(),
      prisma.encyclopediaEntry.count({ where: { kind: 'member' } }),
      prisma.encyclopediaEntry.count({ where: { kind: 'robot' } }),
      prisma.award.count(),
      prisma.agendaEvent.count(),
      prisma.forumTopic.count({ where: { status: 'pending' } }),
      prisma.forumReply.count({ where: { status: 'pending' } }),
      prisma.forumTopic.count({ where: { status: 'approved' } }),
    ]);

    res.json({
      posts: { total: posts, published: publishedPosts },
      gallery,
      quiz: { questions: quizQuestions, scores: quizScores },
      encyclopedia: { members, robots },
      awards,
      agenda,
      forum: {
        pending: pendingTopics + pendingReplies,
        pendingTopics,
        pendingReplies,
        approvedTopics,
      },
    });
  }),
);
