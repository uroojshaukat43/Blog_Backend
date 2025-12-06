import express from 'express';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Create comment (authenticated users only)
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, postId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: 'Content and post ID are required' });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      content,
      post: postId,
      author: req.user._id,
      authorName: req.user.username
    });

    await comment.save();
    await comment.populate('author', 'username');
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Update comment (own comment only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    comment.content = content;
    await comment.save();
    await comment.populate('author', 'username');
    
    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete comment (own comment or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment or is admin
    const isOwner = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

export default router;


