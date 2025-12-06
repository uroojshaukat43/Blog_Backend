import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all posts (full info for authenticated users, limited for public)
router.get('/', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const isAuthenticated = !!token;

    const posts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    // Return full info for authenticated users, limited for public
    const postsData = posts.map(post => {
      if (isAuthenticated) {
        return {
          _id: post._id,
          title: post.title,
          content: post.content,
          image: post.image,
          author: post.author,
          authorName: post.authorName,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        };
      } else {
        return {
          _id: post._id,
          title: post.title,
          content: post.content.substring(0, 150) + '...', // First 150 chars
          image: post.image,
          authorName: post.authorName,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        };
      }
    });

    res.json(postsData);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// Get single post by ID (authenticated users only)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// Create post (authenticated users can create their own posts)
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : '';

    const post = new Post({
      title,
      content,
      image,
      author: req.user._id,
      authorName: req.user.username
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Update post (users can update their own posts, admins can update any)
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is admin or the post owner
    const isOwner = post.author.toString() === req.user._id.toString();
    const isUserAdmin = req.user.role === 'admin';

    if (!isOwner && !isUserAdmin) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (req.file) {
      post.image = `/uploads/${req.file.filename}`;
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error updating post' });
  }
});

// Delete post (users can delete their own posts, admins can delete any)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is admin or the post owner
    const isOwner = post.author.toString() === req.user._id.toString();
    const isUserAdmin = req.user.role === 'admin';

    if (!isOwner && !isUserAdmin) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

export default router;


